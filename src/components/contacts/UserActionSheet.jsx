import React from 'react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Video, Phone, User, X } from 'lucide-react';

export default function UserActionSheet({ user, open, onClose, onMessage, onVideoCall, onAudioCall, onViewProfile }) {
  if (!user) return null;

  const actions = [
    { icon: MessageCircle, label: 'Send Message', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30', onClick: () => { onMessage(user); onClose(); } },
    { icon: Video, label: 'Video Call', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-950/30', onClick: () => { onVideoCall(user); onClose(); } },
    { icon: Phone, label: 'Audio Call', color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/30', onClick: () => { onAudioCall(user); onClose(); } },
    { icon: User, label: 'View Profile', color: 'text-gray-500', bg: 'bg-gray-50 dark:bg-gray-900/30', onClick: () => { onViewProfile(user); onClose(); } },
  ];

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="bottom" className="rounded-t-3xl pb-safe-bottom pb-8 px-0 border-0">
        <div className="flex flex-col items-center pt-3 pb-6 px-6 border-b border-border">
          <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-5" />
          <Avatar className="w-16 h-16 mb-3 ring-2 ring-border">
            <AvatarImage src={user.avatar_url} />
            <AvatarFallback className="text-xl font-bold">{user.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <h3 className="font-bold text-lg leading-tight">{user.full_name}</h3>
          <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
          {user.status === 'online' && (
            <span className="mt-2 flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Online
            </span>
          )}
        </div>
        <div className="px-4 pt-4 space-y-2">
          {actions.map(({ icon: Icon, label, color, bg, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl ${bg} hover:opacity-80 active:scale-[0.98] transition-all text-left`}
            >
              <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm flex-shrink-0">
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <span className="font-semibold text-sm">{label}</span>
            </button>
          ))}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-gray-100 dark:bg-gray-800/80 hover:opacity-80 active:scale-[0.98] transition-all mt-1"
          >
            <X className="w-4 h-4 text-gray-400" />
            <span className="font-semibold text-sm text-gray-400">Cancel</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
