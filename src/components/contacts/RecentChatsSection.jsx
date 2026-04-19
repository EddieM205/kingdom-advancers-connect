import React from 'react';
import { Loader2, MessageSquare } from 'lucide-react';
import ContactListItem from './ContactListItem';

export default function RecentChatsSection({
  isLoading,
  recentChats,
  onMessage,
  onAudioCall,
  onVideoCall,
  onViewProfile
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!recentChats || recentChats.length === 0) {
    return null;
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-3 py-3 mb-2">
        <MessageSquare className="w-4 h-4 inline mr-2" />
        Recent Chats
      </h2>
      <div className="space-y-1 bg-card rounded-lg border border-border p-2">
        {recentChats.map(item => (
          <ContactListItem
            key={item.user.id}
            user={item.user}
            lastMessage={item.lastMessage}
            unreadCount={item.unreadCount}
            onMessage={onMessage}
            onAudioCall={onAudioCall}
            onVideoCall={onVideoCall}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>
    </div>
  );
}