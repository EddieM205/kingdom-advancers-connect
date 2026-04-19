import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

/**
 * Displays a shared verse as an overlay during video calls
 * Stays visible until user dismisses it
 */
export default function SharedVerseOverlay({
  verse,
  onDismiss
}) {
  if (!verse) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm bg-gradient-to-br from-gray-800 to-gray-900 border border-blue-500/30 rounded-xl shadow-2xl p-4 z-40 animate-in slide-in-from-bottom-4">
      {/* Verse Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-blue-400 font-bold text-sm">{verse.reference}</p>
          <button
            onClick={onDismiss}
            className="text-gray-500 hover:text-white flex-shrink-0"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-white text-sm leading-relaxed">{verse.text}</p>
        {verse.version && (
          <p className="text-gray-400 text-xs">— {verse.version}</p>
        )}
      </div>
    </div>
  );
}