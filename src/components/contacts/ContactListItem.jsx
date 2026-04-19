import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Phone, Video } from 'lucide-react';
import UserActionSheet from './UserActionSheet';

export default function ContactListItem({
  user,
  lastMessage,
  unreadCount = 0,
  badge,
  onMessage,
  onAudioCall,
  onVideoCall,
  onViewProfile,
}) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <div
        className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-accent/50 active:bg-accent/70 transition-colors cursor-pointer select-none"
        onClick={() => setSheetOpen(true)}
      >
        {/* Avatar with online dot */}
        <div className="relative flex-shrink-0">
          <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
            <AvatarImage src={user.avatar_url} alt={user.full_name} />
            <AvatarFallback className="font-semibold">{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          {user.status === 'online' && (
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
          )}
        </div>

        {/* Name + last message */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-semibold text-sm truncate">{user.full_name}</span>
            {badge === 'mutual' && (
              <span className="text-[10px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full flex-shrink-0 font-medium">
                Mutual
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate leading-tight">
            {lastMessage || (user.status === 'online' ? '🟢 Online' : user.email)}
          </p>
        </div>

        {/* Right: unread + action buttons */}
        <div
          className="flex items-center gap-1 flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 mr-1">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all"
            onClick={() => onVideoCall(user)}
            title="Video Call"
          >
            <Video className="w-4 h-4 text-green-500" />
          </button>
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-purple-100 dark:hover:bg-purple-900/30 active:scale-95 transition-all"
            onClick={() => onAudioCall(user)}
            title="Audio Call"
          >
            <Phone className="w-4 h-4 text-purple-500" />
          </button>
        </div>
      </div>

      <UserActionSheet
        user={user}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onMessage={onMessage}
        onVideoCall={onVideoCall}
        onAudioCall={onAudioCall}
        onViewProfile={onViewProfile}
      />
    </>
  );
}
