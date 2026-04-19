import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, AlertCircle } from 'lucide-react';

/**
 * Screen sharing controls for live streaming
 * Handles web screen share via browser API
 */
export default function LiveScreenShare({
  onStartShare,
  onStopShare,
  isSharing,
  videoRef,
  streamRef
}) {
  const [error, setError] = useState(null);

  const handleShareScreen = async () => {
    try {
      setError(null);
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false
      });

      // Store the screen stream
      const videoTrack = screenStream.getVideoTracks()[0];
      
      // Switch video source
      if (videoRef?.current) {
        videoRef.current.srcObject = screenStream;
      }
      if (streamRef?.current) {
        const currentVideoTrack = streamRef.current.getVideoTracks()[0];
        if (currentVideoTrack) currentVideoTrack.stop();
        streamRef.current.removeTrack(currentVideoTrack);
        streamRef.current.addTrack(videoTrack);
      }

      // Listen for user stopping screen share
      videoTrack.onended = () => {
        handleStopShare();
      };

      onStartShare?.();
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError('Failed to share screen. Try again.');
      }
    }
  };

  const handleStopShare = async () => {
    try {
      // Get camera stream back
      const cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      if (videoRef?.current) {
        videoRef.current.srcObject = cameraStream;
      }
      if (streamRef?.current) {
        const screenVideoTrack = streamRef.current.getVideoTracks()[0];
        if (screenVideoTrack) screenVideoTrack.stop();
        streamRef.current.removeTrack(screenVideoTrack);
        const cameraVideoTrack = cameraStream.getVideoTracks()[0];
        streamRef.current.addTrack(cameraVideoTrack);
      }

      onStopShare?.();
    } catch (err) {
      setError('Failed to switch back to camera');
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={isSharing ? handleStopShare : handleShareScreen}
        className={`w-full text-sm gap-2 ${
          isSharing
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        <Monitor className="w-4 h-4" />
        {isSharing ? 'Stop Sharing' : 'Share Screen'}
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}