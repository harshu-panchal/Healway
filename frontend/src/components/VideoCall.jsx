/* eslint-disable react/prop-types */
import { useState, useEffect } from "react";
import AgoraRTC, {
    AgoraRTCProvider,
    useJoin,
    useLocalCameraTrack,
    useLocalMicrophoneTrack,
    usePublish,
    useRemoteUsers,
    RemoteUser,
    LocalUser,
} from "agora-rtc-react";
import {
    IoMicOutline,
    IoMicOffOutline,
    IoVideocamOutline,
    IoVideocamOffOutline,
    IoCallOutline,
    IoCloseOutline
} from "react-icons/io5";

// Default placeholder - User should replace this in .env
// Default placeholder - User should replace this in .env
// Note: This ID needs to be from a project with "No Certificate" (Testing Mode) enabled.
const APP_ID = import.meta.env.VITE_AGORA_APP_ID || "";

const CallControls = ({
    localMicTrack,
    localCameraTrack,
    callType,
    onEndCall
}) => {
    const [micOn, setMicOn] = useState(true);
    const [cameraOn, setCameraOn] = useState(callType === "video");

    // Mute/Unmute Mic
    useEffect(() => {
        if (localMicTrack) {
            localMicTrack.setEnabled(micOn);
        }
    }, [micOn, localMicTrack]);

    // Enable/Disable Camera
    useEffect(() => {
        if (localCameraTrack && callType === "video") {
            localCameraTrack.setEnabled(cameraOn);
        }
    }, [cameraOn, localCameraTrack, callType]);

    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-900/80 p-4 rounded-full backdrop-blur-sm z-50">
            <button
                onClick={() => setMicOn((prev) => !prev)}
                className={`p-4 rounded-full transition-all ${micOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-500 text-white"
                    }`}
                title={micOn ? "Mute Microphone" : "Unmute Microphone"}
            >
                {micOn ? <IoMicOutline className="h-6 w-6" /> : <IoMicOffOutline className="h-6 w-6" />}
            </button>

            {callType === "video" && (
                <button
                    onClick={() => setCameraOn((prev) => !prev)}
                    className={`p-4 rounded-full transition-all ${cameraOn ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-red-500 text-white"
                        }`}
                    title={cameraOn ? "Turn Off Camera" : "Turn On Camera"}
                >
                    {cameraOn ? <IoVideocamOutline className="h-6 w-6" /> : <IoVideocamOffOutline className="h-6 w-6" />}
                </button>
            )}

            <button
                onClick={onEndCall}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all shadow-lg shadow-red-600/30"
                title="End Call"
            >
                <IoCallOutline className="h-6 w-6 rotate-[135deg]" />
            </button>
        </div>
    );
};

const VideoCallInterface = ({ appId, channelName, token, callType, onEndCall }) => {
    const [error, setError] = useState(null);

    // Join Channel
    const { isLoading: isJoining, isConnected, error: joinError } = useJoin(
        { appid: appId, channel: channelName, token: token || null },
        true // active
    );

    // Handle Join Errors
    useEffect(() => {
        if (joinError) {
            console.error("Agora Join Error:", joinError);
            if (joinError.code === "CAN_NOT_GET_GATEWAY_SERVER" || joinError.message?.includes("dynamic use static key")) {
                setError("Your Agora App ID is configured for Secure Mode (Certificate Enabled). For this demo to work without a backend token server, please create a new Agora Project with 'Testing Mode (App ID Only)'.");
            } else {
                setError(`Connection failed: ${joinError.message}`);
            }
        }
    }, [joinError]);

    // Local Tracks
    const { localMicrophoneTrack } = useLocalMicrophoneTrack(true);
    const { localCameraTrack } = useLocalCameraTrack(callType === "video");

    // Publish Tracks
    usePublish([localMicrophoneTrack, callType === "video" ? localCameraTrack : null]);

    // Remote Users
    const remoteUsers = useRemoteUsers();

    if (error) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-red-500/50 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <IoCloseOutline className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Connection Error</h3>
                    <p className="text-slate-300 text-sm mb-6">{error}</p>
                    <button
                        onClick={onEndCall}
                        className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    // Check if App ID is missing
    if (!appId) {
        return (
            <div className="fixed inset-0 z-[100] bg-slate-950/90 flex items-center justify-center p-4">
                <div className="bg-slate-900 border border-blue-500/50 rounded-2xl p-6 max-w-md w-full text-center shadow-2xl">
                    <h3 className="text-xl font-bold text-white mb-2">Missing App ID</h3>
                    <p className="text-slate-300 text-sm mb-6">Please add VITE_AGORA_APP_ID to your .env file.</p>
                    <button onClick={onEndCall} className="px-6 py-2 bg-slate-700 text-white rounded-lg">Close</button>
                </div>
            </div>
        );
    }

    // If call type is AUDIO (online), just show Audio UI
    // If call type is VIDEO (video_call), show Video UI

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-10 flex justify-between items-center text-white">
                <div className="flex items-center gap-2">
                    <div className="bg-primary/20 p-2 rounded-lg backdrop-blur-sm">
                        {callType === "video" ? <IoVideocamOutline /> : <IoCallOutline />}
                    </div>
                    <span className="font-semibold text-lg drop-shadow-md">
                        {callType === "video" ? "Video Consultation" : "Audio Consultation"}
                    </span>
                </div>
                <div className="px-3 py-1 rounded-full bg-black/30 backdrop-blur-sm text-xs font-mono">
                    {isConnected ? "Connected" : isJoining ? "Connecting..." : "Disconnected"}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 relative overflow-hidden">
                {/* Remote Users (Grid) */}
                {remoteUsers.length > 0 ? (
                    <div className={`grid h-full ${remoteUsers.length > 1 ? "grid-cols-2" : "grid-cols-1"} gap-4 p-4`}>
                        {remoteUsers.map((user) => (
                            <div key={user.uid} className="relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl w-full h-full">
                                <RemoteUser user={user} className="w-full h-full object-cover" />
                                <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm backdrop-blur-md">
                                    {user.uid} (Remote)
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center text-white/50 flex-col gap-4">
                        <div className="w-24 h-24 rounded-full bg-slate-800 flex items-center justify-center animate-pulse">
                            <IoPersonOutline className="w-10 h-10" />
                        </div>
                        <p>Waiting for others to join...</p>
                    </div>
                )}

                {/* Local User (Floating or Grid) */}
                {/* If remote users exist, float local user. If alone, show full screen. */}
                <div className={`
          ${remoteUsers.length > 0
                        ? "absolute bottom-24 right-4 w-48 h-36 rounded-xl border-2 border-primary shadow-2xl z-20"
                        : "absolute inset-0 z-0 opacity-20" /* Background effect when alone */}
          transition-all duration-300 overflow-hidden bg-slate-800
        `}>
                    <LocalUser
                        audioTrack={localMicrophoneTrack}
                        cameraTrack={localCameraTrack}
                        videoOn={callType === "video"}
                        micOn={true}
                        playAudio={false} // Don't play local audio
                        className="w-full h-full object-cover"
                    />
                    {remoteUsers.length > 0 && (
                        <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-0.5 rounded text-white text-xs backdrop-blur-md">
                            You
                        </div>
                    )}
                </div>
            </div>

            {/* Controls */}
            <CallControls
                localMicTrack={localMicrophoneTrack}
                localCameraTrack={localCameraTrack}
                callType={callType}
                onEndCall={onEndCall}
            />
        </div>
    );
};

// Helper Icon for placeholder
function IoPersonOutline({ className }) {
    return (
        <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 512 512" strokeLinecap="round" strokeLinejoin="round" className={className} height="1em" width="1em" xmlns="http://www.w3.org/2000/svg"><path d="M344 144c-3.92 52.87-44 96-88 96s-84.15-43.12-88-91.05C164.15 94.75 204 56 256 56s91.85 38.75 88 88zM256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304z"></path></svg>
    )
}

export default function VideoCall({
    appId = APP_ID,
    channelName,
    token = null,
    callType = "video",
    onEndCall
}) {
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

    // Debug Channel Name matching
    useEffect(() => {
        console.log("📞 Joining Video Call:", {
            appId,
            channelName,
            token: token ? "Present" : "Null (Testing Mode)",
            type: callType
        });
    }, [channelName, appId, callType]);
    return (
        <AgoraRTCProvider client={client}>
            <VideoCallInterface
                appId={appId}
                channelName={channelName}
                token={token}
                callType={callType}
                onEndCall={onEndCall}
            />
        </AgoraRTCProvider>
    );
}
