import { useState, useCallback, useRef } from 'react';

/**
 * Hook to manage screen sharing in calls with admin controls for group calls
 * Handles:
 * - Screen share requests/approval
 * - Admin-only vs everyone modes
 * - One-at-a-time locking
 * - Permissions based on call type and user role
 */
export function useCallScreenShare(callType = 'dm', isAdmin = false, participants = []) {
  const [activeScreenSharer, setActiveScreenSharer] = useState(null);
  const [screenShareMode, setScreenShareMode] = useState('everyone'); // 'admin-only' or 'everyone'
  const [screenshareRequests, setScreenShareRequests] = useState({});
  const screenStreamRef = useRef(null);

  // Check if user can share screen
  const canShare = useCallback(() => {
    if (callType === 'dm') return true; // Both can share in 1-on-1
    if (screenShareMode === 'admin-only') return isAdmin;
    if (activeScreenSharer) return false; // Someone already sharing
    return true;
  }, [callType, screenShareMode, isAdmin, activeScreenSharer]);

  // Get reason why user can't share (for UI messages)
  const getShareRestrictionReason = useCallback(() => {
    if (callType === 'dm') return null;
    if (screenShareMode === 'admin-only' && !isAdmin) {
      return 'Only group admin can share screen';
    }
    if (activeScreenSharer) {
      return 'Screen is currently being shared by another user';
    }
    return null;
  }, [callType, screenShareMode, isAdmin, activeScreenSharer]);

  // Start screen share
  const startScreenShare = useCallback(async () => {
    if (!canShare()) return false;

    if (callType === 'dm') {
      // Direct screen share for 1-on-1
      setActiveScreenSharer('self');
      return true;
    }

    if (screenShareMode === 'everyone' && !activeScreenSharer) {
      setActiveScreenSharer('self');
      return true;
    }

    return false;
  }, [canShare, callType, screenShareMode, activeScreenSharer]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
    }
    setActiveScreenSharer(null);
  }, []);

  // Request screen share (for "one at a time" mode with approval)
  const requestScreenShare = useCallback((userId) => {
    if (screenShareMode === 'everyone' && !activeScreenSharer) {
      setActiveScreenSharer(userId);
      return true;
    }
    // Add to pending requests if someone is already sharing
    setScreenShareRequests(prev => ({
      ...prev,
      [userId]: { timestamp: Date.now(), status: 'pending' }
    }));
    return false;
  }, [screenShareMode, activeScreenSharer]);

  // Admin approve screen share request
  const approveScreenShareRequest = useCallback((userId) => {
    setScreenShareRequests(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
    setActiveScreenSharer(userId);
  }, []);

  // Admin deny screen share request
  const denyScreenShareRequest = useCallback((userId) => {
    setScreenShareRequests(prev => {
      const updated = { ...prev };
      delete updated[userId];
      return updated;
    });
  }, []);

  // Admin force stop someone's screen share
  const forceStopScreenShare = useCallback((userId) => {
    if (activeScreenSharer === userId) {
      stopScreenShare();
    }
  }, [activeScreenSharer, stopScreenShare]);

  // Change screen share mode (admin only)
  const changeScreenShareMode = useCallback((mode) => {
    if (isAdmin && (mode === 'admin-only' || mode === 'everyone')) {
      setScreenShareMode(mode);
      // Clear requests and active share when changing modes
      setScreenShareRequests({});
      if (mode === 'admin-only' && activeScreenSharer && activeScreenSharer !== 'self') {
        setActiveScreenSharer(null);
      }
    }
  }, [isAdmin, activeScreenSharer]);

  return {
    // State
    activeScreenSharer,
    screenShareMode,
    screenshareRequests,
    
    // Actions
    startScreenShare,
    stopScreenShare,
    requestScreenShare,
    approveScreenShareRequest,
    denyScreenShareRequest,
    forceStopScreenShare,
    changeScreenShareMode,
    
    // Info
    canShare,
    getShareRestrictionReason,
  };
}