import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { X, Share2, Copy, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

export default function VerseSharePanel({
  verse,
  onClose,
  onShare,
  isLoading = false
}) {
  const [copied, setCopied] = useState(false);

  if (!verse) return null;

  const handleCopyVerse = () => {
    const text = `${verse.reference}\n\n${verse.text}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    onShare(verse);
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-40 flex items-end sm:items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl max-w-md w-full animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-400" />
            Share Verse
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Verse Display */}
        <div className="p-4 space-y-3">
          <div className="bg-gray-800 rounded-lg p-3 space-y-2">
            <p className="text-blue-400 font-semibold text-sm">{verse.reference}</p>
            <p className="text-white text-sm leading-relaxed">{verse.text}</p>
          </div>

          <div className="text-gray-400 text-xs">
            {verse.version && <p>Version: {verse.version}</p>}
            {verse.theme && <p>Theme: {verse.theme}</p>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-gray-800">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyVerse}
            className="flex-1 text-xs border-gray-700 hover:bg-gray-800"
          >
            <Copy className="w-3 h-3 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isLoading}
            className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <>
                <Share2 className="w-3 h-3 mr-1" />
                Share with Call
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}