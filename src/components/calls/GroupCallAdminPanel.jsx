import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Monitor, AlertCircle, User, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/**
 * Admin panel for managing group call settings
 * - Screen share mode toggle
 * - Force stop screen share
 * - Participant management
 */
export default function GroupCallAdminPanel({
  participants = [],
  activeScreenSharer,
  screenShareMode,
  screenshareRequests = {},
  onChangeScreenShareMode,
  onForceStopScreenShare,
  onApproveScreenShare,
  onDenyScreenShare
}) {
  return (
    <div className="space-y-4">
      {/* Screen Share Settings */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-white">
            <Monitor className="w-4 h-4" />
            Screen Share Control
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Mode */}
          <div className="p-2 bg-gray-900/50 rounded border border-gray-700">
            <p className="text-xs text-gray-400 mb-1">Current Mode</p>
            <p className="text-sm font-semibold text-white">
              {screenShareMode === 'admin-only' ? '🔒 Admin Only' : '👥 Everyone (One at a time)'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={screenShareMode === 'everyone' ? 'default' : 'outline'}
              onClick={() => onChangeScreenShareMode('everyone')}
              className="flex-1 text-xs h-8"
            >
              Everyone
            </Button>
            <Button
              size="sm"
              variant={screenShareMode === 'admin-only' ? 'default' : 'outline'}
              onClick={() => onChangeScreenShareMode('admin-only')}
              className="flex-1 text-xs h-8"
            >
              Admin Only
            </Button>
          </div>

          {/* Active Screen Share */}
          {activeScreenSharer && (
            <div className="p-2 bg-blue-900/20 border border-blue-700/40 rounded space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-blue-300">
                  <span className="font-semibold">Currently Sharing:</span> {activeScreenSharer === 'self' ? 'You' : activeScreenSharer}
                </p>
                {activeScreenSharer !== 'self' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onForceStopScreenShare(activeScreenSharer)}
                    className="h-6 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Screen Share Requests */}
          {Object.keys(screenshareRequests).length > 0 && (
            <div className="space-y-2 p-2 bg-yellow-900/20 border border-yellow-700/40 rounded">
              <p className="text-xs text-yellow-300 font-semibold">
                Screen Share Requests ({Object.keys(screenshareRequests).length})
              </p>
              {Object.entries(screenshareRequests).map(([userId, req]) => (
                <div key={userId} className="flex items-center justify-between gap-2 p-1 bg-gray-900/50 rounded">
                  <span className="text-xs text-white">{userId}</span>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      onClick={() => onApproveScreenShare(userId)}
                      className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                    >
                      Allow
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onDenyScreenShare(userId)}
                      className="h-6 px-2 text-xs border-gray-600 hover:bg-gray-700"
                    >
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      {participants.length > 0 && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-white">Participants ({participants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center gap-2 text-xs text-gray-300 p-1 rounded hover:bg-gray-700/50">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{p.full_name || p.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}