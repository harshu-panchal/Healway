/**
 * Call Service Utility
 * Helper functions for managing audio calls
 */

/**
 * Get callId from URL search params
 */
export const getCallIdFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get('callId');
};

/**
 * Start a call (opens call UI in same window as overlay)
 * This function should be called with the CallContext's startCall function
 * @param {Function} startCall - The startCall function from CallContext
 * @param {string} callId - The call ID
 * @param {string} remoteParticipant - Name of the remote participant (optional)
 */
export const openCallPopup = (startCall, callId, remoteParticipant = 'Participant') => {
  if (!startCall || typeof startCall !== 'function') {
    throw new Error('startCall function is required. Use useCall() hook to get it.');
  }
  if (!callId) {
    throw new Error('callId is required');
  }
  
  console.log('📞 [callService] Starting call:', { callId, remoteParticipant });
  startCall(callId, remoteParticipant);
};

/**
 * Format call duration in seconds to MM:SS format
 */
export const formatCallDuration = (seconds) => {
  if (!seconds || seconds < 0) return '00:00';
  
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};

/**
 * Check if browser supports WebRTC
 */
export const isWebRTCSupported = () => {
  return !!(
    navigator.mediaDevices &&
    navigator.mediaDevices.getUserMedia &&
    window.RTCPeerConnection
  );
};

/**
 * Request microphone permission
 */
export const requestMicrophonePermission = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately - we just wanted to check permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error('Microphone permission denied:', error);
    return false;
  }
};

export default {
  getCallIdFromUrl,
  openCallPopup,
  formatCallDuration,
  isWebRTCSupported,
  requestMicrophonePermission,
};

