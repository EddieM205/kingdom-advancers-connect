import React from 'react';
import { Loader2, Users, ArrowLeftRight, UserPlus, UserCheck } from 'lucide-react';
import ContactListItem from './ContactListItem';

export default function ContactsSection({
  isLoading,
  mutual = [],
  following = [],
  followers = [],
  emptyMessage,
  onMessage,
  onAudioCall,
  onVideoCall,
  onViewProfile,
  // Legacy flat list support (for search results)
  contacts,
  title,
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Legacy flat list mode (used for search results)
  if (contacts !== undefined) {
    if (!contacts || contacts.length === 0) {
      return (
        <div className="text-center py-10 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      );
    }
    return (
      <div>
        {title && (
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2">{title}</h2>
        )}
        <div className="space-y-1 bg-card rounded-xl border border-border overflow-hidden p-1">
          {contacts.map(contact => (
            <ContactListItem
              key={contact.id}
              user={contact}
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

  const allEmpty = mutual.length === 0 && following.length === 0 && followers.length === 0;
  if (allEmpty) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
        <p className="text-sm">{emptyMessage || 'No contacts yet. Follow people to see them here.'}</p>
      </div>
    );
  }

  const sections = [
    { key: 'mutual', label: 'Mutual Connections', Icon: ArrowLeftRight, users: mutual, badge: 'mutual' },
    { key: 'following', label: 'Following', Icon: UserPlus, users: following, badge: 'following' },
    { key: 'followers', label: 'Followers', Icon: UserCheck, users: followers, badge: 'follower' },
  ];

  return (
    <div className="space-y-6">
      {sections.filter(s => s.users.length > 0).map(({ key, label, Icon, users, badge }) => (
        <div key={key}>
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2 flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            {label} <span className="opacity-60">({users.length})</span>
          </h2>
          <div className="space-y-0.5 bg-card rounded-xl border border-border overflow-hidden p-1">
            {users.map(contact => (
              <ContactListItem
                key={contact.id}
                user={contact}
                badge={badge}
                onMessage={onMessage}
                onAudioCall={onAudioCall}
                onVideoCall={onVideoCall}
                onViewProfile={onViewProfile}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
