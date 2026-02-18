import { useState, useEffect, useRef, useCallback } from "react";
import * as mediasoupClient from "mediasoup-client";
import { io } from "socket.io-client";
import {
  IoCallOutline,
  IoMicOutline,
  IoMicOffOutline,
  IoCloseOutline,
  IoRemoveOutline,
  IoVideocamOutline,
  IoVideocamOffOutline,
} from "react-icons/io5";
import { formatCallDuration, isWebRTCSupported } from "../../utils/callService";
import { getAuthToken } from "../../utils/apiClient";
import { useCall } from "../../contexts/CallContext";
import { getSocket } from "../../utils/socketClient";
import P2PCallManager from "../../utils/p2pCallManager";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";
const SOCKET_URL = API_BASE_URL.replace("/api", "").replace(/\/$/, "");

const CallPopup = () => {
  const { activeCall, endCall, isMinimized, minimize, maximize, callType } = useCall();
  const callId = activeCall?.callId;
  const isVideoCall = callType === 'video';

  const [status, setStatus] = useState("connecting"); // connecting, connected, ended, error
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState(null);
  const [remoteParticipant, setRemoteParticipant] = useState(
    activeCall?.remoteParticipant || "Participant"
  );
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnosticLogs, setDiagnosticLogs] = useState([]);
  const [mediaStreams, setMediaStreams] = useState({ local: null, remote: null }); // Track streams reliably
  const [useP2P, setUseP2P] = useState(true); // P2P enabled by default (SFU has issues)
  const p2pManagerRef = useRef(null);
  const roomJoinedRef = useRef(false); // Track if we successfully joined the call room
  const hasAttemptedFallbackRef = useRef(false); // Track if we've already attempted SFU fallback
  const isSwitchingToSFURef = useRef(false); // Track if we're currently switching to SFU
  const p2pConnectionTimeoutRef = useRef(null); // Track P2P connection timeout

  // Refs
  const socketRef = useRef(null);
  const deviceRef = useRef(null);
  const sendTransportRef = useRef(null);
  const recvTransportRef = useRef(null);
  const producerRef = useRef(null);
  const consumerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const durationIntervalRef = useRef(null);
  const isEndingRef = useRef(false); // Prevent duplicate call end
  const callIdRef = useRef(callId); // Store callId in ref to avoid stale closures

  // Effect to continuously ensure streams are attached to elements
  useEffect(() => {
    // 1. Attach Remote Audio (Always)
    if (mediaStreams.remote && remoteAudioRef.current) {
      if (remoteAudioRef.current.srcObject !== mediaStreams.remote) {
        console.log("🎥 [StreamEffect] Attaching remote audio stream");
        remoteAudioRef.current.srcObject = mediaStreams.remote;
        remoteAudioRef.current.play().catch(e => console.warn("Audio auto-play prevented:", e));
      }
    }

    // 2. Attach Remote Video (If Video Call)
    if (isVideoCall && mediaStreams.remote && remoteVideoRef.current) {
      if (remoteVideoRef.current.srcObject !== mediaStreams.remote) {
        console.log("🎥 [StreamEffect] Attaching remote video stream");
        remoteVideoRef.current.srcObject = mediaStreams.remote;
        remoteVideoRef.current.play().catch(e => console.warn("Remote Video auto-play prevented:", e));
      }
    }

    // 3. Attach Local Video (If Video Call)
    if (isVideoCall && mediaStreams.local && localVideoRef.current) {
      if (localVideoRef.current.srcObject !== mediaStreams.local) {
        console.log("🎥 [StreamEffect] Attaching local video stream");
        localVideoRef.current.srcObject = mediaStreams.local;
        localVideoRef.current.play().catch(e => console.warn("Local Video auto-play prevented:", e));
      }
    }
  }, [mediaStreams, isVideoCall, status]); // Re-run when streams, mode or status changes

  // Determine module from token
  const getModule = () => {
    const token = getAuthToken("doctor") || getAuthToken("patient");
    if (getAuthToken("doctor")) return "doctor";
    if (getAuthToken("patient")) return "patient";
    return "patient"; // default
  };

  // Store activeCall in ref to avoid stale closures
  const activeCallRef = useRef(activeCall);

  // Update activeCall ref when it changes
  useEffect(() => {
    activeCallRef.current = activeCall;
  }, [activeCall]);

  // Unified handler for call:ended events from any socket
  const handleCallEndedUnified = useCallback(
    (data) => {
      const currentCallId = callIdRef.current;
      const currentActiveCall = activeCallRef.current;

      console.log("📞 [CallPopup] ====== call:ended EVENT RECEIVED ======");
      console.log("📞 [CallPopup] Event data:", data);
      console.log("📞 [CallPopup] Current callId (from ref):", currentCallId);
      console.log(
        "📞 [CallPopup] Current activeCall (from ref):",
        currentActiveCall
      );
      console.log("📞 [CallPopup] isEndingRef.current:", isEndingRef.current);

      // Prevent duplicate processing
      if (isEndingRef.current) {
        console.log(
          "📞 [CallPopup] Call already ending, ignoring duplicate call:ended event"
        );
        return;
      }

      // Process if:
      // 1. CallId matches exactly, OR
      // 2. We have an activeCall (fallback - process even if callId doesn't match)
      const callIdMatches =
        data && data.callId && data.callId === currentCallId;
      const hasActiveCall = currentActiveCall && currentActiveCall.callId;

      if (!callIdMatches && !hasActiveCall) {
        console.log(
          "📞 [CallPopup] Ignoring call:ended - no callId match and no active call"
        );
        return;
      }

      if (!callIdMatches && hasActiveCall) {
        console.warn(
          "📞 [CallPopup] call:ended event callId mismatch, but processing anyway because we have activeCall"
        );
        console.warn(
          "📞 [CallPopup] Expected:",
          currentCallId,
          "Received:",
          data?.callId
        );
      }

      console.log(
        "📞 [CallPopup] ✅ Processing call:ended event - ending call"
      );
      isEndingRef.current = true;

      // End the call (don't emit to server as it's already ended by other party)
      cleanup();
      setStatus("ended");
      setTimeout(() => {
        console.log("📞 [CallPopup] Closing call UI from call:ended event");
        endCall();
        isEndingRef.current = false;
      }, 500);
    },
    [endCall]
  );

  // Unified handler for call:patientJoined events - resend offer
  const handlePatientJoinedUnified = useCallback(
    async (data) => {
      console.log(
        "📞 [CallPopup] ====== call:patientJoined EVENT RECEIVED (Unified) ======"
      );
      console.log("📞 [CallPopup] Event data:", data);

      if (data.callId && data.callId !== callIdRef.current) {
        console.log("📞 [CallPopup] Ignoring patient joined - callId mismatch");
        return;
      }

      // Only Initiator (Doctor) needs to resend offer
      const module = getModule();

      // Check if we are using P2P and manager exists
      if (module === "doctor" && useP2P && p2pManagerRef.current) {
        console.log(
          "📞 [CallPopup] Patient joined, resending P2P offer to ensure connection..."
        );
        try {
          // Add a small delay to ensure patient is fully ready to receive
          setTimeout(async () => {
            try {
              if (p2pManagerRef.current) {
                console.log(
                  "📞 [CallPopup] Creating/Resending Offer with ICE Restart..."
                );
                await p2pManagerRef.current.createOffer({ iceRestart: true });
              }
            } catch (err) {
              console.error("📞 [CallPopup] Error resending offer:", err);
            }
          }, 1500);
        } catch (error) {
          console.error("📞 [CallPopup] Error triggering offer resend:", error);
        }
      }
    },
    [useP2P]
  );

  useEffect(() => {
    if (!callId) {
      return; // Don't initialize if no call
    }

    if (!isWebRTCSupported()) {
      setError("WebRTC is not supported in this browser");
      setStatus("error");
      return;
    }

    // Reset state when callId changes
    setStatus("connecting");
    setError(null);
    setCallDuration(0);
    setIsMuted(false);
    isEndingRef.current = false; // Reset ending flag for new call
    isSwitchingToSFURef.current = false; // Reset switching flag
    hasAttemptedFallbackRef.current = false; // Reset fallback flag
    callIdRef.current = callId; // Update ref with current callId

    // Set up call:ended listener on shared socket immediately (before socket connects)
    // This ensures we receive the event even if CallPopup creates a new socket
    const sharedSocket = getSocket();
    let sharedSocketCleanup = null;

    if (sharedSocket) {
      console.log(
        "📞 [CallPopup] Setting up call:ended listener on shared socket"
      );
      console.log(
        "📞 [CallPopup] Shared socket connected:",
        sharedSocket.connected
      );

      // Use the unified handler
      sharedSocket.on("call:ended", handleCallEndedUnified);

      sharedSocketCleanup = () => {
        sharedSocket.off("call:ended", handleCallEndedUnified);
      };
    }

    // Also listen for window-level force end event as fallback
    const handleForceEnd = () => {
      console.log("📞 [CallPopup] Received call:forceEnd window event");
      if (!isEndingRef.current && callIdRef.current) {
        console.log("📞 [CallPopup] Processing force end event");
        isEndingRef.current = true;
        cleanup();
        setStatus("ended");
        setTimeout(() => {
          endCall();
          isEndingRef.current = false;
        }, 500);
      }
    };

    window.addEventListener("call:forceEnd", handleForceEnd);

    initializeCall();

    return () => {
      // Don't cleanup if we're switching to SFU (cleanup will happen after switch completes)
      if (!isSwitchingToSFURef.current) {
        cleanup();
      } else {
        console.log("📞 [CallPopup] Skipping cleanup during SFU switch");
      }
      if (sharedSocketCleanup) {
        sharedSocketCleanup();
      }
      window.removeEventListener("call:forceEnd", handleForceEnd);
    };
  }, [callId, handleCallEndedUnified, endCall, handlePatientJoinedUnified]);

  // Update remoteParticipant when activeCall changes
  useEffect(() => {
    if (activeCall?.remoteParticipant) {
      setRemoteParticipant(activeCall.remoteParticipant);
    }
  }, [activeCall?.remoteParticipant]);

  // Continuously monitor transport states when connected (SFU mode)
  useEffect(() => {
    if (status !== "connected" || useP2P) {
      return; // Only monitor in SFU mode when connected
    }

    const sendTransport = sendTransportRef.current;
    const recvTransport = recvTransportRef.current;

    if (!sendTransport || !recvTransport) {
      return; // Transports not initialized yet
    }

    console.log("📞 [CallPopup] Starting transport state monitoring...");

    // Check transport states periodically
    const checkInterval = setInterval(() => {
      const sendState = sendTransport.connectionState;
      const recvState = recvTransport.connectionState;
      const sendClosed = sendTransport.closed;
      const recvClosed = recvTransport.closed;

      // If transports are closed or failed, update status
      if (
        sendClosed ||
        recvClosed ||
        sendState === "failed" ||
        recvState === "failed"
      ) {
        console.error(
          "📞 [CallPopup] ⚠️ Transport monitoring detected failure:",
          {
            sendState,
            recvState,
            sendClosed,
            recvClosed,
          }
        );
        setError(
          "Connection lost. The transports have failed. Please try ending and restarting the call."
        );
        setStatus("error");
        clearInterval(checkInterval);
      } else if (
        sendState === "connected" &&
        recvState === "connected" &&
        !sendClosed &&
        !recvClosed
      ) {
        // Transports are healthy - ensure status is connected
        if (status !== "connected") {
          console.log(
            "📞 [CallPopup] Transports healthy, ensuring status is connected"
          );
          setStatus("connected");
        }
      }
    }, 3000); // Check every 3 seconds

    return () => {
      clearInterval(checkInterval);
    };
  }, [status, useP2P]);

  // Keep audio and microphone active when minimized
  useEffect(() => {
    if (!isMinimized || status !== "connected") {
      return;
    }

    console.log(
      "📞 [CallPopup] Minimized - ensuring audio and microphone stay active"
    );

    const keepAudioActive = () => {
      // Keep remote audio playing
      const audioElement = remoteAudioRef.current;
      if (audioElement && audioElement.srcObject && audioElement.paused) {
        console.log("📞 [CallPopup] Resuming paused audio element");
        audioElement.play().catch((err) => {
          console.error("📞 [CallPopup] Error resuming audio:", err);
        });
      }

      // Keep local microphone enabled (P2P)
      if (p2pManagerRef.current && p2pManagerRef.current.localStream) {
        p2pManagerRef.current.localStream.getAudioTracks().forEach((track) => {
          if (!track.enabled) {
            console.log("📞 [CallPopup] Re-enabling local audio track");
            track.enabled = true;
          }
        });
      }

      // Keep local microphone enabled (SFU)
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          if (!track.enabled) {
            console.log("📞 [CallPopup] Re-enabling local audio track (SFU)");
            track.enabled = true;
          }
        });
      }

      // Keep producer track enabled (SFU)
      if (producerRef.current && producerRef.current.track) {
        if (!producerRef.current.track.enabled) {
          console.log("📞 [CallPopup] Re-enabling producer track");
          producerRef.current.track.enabled = true;
        }
      }
    };

    // Check immediately
    keepAudioActive();

    // Set up interval to periodically check and resume if needed
    const interval = setInterval(keepAudioActive, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isMinimized, status]);

  // Function to switch from P2P to SFU when P2P fails
  const switchToSFU = async () => {
    if (isSwitchingToSFURef.current) {
      console.log(
        "🔄 [Fallback] Already switching to SFU, ignoring duplicate call"
      );
      return;
    }

    isSwitchingToSFURef.current = true;
    console.log("🔄 [Fallback] ====== SWITCHING TO SFU ======");

    try {
      const socket = socketRef.current;
      const currentCallId = callIdRef.current;

      if (!socket || !currentCallId) {
        console.error(
          "🔄 [Fallback] Missing socket or callId, cannot switch to SFU"
        );
        setError("Failed to switch to SFU. Please try again.");
        setStatus("error");
        isSwitchingToSFURef.current = false;
        return;
      }

      // Reset ending flag before switching
      isEndingRef.current = false;

      // Clean up P2P connection (but don't call full cleanup() as it disconnects socket)
      if (p2pManagerRef.current) {
        console.log("🔄 [Fallback] Cleaning up P2P connection...");
        try {
          p2pManagerRef.current.cleanup();
        } catch (error) {
          console.warn("🔄 [Fallback] Error cleaning up P2P:", error);
        }
        p2pManagerRef.current = null;
      }

      // Remove P2P event handlers
      if (socket._p2pHandlers) {
        console.log("🔄 [Fallback] Removing P2P event handlers...");
        socket.off("p2p:offer", socket._p2pHandlers.offer);
        socket.off("p2p:answer", socket._p2pHandlers.answer);
        socket.off("p2p:iceCandidate", socket._p2pHandlers.iceCandidate);
        delete socket._p2pHandlers;
      }

      // Clear P2P connection timeout
      if (p2pConnectionTimeoutRef.current) {
        clearTimeout(p2pConnectionTimeoutRef.current);
        p2pConnectionTimeoutRef.current = null;
      }

      // Update state to use SFU
      setUseP2P(false);
      setStatus("connecting");
      setError(null);

      console.log("🔄 [Fallback] Starting SFU connection...");

      // Call the SFU initialization code
      await initializeSFU(socket, currentCallId);

      console.log("🔄 [Fallback] ✅ Successfully switched to SFU");
    } catch (error) {
      console.error("🔄 [Fallback] ❌ Error switching to SFU:", error);
      setError("Failed to switch to SFU. Please try again.");
      setStatus("error");
      isEndingRef.current = false; // Reset on error
    } finally {
      isSwitchingToSFURef.current = false;
    }
  };

  // Extract SFU initialization logic into a separate function
  const initializeSFU = async (socket, currentCallId) => {
    try {
      console.log("📞 [SFU] Initializing SFU connection...");

      // Get RTP capabilities
      const { rtpCapabilities, iceServers } = await new Promise(
        (resolve, reject) => {
          socket.emit(
            "mediasoup:getRtpCapabilities",
            { callId: currentCallId },
            (response) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            }
          );
        }
      );

      // Create device
      const device = new mediasoupClient.Device();
      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;

      // Create send transport
      const sendTransportData = await new Promise((resolve, reject) => {
        socket.emit(
          "mediasoup:createWebRtcTransport",
          { callId: currentCallId },
          (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.transport);
            }
          }
        );
      });

      const sendTransport = device.createSendTransport({
        id: sendTransportData.id,
        iceParameters: sendTransportData.iceParameters,
        iceCandidates: sendTransportData.iceCandidates,
        dtlsParameters: sendTransportData.dtlsParameters,
        iceServers,
      });

      sendTransportRef.current = sendTransport;

      // Handle send transport events
      sendTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit(
              "mediasoup:connectTransport",
              {
                callId: currentCallId,
                transportId: sendTransport.id,
                dtlsParameters,
              },
              (response) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback();
                }
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      sendTransport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            socket.emit(
              "mediasoup:produce",
              {
                callId: currentCallId,
                transportId: sendTransport.id,
                kind,
                rtpParameters,
              },
              (response) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback({ id: response.producerId });
                }
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      // Get user media and produce
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      localStreamRef.current = stream;

      const track = stream.getAudioTracks()[0];
      const producer = await sendTransport.produce({ track });
      producerRef.current = producer;

      // Create receive transport
      const recvTransportData = await new Promise((resolve, reject) => {
        socket.emit(
          "mediasoup:createWebRtcTransport",
          { callId: currentCallId },
          (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.transport);
            }
          }
        );
      });

      const recvTransport = device.createRecvTransport({
        id: recvTransportData.id,
        iceParameters: recvTransportData.iceParameters,
        iceCandidates: recvTransportData.iceCandidates,
        dtlsParameters: recvTransportData.dtlsParameters,
        iceServers,
      });

      recvTransportRef.current = recvTransport;

      recvTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          try {
            socket.emit(
              "mediasoup:connectTransport",
              {
                callId: currentCallId,
                transportId: recvTransport.id,
                dtlsParameters,
              },
              (response) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback();
                }
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      // Get existing producers and consume them
      const { producers } = await new Promise((resolve, reject) => {
        socket.emit(
          "mediasoup:getProducers",
          { callId: currentCallId },
          (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          }
        );
      });

      for (const producerId of producers) {
        await consumeRemoteAudio(producerId);
      }

      // Wait a moment to verify transports are actually connected before setting status
      // Check transport states after a short delay
      setTimeout(() => {
        const sendState = sendTransport.connectionState;
        const recvState = recvTransport.connectionState;
        const sendClosed = sendTransport.closed;
        const recvClosed = recvTransport.closed;

        console.log("📞 [SFU] Transport state check after initialization:", {
          sendTransport: sendState,
          recvTransport: recvState,
          sendClosed: sendClosed,
          recvClosed: recvClosed,
        });

        // If transports are closed or failed, connection failed
        if (
          sendClosed ||
          recvClosed ||
          sendState === "failed" ||
          recvState === "failed"
        ) {
          console.error(
            "📞 [SFU] Transports failed or closed after initialization"
          );
          setError(
            "Connection failed. The transports did not establish properly. Please try ending and restarting the call."
          );
          setStatus("error");
          return;
        }

        // Only set connected if both transports are actually connected
        if (sendState === "connected" && recvState === "connected") {
          console.log("📞 [SFU] ✅ Both transports connected successfully");
          setStatus("connected");
          if (!callStartTimeRef.current) {
            callStartTimeRef.current = Date.now();
            startDurationTimer();
          }
        } else {
          // Still connecting or in intermediate state - keep monitoring
          console.log(
            "📞 [SFU] Transports in intermediate state, will continue monitoring..."
          );
          // Don't set status to connected yet - let transport handlers update it
        }
      }, 2000); // Wait 2 seconds to check transport states

      // Don't set status optimistically - wait for verification
      // The timeout check will set status to 'connected' only if transports are actually connected
      // If transports fail, it will set status to 'error'
      // Status will remain 'connecting' until verification completes
    } catch (error) {
      console.error("📞 [SFU] Error initializing SFU:", error);
      throw error;
    }
  };

  const initializeCall = async () => {
    try {
      const module = getModule();
      const currentCallId = callIdRef.current;

      if (!currentCallId) {
        console.warn(
          "📞 [CallPopup] No callId available, cannot initialize call"
        );
        return;
      }

      // Reset fallback flags for new call
      hasAttemptedFallbackRef.current = false;
      isSwitchingToSFURef.current = false;

      // Try to use existing socket first (for patient to ensure same connection)
      let socket = getSocket();
      let isNewSocket = false;

      // Helper function to join call room (returns promise)
      const joinCallRoom = (socketInstance) => {
        return new Promise((resolve) => {
          if (!socketInstance || !currentCallId) {
            console.error(
              "📞 [CallPopup] Cannot join room: missing socket or callId",
              {
                hasSocket: !!socketInstance,
                callId: currentCallId,
              }
            );
            resolve(false);
            return;
          }

          const joinRoomWithTimeout = () => {
            console.log(
              "📞 [CallPopup] Joining call room:",
              `call-${currentCallId}`
            );
            console.log("📞 [CallPopup] Socket state:", {
              id: socketInstance.id,
              connected: socketInstance.connected,
              disconnected: socketInstance.disconnected,
            });

            // Set timeout for room join (5 seconds)
            const timeout = setTimeout(() => {
              console.error(
                "📞 [CallPopup] ⏱️ Room join timeout - no response from server"
              );
              resolve(false);
            }, 5000);

            socketInstance.emit(
              "call:joinRoom",
              { callId: currentCallId },
              (response) => {
                clearTimeout(timeout);

                if (response && response.error) {
                  console.error(
                    "📞 [CallPopup] ❌ Failed to join call room:",
                    response.error
                  );
                  console.error("📞 [CallPopup] Response details:", response);
                  resolve(false);
                } else {
                  console.log(
                    "📞 [CallPopup] ✅ Successfully joined call room"
                  );
                  console.log("📞 [CallPopup] Server response:", response);

                  // Verify room join by checking socket state
                  // Note: socket.rooms is not available on client, but we trust server response
                  // We can verify by checking if socket is still connected
                  if (socketInstance.connected) {
                    console.log(
                      "📞 [CallPopup] Socket still connected after room join"
                    );
                    roomJoinedRef.current = true; // Mark as joined

                    // Notify server that we've joined (crucial for P2P signaling triggers)
                    const module = getModule();
                    if (module === "patient") {
                      console.log(
                        "📞 [CallPopup] Patient emitting call:joined..."
                      );
                      socketInstance.emit("call:joined", {
                        callId: currentCallId,
                      });
                    }

                    resolve(true);
                  } else {
                    console.warn(
                      "📞 [CallPopup] ⚠️ Socket disconnected after room join"
                    );
                    roomJoinedRef.current = false;
                    resolve(false);
                  }
                }
              }
            );
          };

          if (socketInstance.connected) {
            joinRoomWithTimeout();
          } else {
            // Wait for connection then join
            console.log(
              "📞 [CallPopup] Socket not connected, waiting for connection before joining room"
            );
            const connectHandler = () => {
              socketInstance.off("connect", connectHandler);
              console.log(
                "📞 [CallPopup] Socket connected, joining call room:",
                `call-${currentCallId}`
              );
              joinRoomWithTimeout();
            };
            socketInstance.once("connect", connectHandler);

            // Also set a timeout for connection wait
            setTimeout(() => {
              if (!socketInstance.connected) {
                console.error("📞 [CallPopup] ⏱️ Socket connection timeout");
                socketInstance.off("connect", connectHandler);
                resolve(false);
              }
            }, 10000); // 10 seconds for connection
          }
        });
      };

      if (!socket || !socket.connected) {
        // Fallback to creating new socket if shared socket not available
        const token =
          getAuthToken(module) ||
          getAuthToken("patient") ||
          getAuthToken("doctor");

        if (!token) {
          setError("Authentication required");
          setStatus("error");
          return;
        }

        console.log("📞 [CallPopup] Creating new socket connection for call");
        socket = io(SOCKET_URL, {
          auth: { token },
          transports: ["polling", "websocket"],
        });
        isNewSocket = true;

        // Set up socket event listeners before connect
        const handleDisconnect = (reason) => {
          console.log("📞 [CallPopup] Socket disconnected, reason:", reason);
          // For P2P, socket disconnect might not be fatal if P2P connection is already established
          // P2P can work even if signaling socket disconnects after connection is established
          if (p2pManagerRef.current && p2pManagerRef.current.peerConnection) {
            const pcState =
              p2pManagerRef.current.peerConnection.connectionState;
            console.log("📞 [CallPopup] P2P connection state:", pcState);
            if (pcState === "connected" || pcState === "connecting") {
              console.log(
                "📞 [CallPopup] P2P connection still active, socket disconnect may be non-fatal"
              );
              // Don't set error - P2P might still work
              return;
            }
          }
          // Only set error if P2P is not active or failed
          setStatus("error");
          setError("Connection lost");
        };

        const handleCallError = (data) => {
          console.error("📞 [CallPopup] Call error:", data);
          setError(data.message || "Call error occurred");
          setStatus("error");
        };

        // Use unified handler for call:ended
        const handleCallEnded = handleCallEndedUnified;

        // Handle call declined (patient declined before call started)
        const handleCallDeclined = (data) => {
          const currentCallId = callIdRef.current;
          const currentActiveCall = activeCallRef.current;

          console.log(
            "📞 [CallPopup] ====== call:declined EVENT RECEIVED ======"
          );
          console.log("📞 [CallPopup] Event data:", data);
          console.log(
            "📞 [CallPopup] Current callId (from ref):",
            currentCallId
          );
          console.log(
            "📞 [CallPopup] Current activeCall (from ref):",
            currentActiveCall
          );

          // Process if we have an active call
          const callIdMatches =
            data && data.callId && data.callId === currentCallId;
          const hasActiveCall = currentActiveCall && currentActiveCall.callId;

          if (!callIdMatches && !hasActiveCall) {
            console.log(
              "📞 [CallPopup] Ignoring call:declined - no callId match and no active call"
            );
            return;
          }

          console.log(
            "📞 [CallPopup] ✅ Processing call:declined event - closing call"
          );
          cleanup();
          setStatus("ended");
          setTimeout(() => {
            console.log(
              "📞 [CallPopup] Closing call UI from call:declined event"
            );
            endCall();
          }, 500);
        };

        const handleNewProducer = async (data) => {
          const eventTimestamp = Date.now();
          console.log(
            "📞 [CallPopup] ====== mediasoup:newProducer EVENT RECEIVED ======"
          );
          console.log("📞 [CallPopup] Producer data:", data);
          console.log(
            "📞 [CallPopup] Our producer ID:",
            producerRef.current?.id
          );
          console.log("📞 [CallPopup] New producer ID:", data.producerId);

          // DIAGNOSTIC: Event flow tracking
          console.log(
            `🔍 [DIAGNOSTIC] Event received at:`,
            new Date(eventTimestamp).toISOString()
          );
          const currentSocket = socketRef.current || socket;
          console.log(`🔍 [DIAGNOSTIC] Call room membership check:`, {
            socketId: currentSocket?.id,
            socketConnected: currentSocket?.connected,
            callId: callIdRef.current,
            roomJoined: roomJoinedRef.current, // socket.rooms not available on client
          });

          // Don't consume if call is ending or ended (but allow if we're switching to SFU)
          if (
            isEndingRef.current ||
            (status === "ended" && !isSwitchingToSFURef.current) ||
            status === "error"
          ) {
            console.log(
              "📞 [CallPopup] Ignoring new producer - call is ending or ended"
            );
            console.log(`🔍 [DIAGNOSTIC] Event ignored due to call state:`, {
              isEnding: isEndingRef.current,
              status: status,
              isSwitching: isSwitchingToSFURef.current,
            });
            return;
          }

          if (!data.producerId) {
            console.warn(
              "📞 [CallPopup] New producer event missing producerId"
            );
            console.warn(`🔍 [DIAGNOSTIC] Invalid event data:`, data);
            return;
          }

          // Never consume our own producer
          const isOurOwnProducer =
            producerRef.current && producerRef.current.id === data.producerId;
          if (isOurOwnProducer) {
            console.log(
              "📞 [CallPopup] Ignoring new producer - this is our own producer"
            );
            console.log(`🔍 [DIAGNOSTIC] Event ignored - our own producer:`, {
              ourProducerId: producerRef.current.id,
              eventProducerId: data.producerId,
            });
            return;
          }

          // DIAGNOSTIC: Timing check - when was our producer created?
          const producerCreatedTime =
            producerRef.current?._createdAt || "unknown";
          console.log(`🔍 [DIAGNOSTIC] Producer timing:`, {
            ourProducerCreated:
              producerCreatedTime !== "unknown"
                ? new Date(producerCreatedTime).toISOString()
                : "unknown",
            remoteProducerReceived: new Date(eventTimestamp).toISOString(),
            timeSinceOurProducer:
              producerCreatedTime !== "unknown"
                ? eventTimestamp - producerCreatedTime + "ms"
                : "unknown",
          });

          // Consume the remote producer
          console.log(
            "📞 [CallPopup] ✅ Consuming remote producer:",
            data.producerId
          );
          const consumeStartTime = Date.now();
          try {
            await consumeRemoteAudio(data.producerId);
            const consumeDuration = Date.now() - consumeStartTime;
            console.log(
              `🔍 [DIAGNOSTIC] Consumer creation completed in ${consumeDuration}ms`
            );
          } catch (error) {
            console.error(
              "📞 [CallPopup] Error consuming remote audio in handleNewProducer:",
              error
            );
            console.error(
              `🔍 [DIAGNOSTIC] Consumer creation failed after ${Date.now() - consumeStartTime
              }ms:`,
              error
            );
          }
        };

        socket.on("disconnect", handleDisconnect);
        socket.on("call:error", handleCallError);
        socket.on("call:ended", handleCallEnded);
        socket.on("call:declined", handleCallDeclined);
        socket.on("mediasoup:newProducer", handleNewProducer);
        socket.on("call:patientJoined", handlePatientJoinedUnified);

        socket.on("connect", async () => {
          console.log("📞 [CallPopup] Socket connected for call");
          socketRef.current = socket;

          // Join call room BEFORE starting the call
          console.log(
            "📞 [CallPopup] Joining call room before starting call..."
          );
          const roomJoined = await joinCallRoom(socket);
          if (!roomJoined) {
            console.error(
              "📞 [CallPopup] ❌ CRITICAL: Failed to join call room! Cannot proceed with call setup."
            );
            setError("Failed to join call room. Please try again.");
            setStatus("error");
            return; // Don't proceed if room join failed
          } else {
            console.log(
              "📞 [CallPopup] ✅ Successfully joined call room, now starting call"
            );
          }

          // Store cleanup function after socketRef is set
          if (socketRef.current) {
            socketRef.current._callPopupCleanup = () => {
              socket.off("disconnect", handleDisconnect);
              socket.off("call:error", handleCallError);
              socket.off("call:ended", handleCallEnded);
              socket.off("call:declined", handleCallDeclined);
              socket.off("mediasoup:newProducer", handleNewProducer);
              socket.off("call:patientJoined", handlePatientJoinedUnified);
              // Also cleanup P2P event handlers
              socket.off("p2p:offer");
              socket.off("p2p:answer");
              socket.off("p2p:iceCandidate");
            };
          }

          joinCall();
        });

        // Handle socket disconnect more gracefully for P2P
        socket.on("disconnect", (reason) => {
          console.log("📞 [CallPopup] Socket disconnected, reason:", reason);
          // Don't immediately set error status - P2P might still work if it was just a transport issue
          if (p2pManagerRef.current) {
            console.log(
              "📞 [CallPopup] P2P manager exists, checking connection state..."
            );
            // P2P connection might still be active even if socket disconnects
            // Only set error if P2P connection also fails
          } else {
            setStatus("error");
            setError("Connection lost");
          }
        });
      } else {
        console.log("📞 [CallPopup] Using existing socket connection");
        socketRef.current = socket;

        // Set up socket event listeners for existing socket
        const handleDisconnect = (reason) => {
          console.log("📞 [CallPopup] Socket disconnected, reason:", reason);
          // For P2P, socket disconnect might not be fatal if P2P connection is already established
          if (p2pManagerRef.current && p2pManagerRef.current.peerConnection) {
            const pcState =
              p2pManagerRef.current.peerConnection.connectionState;
            console.log("📞 [CallPopup] P2P connection state:", pcState);
            if (pcState === "connected" || pcState === "connecting") {
              console.log(
                "📞 [CallPopup] P2P connection still active, socket disconnect may be non-fatal"
              );
              return; // Don't set error if P2P is still working
            }
          }
          setStatus("error");
          setError("Connection lost");
        };

        const handleCallError = (data) => {
          console.error("📞 [CallPopup] Call error:", data);
          setError(data.message || "Call error occurred");
          setStatus("error");
        };

        // Use unified handler for call:ended
        const handleCallEnded = handleCallEndedUnified;

        // Handle call declined (patient declined before call started)
        const handleCallDeclined = (data) => {
          const currentCallId = callIdRef.current;
          const currentActiveCall = activeCallRef.current;

          console.log(
            "📞 [CallPopup] ====== call:declined EVENT RECEIVED ======"
          );
          console.log("📞 [CallPopup] Event data:", data);
          console.log(
            "📞 [CallPopup] Current callId (from ref):",
            currentCallId
          );
          console.log(
            "📞 [CallPopup] Current activeCall (from ref):",
            currentActiveCall
          );

          // Process if we have an active call
          const callIdMatches =
            data && data.callId && data.callId === currentCallId;
          const hasActiveCall = currentActiveCall && currentActiveCall.callId;

          if (!callIdMatches && !hasActiveCall) {
            console.log(
              "📞 [CallPopup] Ignoring call:declined - no callId match and no active call"
            );
            return;
          }

          console.log(
            "📞 [CallPopup] ✅ Processing call:declined event - closing call"
          );
          cleanup();
          setStatus("ended");
          setTimeout(() => {
            console.log(
              "📞 [CallPopup] Closing call UI from call:declined event"
            );
            endCall();
          }, 500);
        };

        const handleNewProducer = async (data) => {
          const eventTimestamp = Date.now();
          console.log(
            "📞 [CallPopup] ====== mediasoup:newProducer EVENT RECEIVED ======"
          );
          console.log("📞 [CallPopup] Producer data:", data);
          console.log(
            "📞 [CallPopup] Our producer ID:",
            producerRef.current?.id
          );
          console.log("📞 [CallPopup] New producer ID:", data.producerId);

          // DIAGNOSTIC: Event flow tracking
          console.log(
            `🔍 [DIAGNOSTIC] Event received at:`,
            new Date(eventTimestamp).toISOString()
          );
          const currentSocket = socketRef.current || socket;
          console.log(`🔍 [DIAGNOSTIC] Call room membership check:`, {
            socketId: currentSocket?.id,
            socketConnected: currentSocket?.connected,
            callId: callIdRef.current,
            roomJoined: roomJoinedRef.current, // socket.rooms not available on client
          });

          // Don't consume if call is ending or ended (but allow if we're switching to SFU)
          if (
            isEndingRef.current ||
            (status === "ended" && !isSwitchingToSFURef.current) ||
            status === "error"
          ) {
            console.log(
              "📞 [CallPopup] Ignoring new producer - call is ending or ended"
            );
            console.log(`🔍 [DIAGNOSTIC] Event ignored due to call state:`, {
              isEnding: isEndingRef.current,
              status: status,
              isSwitching: isSwitchingToSFURef.current,
            });
            return;
          }

          if (!data.producerId) {
            console.warn(
              "📞 [CallPopup] New producer event missing producerId"
            );
            console.warn(`🔍 [DIAGNOSTIC] Invalid event data:`, data);
            return;
          }

          // Never consume our own producer
          const isOurOwnProducer =
            producerRef.current && producerRef.current.id === data.producerId;
          if (isOurOwnProducer) {
            console.log(
              "📞 [CallPopup] Ignoring new producer - this is our own producer"
            );
            console.log(`🔍 [DIAGNOSTIC] Event ignored - our own producer:`, {
              ourProducerId: producerRef.current.id,
              eventProducerId: data.producerId,
            });
            return;
          }

          // DIAGNOSTIC: Timing check - when was our producer created?
          const producerCreatedTime =
            producerRef.current?._createdAt || "unknown";
          console.log(`🔍 [DIAGNOSTIC] Producer timing:`, {
            ourProducerCreated:
              producerCreatedTime !== "unknown"
                ? new Date(producerCreatedTime).toISOString()
                : "unknown",
            remoteProducerReceived: new Date(eventTimestamp).toISOString(),
            timeSinceOurProducer:
              producerCreatedTime !== "unknown"
                ? eventTimestamp - producerCreatedTime + "ms"
                : "unknown",
          });

          // Consume the remote producer
          console.log(
            "📞 [CallPopup] ✅ Consuming remote producer:",
            data.producerId
          );
          const consumeStartTime = Date.now();
          try {
            await consumeRemoteAudio(data.producerId);
            const consumeDuration = Date.now() - consumeStartTime;
            console.log(
              `🔍 [DIAGNOSTIC] Consumer creation completed in ${consumeDuration}ms`
            );
          } catch (error) {
            console.error(
              "📞 [CallPopup] Error consuming remote audio in handleNewProducer:",
              error
            );
            console.error(
              `🔍 [DIAGNOSTIC] Consumer creation failed after ${Date.now() - consumeStartTime
              }ms:`,
              error
            );
          }
        };

        socket.on("disconnect", handleDisconnect);
        socket.on("call:error", handleCallError);
        socket.on("call:ended", handleCallEnded);
        socket.on("call:declined", handleCallDeclined);
        socket.on("mediasoup:newProducer", handleNewProducer);
        socket.on("call:patientJoined", handlePatientJoinedUnified);

        // Store cleanup function for listeners
        if (socketRef.current) {
          socketRef.current._callPopupCleanup = () => {
            socket.off("disconnect", handleDisconnect);
            socket.off("call:error", handleCallError);
            socket.off("call:ended", handleCallEnded);
            socket.off("call:declined", handleCallDeclined);
            socket.off("mediasoup:newProducer", handleNewProducer);
            socket.off("call:patientJoined", handlePatientJoinedUnified);
          };
        }

        // Join call room BEFORE starting the call (for existing socket)
        console.log("📞 [CallPopup] Joining call room before starting call...");
        const roomJoined = await joinCallRoom(socket);
        if (!roomJoined) {
          console.error(
            "📞 [CallPopup] ❌ CRITICAL: Failed to join call room! Cannot proceed with call setup."
          );
          setError("Failed to join call room. Please try again.");
          setStatus("error");
          return; // Don't proceed if room join failed
        } else {
          console.log(
            "📞 [CallPopup] ✅ Successfully joined call room, now starting call"
          );
        }

        // Socket already connected, join call immediately
        joinCall();
      }
    } catch (error) {
      console.error("Error initializing call:", error);
      setError(error.message || "Failed to initialize call");
      setStatus("error");
    }
  };

  const joinCall = async () => {
    try {
      const socket = socketRef.current;
      if (!socket) {
        console.error("📞 [CallPopup] No socket available, cannot join call");
        return;
      }

      const currentCallId = callIdRef.current; // Use ref to get current callId
      if (!currentCallId) {
        console.warn("📞 [CallPopup] No callId available, cannot join call");
        return;
      }

      console.log("📞 [CallPopup] ====== JOINING CALL ======");
      console.log("📞 [CallPopup] Call ID:", currentCallId);
      console.log("📞 [CallPopup] Socket connected:", socket.connected);
      console.log("📞 [CallPopup] Socket ID:", socket.id);

      // P2P/SFU Selection Logic
      const shouldUseP2P = useP2P;
      const module = getModule();
      const isInitiator = module === "doctor"; // Doctor initiates the call

      if (shouldUseP2P) {
        console.log("🔗 [P2P] Using P2P connection mode");
        console.log("🔗 [P2P] Is initiator:", isInitiator);

        // Initialize P2P manager
        const p2pManager = new P2PCallManager(currentCallId, socket, () => {
          const module = getModule();
          return (
            getAuthToken(module) ||
            getAuthToken("patient") ||
            getAuthToken("doctor")
          );
        });
        p2pManagerRef.current = p2pManager;

        // Set up remote stream handler
        // Set up remote stream handler
        p2pManager.onRemoteStream = (remoteStream) => {
          console.log(
            "🔗 [P2P] ====== REMOTE STREAM RECEIVED IN CALLPOPUP ======"
          );
          console.log("🔗 [P2P] Remote stream details:", {
            id: remoteStream?.id,
            active: remoteStream?.active,
            audioTracks: remoteStream?.getAudioTracks().length || 0,
            videoTracks: remoteStream?.getVideoTracks().length || 0,
          });

          // Update state to trigger attachment effect
          if (remoteStream) {
            setMediaStreams(prev => ({ ...prev, remote: remoteStream }));
          }
        };

        // Set up connection state handler with automatic SFU fallback
        p2pManager.onConnectionStateChange = (state) => {
          console.log("🔗 [P2P] Connection state changed:", state);
          if (state === "connected") {
            setStatus("connected");
            if (!callStartTimeRef.current) {
              callStartTimeRef.current = Date.now();
              startDurationTimer();
            }
            // Reset fallback flag on successful connection
            hasAttemptedFallbackRef.current = false;
          } else if (state === "failed" || state === "disconnected") {
            console.error("🔗 [P2P] Connection failed:", state);

            // Only attempt fallback once and if not already switching
            if (
              !hasAttemptedFallbackRef.current &&
              !isSwitchingToSFURef.current
            ) {
              console.log(
                "🔄 [Fallback] P2P connection failed, attempting SFU fallback..."
              );
              hasAttemptedFallbackRef.current = true;
              switchToSFU();
            } else {
              // If fallback already attempted or in progress, show error
              setError("P2P connection failed. Please try again.");
              setStatus("error");
            }
          }
        };

        // Set up ICE connection state handler for early failure detection
        p2pManager.onIceConnectionStateChange = (iceState) => {
          console.log("🔗 [P2P] ICE connection state changed:", iceState);

          // If ICE fails, attempt fallback (but only if peer connection state hasn't already failed)
          if (
            iceState === "failed" &&
            !hasAttemptedFallbackRef.current &&
            !isSwitchingToSFURef.current
          ) {
            const pcState = p2pManager.peerConnection?.connectionState;
            console.log(
              "🔗 [P2P] ICE connection failed, peer connection state:",
              pcState
            );

            // Wait a bit to see if peer connection state also fails
            setTimeout(() => {
              const currentPcState = p2pManager.peerConnection?.connectionState;
              if (
                currentPcState === "failed" ||
                currentPcState === "disconnected"
              ) {
                if (
                  !hasAttemptedFallbackRef.current &&
                  !isSwitchingToSFURef.current
                ) {
                  console.log(
                    "🔄 [Fallback] ICE failed and peer connection failed, attempting SFU fallback..."
                  );
                  hasAttemptedFallbackRef.current = true;
                  switchToSFU();
                }
              }
            }, 2000); // Wait 2 seconds for peer connection to catch up
          }
        };

        // Set up P2P event handlers (store references for cleanup)
        const p2pOfferHandler = async (data) => {
          if (data.callId === currentCallId && !isInitiator) {
            console.log("🔗 [P2P] Received offer");
            try {
              await p2pManager.handleOffer(data.offer);
            } catch (error) {
              console.error("🔗 [P2P] Error handling offer:", error);
            }
          }
        };

        const p2pAnswerHandler = async (data) => {
          if (data.callId === currentCallId && isInitiator) {
            console.log("🔗 [P2P] Received answer");
            try {
              await p2pManager.handleAnswer(data.answer);
            } catch (error) {
              console.error("🔗 [P2P] Error handling answer:", error);
            }
          }
        };

        const p2pIceCandidateHandler = async (data) => {
          if (data.callId === currentCallId && data.candidate !== undefined) {
            console.log("🔗 [P2P] Received ICE candidate");
            try {
              await p2pManager.handleIceCandidate(data.candidate);
            } catch (error) {
              // Error is already logged in handleIceCandidate, just log here for context
              const errorMessage =
                error?.message || error?.toString() || "Unknown error";
              console.warn(
                "🔗 [P2P] ICE candidate handler error (may be non-fatal):",
                errorMessage
              );
            }
          }
        };

        socket.on("p2p:offer", p2pOfferHandler);
        socket.on("p2p:answer", p2pAnswerHandler);
        socket.on("p2p:iceCandidate", p2pIceCandidateHandler);

        // Store handlers for cleanup
        socket._p2pHandlers = {
          offer: p2pOfferHandler,
          answer: p2pAnswerHandler,
          iceCandidate: p2pIceCandidateHandler,
        };

        // Initialize P2P connection
        console.log("🔗 [P2P] Starting P2P initialization...");
        const p2pInitialized = await p2pManager.initialize(isInitiator, isVideoCall);
        if (!p2pInitialized) {
          console.error("🔗 [P2P] ❌ Failed to initialize P2P connection");

          // Attempt automatic fallback to SFU if not already attempted
          if (
            !hasAttemptedFallbackRef.current &&
            !isSwitchingToSFURef.current
          ) {
            console.log(
              "🔄 [Fallback] P2P initialization failed, attempting SFU fallback..."
            );
            hasAttemptedFallbackRef.current = true;
            await switchToSFU();
            return; // Exit, SFU will handle the rest
          } else {
            // If fallback already attempted or in progress, show error
            setError(
              "Failed to initialize P2P connection. Check browser console for details. Make sure microphone permission is granted."
            );
            setStatus("error");
            return;
          }
        }

        console.log("🔗 [P2P] ✅ P2P connection initialized successfully");

        // Update state with local stream
        if (p2pManager.localStream) {
          setMediaStreams(prev => ({ ...prev, local: p2pManager.localStream }));
        }

        // Note: Connection state will be set by onConnectionStateChange handler
        // Don't set status here as P2P might still fail during ICE negotiation

        // Set up timeout to automatically fallback to SFU if connection doesn't complete
        // This handles cases where P2P gets stuck in "connecting" state
        p2pConnectionTimeoutRef.current = setTimeout(() => {
          const pcState = p2pManager.peerConnection?.connectionState;
          console.log("🔗 [P2P] Connection timeout check (15s):", {
            pcState: pcState,
            hasAttemptedFallback: hasAttemptedFallbackRef.current,
            isSwitching: isSwitchingToSFURef.current,
          });

          // If still not connected after 15 seconds and not already switching, fallback to SFU
          if (
            pcState !== "connected" &&
            !hasAttemptedFallbackRef.current &&
            !isSwitchingToSFURef.current
          ) {
            console.log(
              "🔄 [Fallback] P2P connection timeout (15s), attempting SFU fallback..."
            );
            hasAttemptedFallbackRef.current = true;
            switchToSFU();
          }
        }, 15000); // 15 second timeout

        // Clear timeout if connection succeeds
        const originalOnConnectionStateChange =
          p2pManager.onConnectionStateChange;
        p2pManager.onConnectionStateChange = (state) => {
          if (state === "connected") {
            if (p2pConnectionTimeoutRef.current) {
              clearTimeout(p2pConnectionTimeoutRef.current);
              p2pConnectionTimeoutRef.current = null;
              console.log("🔗 [P2P] Connection established, clearing timeout");
            }
          }
          if (originalOnConnectionStateChange) {
            originalOnConnectionStateChange(state);
          }
        };

        return; // Exit early, P2P flow complete
      } else {
        console.log("📞 [SFU] Using SFU (mediasoup) connection mode");
        // Use the extracted SFU initialization function
        await initializeSFU(socket, currentCallId);
        return;
      }

      const sendTransport = device.createSendTransport({
        id: sendTransportData.id,
        iceParameters: sendTransportData.iceParameters,
        iceCandidates: sendTransportData.iceCandidates,
        dtlsParameters: sendTransportData.dtlsParameters,
        iceServers,
      });

      // DIAGNOSTIC: Monitor send transport connection state
      sendTransport.on("connectstatechange", (state) => {
        console.log(
          `🔍 [DIAGNOSTIC] Send transport connectionState changed: ${state}`
        );
        console.log(`🔍 [DIAGNOSTIC] Send transport details:`, {
          id: sendTransport.id,
          connectionState: sendTransport.connectionState,
          iceState: sendTransport.iceState,
          dtlsState: sendTransport.dtlsState,
          state: state,
        });

        if (state === "failed" || state === "disconnected") {
          console.error(
            `🔍 [DIAGNOSTIC] ⚠️ Send transport connection issue: ${state}`
          );
          console.error(`🔍 [DIAGNOSTIC] Send transport failure details:`, {
            id: sendTransport.id,
            connectionState: sendTransport.connectionState,
            iceState: sendTransport.iceState,
            dtlsState: sendTransport.dtlsState,
            closed: sendTransport.closed,
            iceServers: iceServers,
          });

          // If SFU transport fails, update status to error
          if (!useP2P) {
            console.log("🔄 [Fallback] Send transport failed, connection lost");
            setError(
              "Connection failed. The send transport did not establish. Please try ending and restarting the call."
            );
            setStatus("error");
          }
        }
      });

      // DIAGNOSTIC: Monitor ICE state changes
      sendTransport.on("icegatheringstatechange", (state) => {
        console.log(
          `🔍 [DIAGNOSTIC] Send transport ICE gathering state: ${state}`
        );
      });

      // DIAGNOSTIC: Monitor ICE connection state
      sendTransport.on("iceconnectionstatechange", (state) => {
        console.log(
          `🔍 [DIAGNOSTIC] Send transport ICE connection state: ${state}`
        );
        if (state === "failed" || state === "disconnected") {
          console.error(
            `🔍 [DIAGNOSTIC] ⚠️ Send transport ICE connection issue: ${state}`
          );
        }
      });

      // DIAGNOSTIC: Monitor DTLS state changes
      sendTransport.on("dtlsstatechange", (state) => {
        console.log(`🔍 [DIAGNOSTIC] Send transport DTLS state: ${state}`);
        if (state === "failed") {
          console.error(`🔍 [DIAGNOSTIC] ⚠️ Send transport DTLS failed`);
        }
      });

      sendTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          console.log(`🔍 [DIAGNOSTIC] Send transport connecting...`);
          console.log(`🔍 [DIAGNOSTIC] DTLS parameters:`, {
            role: dtlsParameters.role,
            fingerprints: dtlsParameters.fingerprints?.length || 0,
          });
          try {
            // Add timeout for transport connection
            const timeout = setTimeout(() => {
              console.error(
                `🔍 [DIAGNOSTIC] ⏱️ Send transport connection timeout (10s)`
              );
              errback(new Error("Transport connection timeout"));
            }, 10000);

            socket.emit(
              "mediasoup:connectTransport",
              {
                transportId: sendTransport.id,
                dtlsParameters,
                callId: currentCallId, // Include callId for verification
              },
              (response) => {
                clearTimeout(timeout);
                if (response && response.error) {
                  console.error(
                    `🔍 [DIAGNOSTIC] ❌ Send transport DTLS connection failed:`,
                    response.error
                  );
                  console.error(`🔍 [DIAGNOSTIC] Server response:`, response);
                  errback(new Error(response.error));
                } else {
                  console.log(
                    `🔍 [DIAGNOSTIC] ✅ Send transport DTLS connected successfully`
                  );
                  console.log(`🔍 [DIAGNOSTIC] Server response:`, response);
                  callback();
                }
              }
            );
          } catch (error) {
            console.error(
              `🔍 [DIAGNOSTIC] Send transport connect error:`,
              error
            );
            console.error(`🔍 [DIAGNOSTIC] Error stack:`, error.stack);
            errback(error);
          }
        }
      );

      // DIAGNOSTIC: Monitor ICE connection state
      if (sendTransport.observer) {
        sendTransport.observer.on("newtransport", (transport) => {
          console.log(
            `🔍 [DIAGNOSTIC] Send transport observer: new transport`,
            transport
          );
        });
      }

      sendTransport.on(
        "produce",
        async ({ kind, rtpParameters }, callback, errback) => {
          try {
            socket.emit(
              "mediasoup:produce",
              {
                transportId: sendTransport.id,
                rtpParameters,
                kind,
              },
              (response) => {
                if (response.error) {
                  errback(new Error(response.error));
                } else {
                  callback({ id: response.producer.id });
                }
              }
            );
          } catch (error) {
            errback(error);
          }
        }
      );

      sendTransportRef.current = sendTransport;

      // Create recv transport
      const recvTransportData = await new Promise((resolve, reject) => {
        socket.emit(
          "mediasoup:createWebRtcTransport",
          { callId: currentCallId },
          (response) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response.transport);
            }
          }
        );
      });

      const recvTransport = device.createRecvTransport({
        id: recvTransportData.id,
        iceParameters: recvTransportData.iceParameters,
        iceCandidates: recvTransportData.iceCandidates,
        dtlsParameters: recvTransportData.dtlsParameters,
        iceServers,
      });

      // DIAGNOSTIC: Monitor recv transport connection state
      recvTransport.on("connectstatechange", (state) => {
        console.log(
          `🔍 [DIAGNOSTIC] Recv transport connectionState changed: ${state}`
        );
        console.log(`🔍 [DIAGNOSTIC] Recv transport details:`, {
          id: recvTransport.id,
          connectionState: recvTransport.connectionState,
          state: state,
        });

        if (state === "failed" || state === "disconnected") {
          console.error(
            `🔍 [DIAGNOSTIC] ⚠️ Recv transport connection issue: ${state}`
          );

          // If SFU transport fails, update status to error
          if (!useP2P && status === "connected") {
            console.log("🔄 [Fallback] Recv transport failed, connection lost");
            setError(
              "Connection lost. Please try ending and restarting the call."
            );
            setStatus("error");
          }
        }
      });

      recvTransport.on(
        "connect",
        async ({ dtlsParameters }, callback, errback) => {
          console.log(`🔍 [DIAGNOSTIC] Recv transport connecting...`);
          try {
            socket.emit(
              "mediasoup:connectTransport",
              {
                transportId: recvTransport.id,
                dtlsParameters,
              },
              (response) => {
                if (response.error) {
                  console.error(
                    `🔍 [DIAGNOSTIC] Recv transport DTLS connection failed:`,
                    response.error
                  );
                  errback(new Error(response.error));
                } else {
                  console.log(
                    `🔍 [DIAGNOSTIC] ✅ Recv transport DTLS connected successfully`
                  );
                  callback();
                }
              }
            );
          } catch (error) {
            console.error(
              `🔍 [DIAGNOSTIC] Recv transport connect error:`,
              error
            );
            errback(error);
          }
        }
      );

      // DIAGNOSTIC: Log initial transport states
      console.log(`🔍 [DIAGNOSTIC] Send transport initial state:`, {
        id: sendTransport.id,
        connectionState: sendTransport.connectionState,
        closed: sendTransport.closed,
      });
      console.log(`🔍 [DIAGNOSTIC] Recv transport initial state:`, {
        id: recvTransport.id,
        connectionState: recvTransport.connectionState,
        closed: recvTransport.closed,
      });

      // DIAGNOSTIC: Monitor ICE connection state
      const monitorTransportStates = setInterval(() => {
        if (!sendTransportRef.current || !recvTransportRef.current) {
          clearInterval(monitorTransportStates);
          return;
        }

        const sendState = sendTransportRef.current.connectionState;
        const recvState = recvTransportRef.current.connectionState;

        console.log(`🔍 [DIAGNOSTIC] Transport states periodic check:`, {
          sendTransport: {
            id: sendTransportRef.current.id,
            connectionState: sendState,
            closed: sendTransportRef.current.closed,
          },
          recvTransport: {
            id: recvTransportRef.current.id,
            connectionState: recvState,
            closed: recvTransportRef.current.closed,
          },
          timestamp: new Date().toISOString(),
        });

        // Check for connection issues
        if (sendState === "failed" || sendState === "disconnected") {
          console.error(
            `🔍 [DIAGNOSTIC] ⚠️ Send transport connection issue: ${sendState}`
          );
        }
        if (recvState === "failed" || recvState === "disconnected") {
          console.error(
            `🔍 [DIAGNOSTIC] ⚠️ Recv transport connection issue: ${recvState}`
          );
        }
      }, 5000); // Check every 5 seconds

      // Store interval for cleanup
      if (sendTransportRef.current) {
        sendTransportRef.current._monitorInterval = monitorTransportStates;
      }

      recvTransportRef.current = recvTransport;

      // CRITICAL: Ensure we're in the call room before producing audio
      // This prevents race condition where producer event is emitted before room join completes
      console.log(
        "📞 [CallPopup] Verifying call room membership before producing..."
      );
      if (socket && socket.connected) {
        // Double-check room membership
        const verifyRoomJoin = () => {
          return new Promise((resolve) => {
            socket.emit(
              "call:joinRoom",
              { callId: currentCallId },
              (response) => {
                if (response && response.error) {
                  console.warn(
                    "📞 [CallPopup] Room join verification failed:",
                    response.error
                  );
                  resolve(false);
                } else {
                  console.log(
                    "📞 [CallPopup] ✅ Confirmed in call room, proceeding with audio production"
                  );
                  resolve(true);
                }
              }
            );
          });
        };

        const roomJoined = await verifyRoomJoin();
        if (!roomJoined) {
          console.warn(
            "📞 [CallPopup] ⚠️ Room join verification failed, but continuing with production"
          );
        }
      } else {
        console.warn(
          "📞 [CallPopup] ⚠️ Socket not available for room verification"
        );
      }

      // Get user media and produce
      await produceLocalAudio();

      // Request existing producers for this call (to handle race condition)
      // This ensures we consume audio from participants who joined before us
      console.log(
        "📞 [CallPopup] Fetching existing producers for call:",
        currentCallId
      );
      try {
        const existingProducersResponse = await new Promise(
          (resolve, reject) => {
            socket.emit(
              "mediasoup:getProducers",
              { callId: currentCallId },
              (response) => {
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              }
            );
          }
        );

        const existingProducers = existingProducersResponse.producers || [];
        console.log(
          "📞 [CallPopup] Found",
          existingProducers.length,
          "existing producer(s):",
          existingProducers.map((p) => p.id)
        );
        console.log("📞 [CallPopup] Our producer ID:", producerRef.current?.id);

        // Consume all existing producers (from other participants who joined earlier)
        if (existingProducers.length > 0) {
          for (const producer of existingProducers) {
            // Only consume if:
            // 1. Producer has a valid ID
            // 2. It's not our own producer
            // 3. We haven't already consumed it (check consumerRef)
            const isOurProducer = producer.id === producerRef.current?.id;
            const alreadyConsumed =
              consumerRef.current &&
              consumerRef.current.producerId === producer.id;

            if (producer.id && !isOurProducer && !alreadyConsumed) {
              console.log(
                "📞 [CallPopup] ✅ Consuming existing producer:",
                producer.id
              );
              try {
                await consumeRemoteAudio(producer.id);
                console.log(
                  "📞 [CallPopup] ✅ Successfully consumed existing producer:",
                  producer.id
                );
              } catch (error) {
                console.error(
                  "📞 [CallPopup] Error consuming existing producer:",
                  producer.id,
                  error
                );
                // Continue with other producers even if one fails
              }
            } else {
              if (isOurProducer) {
                console.log(
                  "📞 [CallPopup] Skipping existing producer - this is our own:",
                  producer.id
                );
              } else if (alreadyConsumed) {
                console.log(
                  "📞 [CallPopup] Skipping existing producer - already consumed:",
                  producer.id
                );
              } else {
                console.warn(
                  "📞 [CallPopup] Skipping existing producer - invalid ID:",
                  producer
                );
              }
            }
          }
        } else {
          console.log(
            "📞 [CallPopup] No existing producers found - will wait for new producer events"
          );
        }
      } catch (error) {
        console.warn(
          "📞 [CallPopup] Error getting existing producers (non-critical):",
          error
        );
        console.warn(
          "📞 [CallPopup] Will rely on mediasoup:newProducer events for remote audio"
        );
        // Don't fail the call if this fails - we'll still listen for new producers
      }

      setStatus("connected");
      callStartTimeRef.current = Date.now();
      startDurationTimer();

      // Notify server that we've successfully joined the call (for doctor notification)
      // Note: module is already declared at the start of joinCall function
      const currentSocket = socketRef.current;

      if (module === "patient" && currentSocket) {
        // Ensure socket is connected before emitting
        if (currentSocket.connected) {
          console.log(
            "📞 [CallPopup] Emitting call:joined event for callId:",
            callId
          );
          console.log("📞 [CallPopup] Socket state:", {
            connected: currentSocket.connected,
            id: currentSocket.id,
            authenticated: !!currentSocket.auth,
          });

          currentSocket.emit(
            "call:joined",
            { callId: currentCallId },
            (response) => {
              if (response) {
                console.log(
                  "📞 [CallPopup] call:joined acknowledgment:",
                  response
                );
              }
            }
          );
        } else {
          console.warn(
            "📞 [CallPopup] Socket not connected, waiting for connection before emitting call:joined"
          );
          const connectHandler = () => {
            console.log(
              "📞 [CallPopup] Socket connected, now emitting call:joined"
            );
            currentSocket.emit("call:joined", { callId: currentCallId });
            currentSocket.off("connect", connectHandler);
          };
          currentSocket.on("connect", connectHandler);
        }
      } else if (module === "patient") {
        console.error("📞 [CallPopup] No socket available to emit call:joined");
      }
    } catch (error) {
      console.error("Error joining call:", error);
      setError(error.message || "Failed to join call");
      setStatus("error");
    }
  };

  const produceLocalAudio = async () => {
    try {
      console.log("📞 [CallPopup] ====== PRODUCING LOCAL AUDIO ======");
      console.log("📞 [CallPopup] Requesting microphone access...");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      const audioTracks = stream.getAudioTracks();
      console.log(
        "📞 [CallPopup] Microphone access granted, audio tracks:",
        audioTracks.length
      );
      if (audioTracks.length > 0) {
        console.log("📞 [CallPopup] Audio track details:", {
          id: audioTracks[0].id,
          label: audioTracks[0].label,
          enabled: audioTracks[0].enabled,
          muted: audioTracks[0].muted,
          readyState: audioTracks[0].readyState,
        });
      }

      if (!sendTransportRef.current) {
        throw new Error("Send transport not available");
      }

      const track = audioTracks[0];
      const params = {
        track,
        codecOptions: {
          opusStereo: true,
          opusFec: true,
          opusDtx: true,
          opusMaxPlaybackRate: 48000,
        },
      };

      console.log(
        "📞 [CallPopup] Creating producer with send transport:",
        sendTransportRef.current.id
      );
      const producerCreateStartTime = Date.now();
      const producer = await sendTransportRef.current.produce(params);
      const producerCreateDuration = Date.now() - producerCreateStartTime;
      producerRef.current = producer;
      producer._createdAt = producerCreateStartTime; // Store creation time for diagnostics

      console.log("📞 [CallPopup] ✅ Producer created successfully:", {
        id: producer.id,
        kind: producer.kind,
        trackId: producer.track?.id,
        creationTime: producerCreateDuration + "ms",
      });
      console.log(
        "📞 [CallPopup] Producer will notify other participants via mediasoup:newProducer event"
      );

      // DIAGNOSTIC: Log producer creation timing
      console.log(`🔍 [DIAGNOSTIC] Producer creation:`, {
        producerId: producer.id,
        createdAt: new Date(producerCreateStartTime).toISOString(),
        creationDuration: producerCreateDuration + "ms",
        transportId: sendTransportRef.current.id,
        callId: callIdRef.current,
      });

      // DIAGNOSTIC: Monitor producer state
      console.log(`🔍 [DIAGNOSTIC] Producer details:`, {
        id: producer.id,
        kind: producer.kind,
        paused: producer.paused,
        closed: producer.closed,
        track: producer.track
          ? {
            id: producer.track.id,
            kind: producer.track.kind,
            enabled: producer.track.enabled,
            muted: producer.track.muted,
            readyState: producer.track.readyState,
          }
          : null,
      });

      // DIAGNOSTIC: Monitor producer events
      producer.on("transportclose", () => {
        console.warn(
          `🔍 [DIAGNOSTIC] ⚠️ Producer transport closed:`,
          producer.id
        );
      });

      // DIAGNOSTIC: Check if producer is actually sending data
      if (producer.track) {
        const checkProducerActivity = setInterval(() => {
          if (producer.closed) {
            clearInterval(checkProducerActivity);
            return;
          }
          console.log(`🔍 [DIAGNOSTIC] Producer activity check:`, {
            id: producer.id,
            paused: producer.paused,
            trackEnabled: producer.track.enabled,
            trackMuted: producer.track.muted,
            trackReadyState: producer.track.readyState,
          });
        }, 5000); // Check every 5 seconds

        // Clean up interval on component unmount
        if (producerRef.current) {
          producerRef.current._activityCheckInterval = checkProducerActivity;
        }
      }

      // Note: We'll consume when we receive mediasoup:newProducer event
    } catch (error) {
      console.error("📞 [CallPopup] ❌ Error producing local audio:", error);
      console.error("📞 [CallPopup] Error details:", {
        name: error.name,
        message: error.message,
        stack: error.stack,
      });
      setError("Failed to access microphone: " + error.message);
      setStatus("error");
    }
  };

  const consumeRemoteAudio = async (producerId) => {
    try {
      console.log("📞 [CallPopup] ====== CONSUMING REMOTE AUDIO ======");
      console.log("📞 [CallPopup] Producer ID:", producerId);

      // Don't consume if call is ending or ended (but allow if we're switching to SFU)
      if (
        isEndingRef.current ||
        (status === "ended" && !isSwitchingToSFURef.current) ||
        status === "error"
      ) {
        console.log("📞 [CallPopup] Cannot consume - call is ending or ended", {
          isEnding: isEndingRef.current,
          status: status,
          isSwitching: isSwitchingToSFURef.current,
        });
        return;
      }

      // Close existing consumer if we're replacing it (for 1-to-1 calls, there should only be one remote producer)
      if (consumerRef.current) {
        console.log(
          "📞 [CallPopup] Replacing existing consumer with new producer:",
          producerId
        );
        console.log("📞 [CallPopup] Old consumer ID:", consumerRef.current.id);
        try {
          consumerRef.current.close();
          console.log("📞 [CallPopup] Old consumer closed");
        } catch (error) {
          console.warn(
            "📞 [CallPopup] Error closing existing consumer:",
            error
          );
        }
        consumerRef.current = null;
      }

      const device = deviceRef.current;
      const recvTransport = recvTransportRef.current;
      const socket = socketRef.current;

      if (!device || !recvTransport || !socket) {
        console.warn(
          "📞 [CallPopup] Cannot consume - missing required components:",
          {
            device: !!device,
            recvTransport: !!recvTransport,
            socket: !!socket,
            status: status,
            isSwitching: isSwitchingToSFURef.current,
          }
        );

        // If we're switching to SFU and components aren't ready yet, wait a bit
        if (isSwitchingToSFURef.current) {
          console.log(
            "📞 [CallPopup] SFU switch in progress, components may not be ready yet - will retry when ready"
          );
          return;
        }
        return;
      }

      const currentCallId = callIdRef.current;
      if (!currentCallId) {
        console.warn("📞 [CallPopup] No callId available, cannot consume");
        return;
      }

      console.log("📞 [CallPopup] Requesting consumer from server...");
      console.log("📞 [CallPopup] Transport ID:", recvTransport.id);
      console.log("📞 [CallPopup] Call ID:", currentCallId);

      const { consumer } = await new Promise((resolve, reject) => {
        socket.emit(
          "mediasoup:consume",
          {
            transportId: recvTransport.id,
            producerId,
            rtpCapabilities: device.rtpCapabilities,
            callId: currentCallId,
          },
          (response) => {
            if (response.error) {
              console.error(
                "📞 [CallPopup] Server error creating consumer:",
                response.error
              );
              reject(new Error(response.error));
            } else {
              console.log(
                "📞 [CallPopup] ✅ Consumer created on server:",
                response.consumer?.id
              );
              resolve(response);
            }
          }
        );
      });

      // Check if recvTransport is still valid before consuming
      if (!recvTransportRef.current || recvTransportRef.current.closed) {
        console.warn(
          "📞 [CallPopup] Receive transport is closed, cannot consume"
        );
        return;
      }

      console.log(
        "📞 [CallPopup] Creating consumer instance with mediasoup-client..."
      );
      // Create consumer using mediasoup-client
      const consumerInstance = await recvTransport.consume({
        id: consumer.id,
        producerId: consumer.producerId,
        kind: consumer.kind,
        rtpParameters: consumer.rtpParameters,
      });

      consumerRef.current = consumerInstance;
      console.log("📞 [CallPopup] ✅ Consumer instance created:", {
        id: consumerInstance.id,
        producerId: consumerInstance.producerId,
        kind: consumerInstance.kind,
        hasTrack: !!consumerInstance.track,
      });

      // DIAGNOSTIC: Monitor consumer state
      console.log(`🔍 [DIAGNOSTIC] Consumer details:`, {
        id: consumerInstance.id,
        producerId: consumerInstance.producerId,
        kind: consumerInstance.kind,
        paused: consumerInstance.paused,
        closed: consumerInstance.closed,
        track: consumerInstance.track
          ? {
            id: consumerInstance.track.id,
            kind: consumerInstance.track.kind,
            enabled: consumerInstance.track.enabled,
            muted: consumerInstance.track.muted,
            readyState: consumerInstance.track.readyState,
          }
          : null,
      });

      // DIAGNOSTIC: Monitor consumer events
      consumerInstance.on("transportclose", () => {
        console.warn(
          `🔍 [DIAGNOSTIC] ⚠️ Consumer transport closed:`,
          consumerInstance.id
        );
      });

      consumerInstance.on("producerclose", () => {
        console.warn(
          `🔍 [DIAGNOSTIC] ⚠️ Consumer producer closed:`,
          consumerInstance.producerId
        );
      });

      // Resume consumer on server (consumers are paused by default in mediasoup)
      console.log("📞 [CallPopup] Resuming consumer on server...");
      try {
        await new Promise((resolve, reject) => {
          socket.emit(
            "mediasoup:resumeConsumer",
            {
              consumerId: consumerInstance.id,
            },
            (response) => {
              if (response.error) {
                console.error(
                  "📞 [CallPopup] Server error resuming consumer:",
                  response.error
                );
                reject(new Error(response.error));
              } else {
                console.log("📞 [CallPopup] ✅ Consumer resumed on server");

                // DIAGNOSTIC: Verify consumer is actually resumed
                console.log(`🔍 [DIAGNOSTIC] Consumer resume verification:`, {
                  id: consumerInstance.id,
                  paused: consumerInstance.paused,
                  closed: consumerInstance.closed,
                });

                resolve(response);
              }
            }
          );
        });
      } catch (error) {
        console.error("📞 [CallPopup] ❌ Error resuming consumer:", error);
        console.error(
          `🔍 [DIAGNOSTIC] Consumer resume failed - consumer may be paused!`
        );
        // Don't fail the call if resume fails - try to continue anyway
      }

      // Ensure the track is enabled
      if (consumerInstance.track) {
        consumerInstance.track.enabled = true;
        console.log("📞 [CallPopup] Consumer track details:", {
          id: consumerInstance.track.id,
          kind: consumerInstance.track.kind,
          enabled: consumerInstance.track.enabled,
          readyState: consumerInstance.track.readyState,
          muted: consumerInstance.track.muted,
        });
      } else {
        console.error("📞 [CallPopup] ❌ Consumer instance has no track!");
      }

      // Wait for audio element to be ready and set up remote audio playback
      console.log(
        "📞 [CallPopup] Setting up audio element for remote audio..."
      );
      const setupAudioElement = (retryCount = 0) => {
        const maxRetries = 20; // Increased retries
        const audioElement = remoteAudioRef.current;

        // Check if audio element exists and is in the DOM
        if (!audioElement) {
          if (retryCount < maxRetries) {
            console.warn(
              `📞 [CallPopup] Audio element not available, retrying... (${retryCount + 1
              }/${maxRetries})`
            );
            // Use requestAnimationFrame for better timing with DOM updates
            requestAnimationFrame(() => {
              setTimeout(() => {
                setupAudioElement(retryCount + 1);
              }, 50);
            });
            return;
          } else {
            console.error(
              "📞 [CallPopup] ❌ Audio element still not available after",
              maxRetries,
              "retries"
            );
            return;
          }
        }

        // Verify the element is actually in the DOM
        if (
          !audioElement.ownerDocument ||
          !audioElement.ownerDocument.body.contains(audioElement)
        ) {
          if (retryCount < maxRetries) {
            console.warn(
              `📞 [CallPopup] Audio element not in DOM, retrying... (${retryCount + 1
              }/${maxRetries})`
            );
            requestAnimationFrame(() => {
              setTimeout(() => {
                setupAudioElement(retryCount + 1);
              }, 50);
            });
            return;
          } else {
            console.error(
              "📞 [CallPopup] ❌ Audio element not in DOM after",
              maxRetries,
              "retries"
            );
            return;
          }
        }

        console.log(
          "📞 [CallPopup] Audio element found and in DOM, setting up remote audio stream..."
        );

        // DIAGNOSTIC: Check audio element initial state
        console.log(`🔍 [DIAGNOSTIC] Audio element initial state:`, {
          paused: audioElement.paused,
          muted: audioElement.muted,
          volume: audioElement.volume,
          readyState: audioElement.readyState,
          srcObject: !!audioElement.srcObject,
          error: audioElement.error,
          inDOM: audioElement.ownerDocument?.body?.contains(audioElement),
        });

        // Verify consumer track exists and is valid
        if (!consumerInstance.track) {
          console.error("📞 [CallPopup] ❌ Consumer instance has no track!");
          return;
        }

        // Create audio element for remote audio
        const stream = new MediaStream([consumerInstance.track]);
        console.log("📞 [CallPopup] Created MediaStream with track:", {
          trackId: consumerInstance.track.id,
          kind: consumerInstance.track.kind,
          enabled: consumerInstance.track.enabled,
          readyState: consumerInstance.track.readyState,
        });

        // DIAGNOSTIC: Check MediaStream state
        console.log(`🔍 [DIAGNOSTIC] MediaStream details:`, {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().map((t) => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          })),
        });

        // Clear any existing srcObject first
        if (audioElement.srcObject) {
          console.log(
            "📞 [CallPopup] Clearing existing srcObject before setting new stream"
          );
          const oldStream = audioElement.srcObject;
          oldStream.getTracks().forEach((track) => track.stop());
          audioElement.srcObject = null;
        }

        // Set up audio element properties
        try {
          audioElement.srcObject = stream;
          audioElement.volume = 1.0; // Ensure volume is at maximum
          audioElement.muted = false; // Ensure not muted

          // Force a re-check to ensure srcObject was set
          if (!audioElement.srcObject) {
            console.error(
              "📞 [CallPopup] ❌ Failed to set srcObject on audio element!"
            );
            // Try again after a brief delay
            setTimeout(() => {
              if (remoteAudioRef.current && consumerInstance.track) {
                console.log("📞 [CallPopup] Retrying srcObject assignment...");
                remoteAudioRef.current.srcObject = new MediaStream([
                  consumerInstance.track,
                ]);
                remoteAudioRef.current.volume = 1.0;
                remoteAudioRef.current.muted = false;
              }
            }, 100);
            return;
          }
        } catch (error) {
          console.error(
            "📞 [CallPopup] ❌ Error setting audio element srcObject:",
            error
          );
          return;
        }

        console.log("📞 [CallPopup] Audio element configured:", {
          volume: audioElement.volume,
          muted: audioElement.muted,
          paused: audioElement.paused,
          readyState: audioElement.readyState,
        });

        // DIAGNOSTIC: Verify audio element configuration immediately after setting
        setTimeout(() => {
          const verifyElement = remoteAudioRef.current;
          if (verifyElement) {
            console.log(
              `🔍 [DIAGNOSTIC] Audio element verification (after 100ms):`,
              {
                srcObject: !!verifyElement.srcObject,
                srcObjectTracks: verifyElement.srcObject
                  ? verifyElement.srcObject.getTracks().length
                  : 0,
                srcObjectActive: verifyElement.srcObject
                  ? verifyElement.srcObject.active
                  : false,
                volume: verifyElement.volume,
                muted: verifyElement.muted,
                paused: verifyElement.paused,
                readyState: verifyElement.readyState,
                autoplay: verifyElement.autoplay,
              }
            );
          }
        }, 100);

        // Add event listeners for debugging
        const onLoadedMetadata = () => {
          console.log("📞 [CallPopup] ✅ Audio metadata loaded");
        };

        const onCanPlay = () => {
          console.log("📞 [CallPopup] ✅ Audio can play");
        };

        const onPlay = () => {
          console.log("📞 [CallPopup] ✅ Audio started playing");
        };

        const onError = (e) => {
          console.error("📞 [CallPopup] ❌ Audio element error:", e);
          console.error("📞 [CallPopup] Error details:", {
            error: audioElement.error,
            code: audioElement.error?.code,
            message: audioElement.error?.message,
          });
          console.error(`🔍 [DIAGNOSTIC] Audio element error state:`, {
            paused: audioElement.paused,
            muted: audioElement.muted,
            volume: audioElement.volume,
            readyState: audioElement.readyState,
            srcObject: !!audioElement.srcObject,
            error: audioElement.error,
          });
        };

        const onStalled = () => {
          console.warn(`🔍 [DIAGNOSTIC] ⚠️ Audio element stalled`);
        };

        const onWaiting = () => {
          console.warn(`🔍 [DIAGNOSTIC] ⚠️ Audio element waiting for data`);
        };

        const onSuspend = () => {
          console.warn(`🔍 [DIAGNOSTIC] ⚠️ Audio element suspended`);
        };

        audioElement.addEventListener("loadedmetadata", onLoadedMetadata);
        audioElement.addEventListener("canplay", onCanPlay);
        audioElement.addEventListener("play", onPlay);
        audioElement.addEventListener("error", onError);
        audioElement.addEventListener("stalled", onStalled);
        audioElement.addEventListener("waiting", onWaiting);
        audioElement.addEventListener("suspend", onSuspend);

        // DIAGNOSTIC: Monitor audio element state periodically
        const monitorAudioElement = setInterval(() => {
          if (!audioElement || audioElement.ended) {
            clearInterval(monitorAudioElement);
            return;
          }
          console.log(`🔍 [DIAGNOSTIC] Audio element periodic check:`, {
            paused: audioElement.paused,
            muted: audioElement.muted,
            volume: audioElement.volume,
            readyState: audioElement.readyState,
            currentTime: audioElement.currentTime,
            duration: audioElement.duration,
            srcObject: !!audioElement.srcObject,
            srcObjectActive: audioElement.srcObject
              ? audioElement.srcObject.active
              : false,
            error: audioElement.error,
          });
        }, 5000); // Check every 5 seconds

        // Store interval for cleanup
        if (remoteAudioRef.current) {
          remoteAudioRef.current._monitorInterval = monitorAudioElement;
        }

        // Play the audio with retry logic
        const playAudio = async (playRetryCount = 0) => {
          const maxPlayRetries = 3;
          try {
            console.log("📞 [CallPopup] Attempting to play remote audio...");
            await audioElement.play();
            console.log("📞 [CallPopup] ✅ Remote audio playing successfully");
          } catch (playError) {
            console.warn(
              "📞 [CallPopup] Initial play() failed:",
              playError.name,
              playError.message
            );
            if (playRetryCount < maxPlayRetries) {
              // Retry after a short delay
              console.log(
                `📞 [CallPopup] Retrying play()... (${playRetryCount + 1
                }/${maxPlayRetries})`
              );
              setTimeout(async () => {
                try {
                  await audioElement.play();
                  console.log(
                    "📞 [CallPopup] ✅ Remote audio playing after retry"
                  );
                } catch (retryError) {
                  console.error(
                    "📞 [CallPopup] ❌ Failed to play remote audio after retry:",
                    retryError
                  );
                  // Some browsers require user interaction - log but don't fail
                  if (retryError.name === "NotAllowedError") {
                    console.warn(
                      "📞 [CallPopup] Browser blocked autoplay - user interaction may be required"
                    );
                  } else {
                    // Try one more time if not a permission error
                    if (playRetryCount < maxPlayRetries - 1) {
                      playAudio(playRetryCount + 1);
                    }
                  }
                }
              }, 200 * (playRetryCount + 1)); // Exponential backoff
            } else {
              console.error(
                "📞 [CallPopup] ❌ Failed to play remote audio after",
                maxPlayRetries,
                "retries"
              );
              if (playError.name === "NotAllowedError") {
                console.warn(
                  "📞 [CallPopup] Browser blocked autoplay - user interaction may be required"
                );
              }
            }
          }
        };

        playAudio();
      };

      // Setup audio element (with retry if not ready)
      setupAudioElement();

      console.log(
        "📞 [CallPopup] ✅ Successfully consuming remote audio from producer:",
        producerId
      );
    } catch (error) {
      // Check if error is due to call being ended or transport/router being closed
      const errorMessage = error.message || error.toString();
      const isCallEndedError =
        errorMessage.includes("Router not found") ||
        (errorMessage.includes("Transport") &&
          errorMessage.includes("closed")) ||
        (errorMessage.includes("call") && errorMessage.includes("ended"));

      if (isCallEndedError) {
        // Call was likely ended, this is expected - don't log as error
        console.log(
          "📞 [CallPopup] Cannot consume remote audio - call may have ended:",
          errorMessage
        );
      } else {
        // Other errors should be logged
        console.error("📞 [CallPopup] Error consuming remote audio:", error);
      }
    }
  };

  const startDurationTimer = () => {
    durationIntervalRef.current = setInterval(() => {
      if (callStartTimeRef.current) {
        const elapsed = Math.floor(
          (Date.now() - callStartTimeRef.current) / 1000
        );
        setCallDuration(elapsed);
      }
    }, 1000);
  };

  const handleMuteToggle = () => {
    // Handle P2P mute
    if (p2pManagerRef.current) {
      const newMutedState = !isMuted;
      p2pManagerRef.current.setMuted(newMutedState);
      setIsMuted(newMutedState);

      // Notify DoctorCallStatus of mute state change
      const event = new CustomEvent("call:muteStateUpdate", {
        detail: { muted: newMutedState },
      });
      window.dispatchEvent(event);
      return;
    }

    // Handle SFU mute
    if (producerRef.current) {
      const newMutedState = !isMuted;
      if (newMutedState) {
        producerRef.current.pause();
      } else {
        producerRef.current.resume();
      }
      setIsMuted(newMutedState);

      // Notify DoctorCallStatus of mute state change
      const event = new CustomEvent("call:muteStateUpdate", {
        detail: { muted: newMutedState },
      });
      window.dispatchEvent(event);
    }
  };

  // Handle video toggle
  const handleVideoToggle = () => {
    const newVideoState = !isVideoEnabled;
    setIsVideoEnabled(newVideoState);

    // Handle P2P video toggle
    if (p2pManagerRef.current) {
      p2pManagerRef.current.setVideoEnabled(newVideoState);
    }
    // Note: SFU video toggle would go here if implemented
  };

  // Listen for mute toggle events from DoctorCallStatus
  useEffect(() => {
    const handleMuteToggleEvent = (event) => {
      const { muted } = event.detail;
      if (producerRef.current) {
        if (muted) {
          producerRef.current.pause();
        } else {
          producerRef.current.resume();
        }
        setIsMuted(muted);
      }
    };

    window.addEventListener("call:muteToggle", handleMuteToggleEvent);
    return () => {
      window.removeEventListener("call:muteToggle", handleMuteToggleEvent);
    };
  }, [isMuted]);

  // Backup mechanism: Ensure audio element has srcObject when consumer is ready
  // This runs periodically to catch cases where the initial setup might have failed
  useEffect(() => {
    if (status !== "connecting" && status !== "connected") {
      return;
    }

    const checkAndSetupAudio = () => {
      const consumer = consumerRef.current;
      const audioElement = remoteAudioRef.current;

      if (!consumer || !audioElement || !consumer.track) {
        return;
      }

      // Check if audio element needs srcObject
      if (!audioElement.srcObject) {
        console.log(
          "📞 [CallPopup] [Backup] Audio element missing srcObject, setting up..."
        );

        try {
          const stream = new MediaStream([consumer.track]);
          audioElement.srcObject = stream;
          audioElement.volume = 1.0;
          audioElement.muted = false;

          console.log(
            "📞 [CallPopup] [Backup] ✅ Audio element srcObject set via backup mechanism"
          );

          // Verify it was set
          setTimeout(() => {
            if (audioElement.srcObject) {
              console.log(
                "📞 [CallPopup] [Backup] ✅ Verified srcObject is set"
              );
              // Try to play
              audioElement.play().catch((error) => {
                console.warn(
                  "📞 [CallPopup] [Backup] Play failed (may need user interaction):",
                  error.name
                );
              });
            } else {
              console.warn(
                "📞 [CallPopup] [Backup] ⚠️ srcObject was not set successfully"
              );
            }
          }, 50);
        } catch (error) {
          console.error(
            "📞 [CallPopup] [Backup] Error setting srcObject:",
            error
          );
        }
      }
    };

    // Check immediately
    checkAndSetupAudio();

    // Also check periodically as a backup (every 500ms for first 5 seconds)
    const interval = setInterval(() => {
      checkAndSetupAudio();
    }, 500);

    const timeout = setTimeout(() => {
      clearInterval(interval);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // Re-run when status changes (intentionally not including refs in deps)

  const handleEndCall = async (emitToServer = true) => {
    // Prevent duplicate call end
    if (isEndingRef.current) {
      console.log(
        "📞 [CallPopup] handleEndCall called but already ending, ignoring"
      );
      return;
    }
    isEndingRef.current = true;

    // Ensure emitToServer is a boolean (in case event object was passed)
    const shouldEmitToServer =
      typeof emitToServer === "boolean" ? emitToServer : true;

    const currentCallId = callIdRef.current; // Use ref to get current callId
    console.log("📞 [CallPopup] ====== ENDING CALL ======");
    console.log("📞 [CallPopup] callId (from ref):", currentCallId);
    console.log("📞 [CallPopup] emitToServer:", shouldEmitToServer);

    try {
      const socket = socketRef.current;
      // Only emit to server if we're the one initiating the end
      // If emitToServer is false, it means the call was ended by the other party
      if (socket && shouldEmitToServer && currentCallId) {
        console.log("📞 [CallPopup] Emitting call:end to server");
        socket.emit("call:end", { callId: currentCallId }, (response) => {
          if (response) {
            console.log("📞 [CallPopup] call:end acknowledgment:", response);
          }
        });
      } else {
        console.log(
          "📞 [CallPopup] Not emitting call:end to server (call ended by other party)"
        );
      }
    } catch (error) {
      console.error("📞 [CallPopup] Error ending call:", error);
    } finally {
      console.log("📞 [CallPopup] Cleaning up call resources");
      cleanup();
      setStatus("ended");
      // Close the call UI immediately (reduced from 2000ms to 500ms for faster response)
      setTimeout(() => {
        console.log("📞 [CallPopup] Closing call UI");
        endCall(); // Use context to close call
        isEndingRef.current = false; // Reset for next call
      }, 500); // Reduced delay for faster UI response
    }
  };

  const cleanup = () => {
    console.log("📞 [CallPopup] Cleaning up call resources");
    isEndingRef.current = true;
    roomJoinedRef.current = false; // Reset room join status

    // Stop duration timer
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
    }

    // Clear P2P connection timeout
    if (p2pConnectionTimeoutRef.current) {
      clearTimeout(p2pConnectionTimeoutRef.current);
      p2pConnectionTimeoutRef.current = null;
    }

    // Cleanup P2P connection
    if (p2pManagerRef.current) {
      console.log("🔗 [P2P] Cleaning up P2P connection");
      p2pManagerRef.current.cleanup();
      p2pManagerRef.current = null;

      // Remove P2P event listeners
      const socket = socketRef.current;
      if (socket) {
        socket.off("p2p:offer");
        socket.off("p2p:answer");
        socket.off("p2p:iceCandidate");
      }
    }

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }

    // Close producer (SFU)
    if (producerRef.current) {
      producerRef.current.close();
      producerRef.current = null;
    }

    // Close consumer (SFU)
    if (consumerRef.current) {
      consumerRef.current.close();
      consumerRef.current = null;
    }

    // Close transports (SFU)
    if (sendTransportRef.current) {
      sendTransportRef.current.close();
      sendTransportRef.current = null;
    }

    if (recvTransportRef.current) {
      recvTransportRef.current.close();
      recvTransportRef.current = null;
    }

    // Clean up socket listeners and disconnect if it was created by CallPopup
    if (socketRef.current) {
      // Clean up event listeners
      try {
        if (
          socketRef.current._callPopupCleanup &&
          typeof socketRef.current._callPopupCleanup === "function"
        ) {
          socketRef.current._callPopupCleanup();
          delete socketRef.current._callPopupCleanup;
        }
      } catch (error) {
        console.warn("Error cleaning up socket listeners:", error);
      }

      try {
        const currentCallId = callIdRef.current;
        if (currentCallId) {
          socketRef.current.emit("call:leave", { callId: currentCallId });
        }
      } catch (error) {
        console.warn("Error emitting call:leave:", error);
      }

      // Only disconnect if this is not the shared socket
      const sharedSocket = getSocket();
      if (socketRef.current !== sharedSocket) {
        try {
          socketRef.current.disconnect();
        } catch (error) {
          console.warn("Error disconnecting socket:", error);
        }
      }

      socketRef.current = null;
    }
  };

  // Don't render if no active call
  if (!activeCall || !callId) {
    return null;
  }

  // Audio element must always be rendered to keep audio playing (even when minimized)
  // Render it before any conditional returns
  const audioElement = (
    <audio
      ref={remoteAudioRef}
      autoPlay
      playsInline
      volume={1.0}
      style={{ display: "none" }}
    />
  );

  if (status === "error") {
    return (
      <>
        {audioElement}
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Call Error
            </h2>
            <p className="text-slate-600 mb-4">
              {error || "An error occurred"}
            </p>
            <button
              onClick={() => endCall()}
              className="bg-slate-900 text-white px-6 py-2 rounded-lg font-semibold hover:bg-slate-800 transition">
              Close
            </button>
          </div>
        </div>
      </>
    );
  }

  if (status === "ended") {
    return (
      <>
        {audioElement}
        <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Call Ended
            </h2>
            <p className="text-slate-600">
              Duration: {formatCallDuration(callDuration)}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Minimized view - floating button (for doctors)
  if (isMinimized && getModule() === "doctor") {
    return (
      <>
        {audioElement}
        <div className="fixed bottom-6 right-6 z-[10000]">
          <button
            onClick={maximize}
            className="relative flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full shadow-lg hover:bg-blue-700 transition active:scale-95"
            title="Click to expand call">
            {/* Pulsing animation */}
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            <IoCallOutline className="text-white text-2xl relative z-10" />

            {/* Duration badge */}
            {status === "connected" && callDuration > 0 && (
              <span className="absolute -bottom-1 -right-1 bg-green-500 text-white text-xs font-semibold px-1.5 py-0.5 rounded-full">
                {formatCallDuration(callDuration).split(":")[1]}
              </span>
            )}
          </button>
        </div>
      </>
    );
  }

  // DIAGNOSTIC: Get current diagnostic state
  const getDiagnosticState = () => {
    return {
      callId: callIdRef.current,
      status: status,
      socket: socketRef.current
        ? {
          id: socketRef.current.id,
          connected: socketRef.current.connected,
          roomJoined: roomJoinedRef.current, // Track room join status (socket.rooms not available on client)
          // Note: socket.rooms is server-side only, we track join status via roomJoinedRef
        }
        : null,
      sendTransport: sendTransportRef.current
        ? {
          id: sendTransportRef.current.id,
          connectionState: sendTransportRef.current.connectionState,
          closed: sendTransportRef.current.closed,
        }
        : null,
      recvTransport: recvTransportRef.current
        ? {
          id: recvTransportRef.current.id,
          connectionState: recvTransportRef.current.connectionState,
          closed: recvTransportRef.current.closed,
        }
        : null,
      producer: producerRef.current
        ? {
          id: producerRef.current.id,
          paused: producerRef.current.paused,
          closed: producerRef.current.closed,
          track: producerRef.current.track
            ? {
              enabled: producerRef.current.track.enabled,
              muted: producerRef.current.track.muted,
              readyState: producerRef.current.track.readyState,
            }
            : null,
        }
        : null,
      consumer: consumerRef.current
        ? {
          id: consumerRef.current.id,
          producerId: consumerRef.current.producerId,
          paused: consumerRef.current.paused,
          closed: consumerRef.current.closed,
          track: consumerRef.current.track
            ? {
              enabled: consumerRef.current.track.enabled,
              muted: consumerRef.current.track.muted,
              readyState: consumerRef.current.track.readyState,
            }
            : null,
        }
        : null,
      audioElement: remoteAudioRef.current
        ? {
          paused: remoteAudioRef.current.paused,
          muted: remoteAudioRef.current.muted,
          volume: remoteAudioRef.current.volume,
          readyState: remoteAudioRef.current.readyState,
          srcObject: !!remoteAudioRef.current.srcObject,
          error: remoteAudioRef.current.error,
        }
        : null,
    };
  };

  return (
    <>
      {audioElement}
      <div className="fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
        <div
          className={`bg-white rounded-2xl shadow-2xl relative transition-all duration-300 ${isVideoCall
            ? 'w-[95vw] h-[85vh] max-w-6xl p-0 bg-slate-900 overflow-hidden border border-slate-700'
            : 'p-6 max-w-md w-full'
            }`}
        >
          {/* Minimize button (for doctors) - Adjusted color for video mode */}
          {getModule() === "doctor" && (
            <button
              onClick={minimize}
              className={`absolute top-4 right-4 z-50 rounded p-1 transition ${isVideoCall
                ? 'text-white/80 hover:text-white hover:bg-white/10'
                : 'text-slate-500 hover:text-slate-700'
                }`}
              title="Minimize">
              <IoRemoveOutline className="text-xl" />
            </button>
          )}

          {/* Diagnostic Toggle Button - Adjusted for video mode */}
          <button
            onClick={() => setShowDiagnostics(!showDiagnostics)}
            className={`absolute top-4 left-4 z-50 text-xs px-2 py-1 rounded transition ${isVideoCall
              ? 'bg-black/30 text-white/80 hover:bg-black/50 border border-white/10'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            title="Toggle Diagnostics">
            🔍 {showDiagnostics ? "Hide" : "Show"} Diagnostics
          </button>

          {isVideoCall ? (
            /* ================= VIDEO CALL UI ================= */
            <div className="relative w-full h-full flex flex-col group">
              {/* Video Layer */}
              <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                {/* Remote Video (Main) */}
                <video
                  ref={remoteVideoRef}
                  className="w-full h-full object-cover"
                  autoPlay
                  playsInline
                  muted // Muted because we use remoteAudioRef for audio
                />

                {/* Placeholder if no video / connecting */}
                {(status !== 'connected' || !remoteVideoRef.current?.srcObject) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
                    <div className="text-center">
                      <div className="w-24 h-24 bg-slate-800 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                        <IoVideocamOutline className="text-4xl text-slate-500" />
                      </div>
                      <p className="text-slate-400 font-medium">
                        {status === 'connected' ? 'Waiting for video...' : 'Connecting...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Local Video (PIP) */}
                <div className="absolute bottom-24 right-6 w-36 h-48 md:w-56 md:h-72 bg-slate-900 rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 z-20 group/pip transition-transform hover:scale-105">
                  {isVideoEnabled ? (
                    <video
                      ref={localVideoRef}
                      className="w-full h-full object-cover transform -scale-x-100"
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                      <IoVideocamOffOutline className="text-3xl text-slate-500" />
                    </div>
                  )}
                  <div className="absolute bottom-2 left-2 text-white/80 text-[10px] bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm">
                    You
                  </div>
                </div>
              </div>

              {/* Call Info Overlay (Top Center) */}
              <div className="absolute top-6 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/10 z-10 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-white font-medium text-sm tracking-wide">
                  {formatCallDuration(callDuration)}
                </span>
                <span className="text-white/40 text-xs">|</span>
                <span className="text-white/80 text-sm">
                  {remoteParticipant}
                </span>
              </div>

              {/* Controls Bar Overlay (Bottom) */}
              <div className="absolute bottom-0 left-0 right-0 p-8 pt-20 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 flex items-center justify-center gap-6 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity duration-300">
                {/* Video Toggle */}
                <button
                  onClick={handleVideoToggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition backdrop-blur-md border border-white/10 ${!isVideoEnabled
                    ? "bg-red-500/90 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
                    : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  title={!isVideoEnabled ? "Turn Camera On" : "Turn Camera Off"}
                >
                  {!isVideoEnabled ? (
                    <IoVideocamOffOutline className="text-2xl" />
                  ) : (
                    <IoVideocamOutline className="text-2xl" />
                  )}
                </button>

                {/* End Call */}
                <button
                  onClick={() => handleEndCall(true)}
                  className="w-18 h-18 p-5 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700 transition shadow-xl shadow-red-600/30 active:scale-95"
                  title="End Call"
                >
                  <IoCloseOutline className="text-4xl" />
                </button>

                {/* Mute Toggle */}
                <button
                  onClick={handleMuteToggle}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition backdrop-blur-md border border-white/10 ${isMuted
                    ? "bg-red-500/90 text-white hover:bg-red-600 shadow-lg shadow-red-500/20"
                    : "bg-white/10 text-white hover:bg-white/20"
                    }`}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted ? (
                    <IoMicOffOutline className="text-2xl" />
                  ) : (
                    <IoMicOutline className="text-2xl" />
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* ================= AUDIO CALL UI ================= */
            <>
              {/* Header */}
              <div className="text-center mb-6">
                <div className="w-20 h-20 bg-slate-200 rounded-full mx-auto mb-4 flex items-center justify-center relative shadow-inner">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 opacity-50"></div>
                  {status === 'connected' && (
                    <div className="absolute inset-0 rounded-full border-4 border-green-400 opacity-20 animate-ping"></div>
                  )}
                  <IoCallOutline className="text-3xl text-slate-600 relative z-10" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">
                  Audio Call
                </h2>
                <p className="text-slate-600 text-sm font-medium">{remoteParticipant}</p>
                {status === "connected" && (
                  <p className="text-green-600 text-xs mt-2 font-mono bg-green-50 px-3 py-1 rounded-full inline-block">
                    {formatCallDuration(callDuration)}
                  </p>
                )}
                {status === "connecting" && (
                  <p className="text-slate-500 text-xs mt-2 animate-pulse">Connecting...</p>
                )}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-6 mt-8">
                <button
                  onClick={handleMuteToggle}
                  disabled={status !== "connected"}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition shadow-lg ${isMuted
                    ? "bg-red-500 text-white hover:bg-red-600 shadow-red-200"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title={isMuted ? "Unmute" : "Mute"}>
                  {isMuted ? (
                    <IoMicOffOutline className="text-2xl" />
                  ) : (
                    <IoMicOutline className="text-2xl" />
                  )}
                </button>

                <button
                  onClick={() => handleEndCall(true)}
                  disabled={status === "ended"}
                  className="w-16 h-16 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition shadow-xl shadow-red-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  title="End Call">
                  <IoCloseOutline className="text-3xl" />
                </button>
              </div>

              {/* Status indicator */}
              <div className="mt-8 text-center">
                <div
                  className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${status === "connected"
                    ? "bg-green-100 text-green-700 border border-green-200"
                    : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                    }`}>
                  <div
                    className={`w-2 h-2 rounded-full ${status === "connected"
                      ? "bg-green-500"
                      : "bg-yellow-500 animate-pulse"
                      }`}></div>
                  {status === "connected" ? "Connected" : "Connecting..."}
                </div>
              </div>
            </>
          )}

          {/* Diagnostic Panel */}
          {showDiagnostics && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 max-h-96 overflow-y-auto">
              <h3 className="text-sm font-bold text-slate-900 mb-2">
                🔍 Diagnostic Information
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <strong>Call ID:</strong> {callIdRef.current || "N/A"}
                </div>
                <div>
                  <strong>Status:</strong> {status}
                </div>

                {socketRef.current && (
                  <div className="mt-2">
                    <strong>Socket:</strong>
                    <div className="ml-2 text-slate-600">
                      ID: {socketRef.current.id}
                      <br />
                      Connected: {socketRef.current.connected ? "✅" : "❌"}
                      <br />
                      Room Joined: {roomJoinedRef.current ? "✅ Yes" : "❌ No"}
                    </div>
                  </div>
                )}

                {sendTransportRef.current && (
                  <div className="mt-2">
                    <strong>Send Transport:</strong>
                    <div className="ml-2 text-slate-600">
                      ID: {sendTransportRef.current.id}
                      <br />
                      State:{" "}
                      <span
                        className={
                          sendTransportRef.current.connectionState ===
                            "connected"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }>
                        {sendTransportRef.current.connectionState}
                      </span>
                      <br />
                      Closed: {sendTransportRef.current.closed ? "❌" : "✅"}
                    </div>
                  </div>
                )}

                {recvTransportRef.current && (
                  <div className="mt-2">
                    <strong>Recv Transport:</strong>
                    <div className="ml-2 text-slate-600">
                      ID: {recvTransportRef.current.id}
                      <br />
                      State:{" "}
                      <span
                        className={
                          recvTransportRef.current.connectionState ===
                            "connected"
                            ? "text-green-600"
                            : "text-yellow-600"
                        }>
                        {recvTransportRef.current.connectionState}
                      </span>
                      <br />
                      Closed: {recvTransportRef.current.closed ? "❌" : "✅"}
                    </div>
                  </div>
                )}

                {producerRef.current && (
                  <div className="mt-2">
                    <strong>Producer:</strong>
                    <div className="ml-2 text-slate-600">
                      ID: {producerRef.current.id}
                      <br />
                      Paused: {producerRef.current.paused ? "⏸️" : "▶️"}
                      <br />
                      Closed: {producerRef.current.closed ? "❌" : "✅"}
                      <br />
                      {producerRef.current.track && (
                        <>
                          Track Enabled:{" "}
                          {producerRef.current.track.enabled ? "✅" : "❌"}
                          <br />
                          Track Muted:{" "}
                          {producerRef.current.track.muted ? "🔇" : "🔊"}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {consumerRef.current && (
                  <div className="mt-2">
                    <strong>Consumer:</strong>
                    <div className="ml-2 text-slate-600">
                      ID: {consumerRef.current.id}
                      <br />
                      Producer ID: {consumerRef.current.producerId}
                      <br />
                      Paused: {consumerRef.current.paused ? "⏸️" : "▶️"}
                      <br />
                      Closed: {consumerRef.current.closed ? "❌" : "✅"}
                      <br />
                      {consumerRef.current.track && (
                        <>
                          Track Enabled:{" "}
                          {consumerRef.current.track.enabled ? "✅" : "❌"}
                          <br />
                          Track Muted:{" "}
                          {consumerRef.current.track.muted ? "🔇" : "🔊"}
                          <br />
                          Track State: {consumerRef.current.track.readyState}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {remoteAudioRef.current && (
                  <div className="mt-2">
                    <strong>Audio Element:</strong>
                    <div className="ml-2 text-slate-600">
                      Paused: {remoteAudioRef.current.paused ? "⏸️" : "▶️"}
                      <br />
                      Muted: {remoteAudioRef.current.muted ? "🔇" : "🔊"}
                      <br />
                      Volume: {remoteAudioRef.current.volume}
                      <br />
                      Ready State: {remoteAudioRef.current.readyState}
                      <br />
                      Has Source:{" "}
                      {remoteAudioRef.current.srcObject ? "✅" : "❌"}
                      <br />
                      {remoteAudioRef.current.error && (
                        <span className="text-red-600">
                          Error: {remoteAudioRef.current.error.message}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-2 text-xs text-slate-500">
                  <em>
                    Check browser console (F12) for detailed diagnostic logs
                  </em>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CallPopup;
