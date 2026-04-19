import React from 'react';
import { X } from 'lucide-react';

/**
 * Displays a verse overlay for viewers during live stream
 * Only viewers see this, not the host
 */
export default function LiveVerseOverlay({
  verse,
  onDismiss
}) {
  if (!verse) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/40 rounded-2xl shadow-2xl max-w-2xl mx-4 p-8 space-y-4 animate-in fade-in scale-95">
        {/* Close button */}
        <div className="flex justify-end">
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Verse Display */}
        <div className="space-y-3">
          <p className="text-blue-400 font-bold text-xl">{verse.reference}</p>
          <p className="text-white text-lg leading-relaxed">{verse.text}</p>
          {verse.version && (
            <p className="text-gray-400 text-sm">— {verse.version}</p>
          )}
        </div>

        {/* Dismiss hint */}
        <div className="text-center pt-4 border-t border-gray-700">
          <button
            onClick={onDismiss}
            className="text-sm text-blue-400 hover:text-blue-300 font-semibold"
          >
            Dismiss Verse
          </button>
        </div>
      </div>
    </div>
  );
}