import React from 'react';
import { Label } from '@/components/ui/label';
import { BookOpen, Monitor } from 'lucide-react';

/**
 * Pre-stream setup toggles for Bible mode and screen sharing
 */
export default function BibleSetupToggle({
  enableBibleMode,
  onBibleModeChange,
  enableScreenShare,
  onScreenShareChange
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
        onClick={() => onBibleModeChange(!enableBibleMode)}>
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <Label className="cursor-pointer text-sm font-medium">Enable Bible Mode</Label>
        </div>
        <input
          type="checkbox"
          checked={enableBibleMode}
          onChange={() => {}}
          className="w-4 h-4 rounded"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-gray-700 bg-gray-800/50 hover:bg-gray-800 transition-colors cursor-pointer"
        onClick={() => onScreenShareChange(!enableScreenShare)}>
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-green-400" />
          <Label className="cursor-pointer text-sm font-medium">Enable Screen Share</Label>
        </div>
        <input
          type="checkbox"
          checked={enableScreenShare}
          onChange={() => {}}
          className="w-4 h-4 rounded"
        />
      </div>

      <p className="text-xs text-gray-400">You can toggle these during your stream too.</p>
    </div>
  );
}