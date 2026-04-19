import React from 'react';
import { Play, Pause, SkipBack, SkipForward, X, Volume2 } from 'lucide-react';

export default function AudioMiniPlayer({ isPlaying, onTogglePlay, onSkipBack, onSkipForward, onClose, currentTime, duration, book, chapter }) {
  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="fixed bottom-20 left-0 right-0 bg-gradient-to-t from-gray-900 via-gray-900 to-gray-900/95 border-t border-gray-800 px-4 py-3 z-40">
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Progress bar */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <div className="text-sm">
              <p className="font-semibold text-white">{book} {chapter}</p>
              <p className="text-xs text-gray-400">Playing audio</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onSkipBack}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              onClick={onTogglePlay}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current" />
              )}
            </button>
            <button
              onClick={onSkipForward}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}