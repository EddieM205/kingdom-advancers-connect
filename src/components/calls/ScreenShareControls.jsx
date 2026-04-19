import React from 'react';
import { Button } from '@/components/ui/button';
import { Monitor, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function ScreenShareControls({
  isSharing,
  canShare,
  restrictionReason,
  screenShareMode,
  onStartShare,
  onStopShare,
  isAdmin,
  onChangeMode,
  callType = 'dm'
}) {
  // Don't show mode controls for 1-on-1 calls
  if (callType === 'dm') {
    return (
      <Button
        size="sm"
        variant="ghost"
        className={`text-white text-xs gap-1 ${
          isSharing ? 'bg-blue-600/40' : 'hover:bg-white/10'
        } ${!canShare ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={isSharing ? onStopShare : onStartShare}
        disabled={!canShare && !isSharing}
        title={restrictionReason || (isSharing ? 'Stop sharing' : 'Share screen')}
      >
        <Monitor className="w-4 h-4" />
        {isSharing ? 'Stop Share' : 'Share Screen'}
      </Button>
    );
  }

  // Group call controls with admin options
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="ghost"
        className={`text-white text-xs gap-1 ${
          isSharing ? 'bg-blue-600/40' : 'hover:bg-white/10'
        } ${!canShare && !isSharing ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={isSharing ? onStopShare : onStartShare}
        disabled={!canShare && !isSharing}
        title={restrictionReason || (isSharing ? 'Stop sharing' : 'Share screen')}
      >
        <Monitor className="w-4 h-4" />
        {isSharing ? 'Stop' : 'Share'}
      </Button>

      {/* Admin controls for group calls */}
      {isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="text-white text-xs hover:bg-white/10"
            >
              <span className="text-[10px]">⚙</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700 text-white w-56">
            <DropdownMenuLabel className="text-gray-300">Screen Share Mode</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-700" />
            
            <DropdownMenuItem
              onClick={() => onChangeMode('everyone')}
              className={`text-xs cursor-pointer ${
                screenShareMode === 'everyone' ? 'bg-blue-600/40' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium">Everyone (One at a time)</p>
                  <p className="text-[10px] text-gray-400">Any member can share, but only one at a time</p>
                </div>
                {screenShareMode === 'everyone' && <span className="text-blue-400">✓</span>}
              </div>
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => onChangeMode('admin-only')}
              className={`text-xs cursor-pointer ${
                screenShareMode === 'admin-only' ? 'bg-blue-600/40' : ''
              }`}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="font-medium">Admin Only</p>
                  <p className="text-[10px] text-gray-400">Only group admin can share screen</p>
                </div>
                {screenShareMode === 'admin-only' && <span className="text-blue-400">✓</span>}
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Show restriction reason if can't share */}
      {!canShare && !isSharing && restrictionReason && (
        <div className="flex items-center gap-1 text-yellow-500 text-[10px]" title={restrictionReason}>
          <AlertCircle className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}