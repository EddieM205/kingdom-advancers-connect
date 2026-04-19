import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, MessageSquare, UserPlus, UserCheck, Heart,
  MessageCircle, AtSign, Swords, Users, UserMinus,
  Phone, CheckCheck, Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { detectNotifType, NOTIF_TYPES } from '@/lib/notifications';

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_CONFIG = {
  [NOTIF_TYPES.MESSAGE]:       { icon: MessageSquare,  color: 'bg-blue-500',    label: 'Messages' },
  [NOTIF_TYPES.FOLLOW]:        { icon: UserPlus,        color: 'bg-green-500',   label: 'Follows' },
  [NOTIF_TYPES.FOLLOW_REQ]:    { icon: UserPlus,        color: 'bg-amber-500',   label: 'Follows' },
  [NOTIF_TYPES.FOLLOW_ACCEPT]: { icon: UserCheck,       color: 'bg-green-600',   label: 'Follows' },
  [NOTIF_TYPES.REACTION]:      { icon: Heart,           color: 'bg-rose-500',    label: 'Social' },
  [NOTIF_TYPES.COMMENT]:       { icon: MessageCircle,   color: 'bg-indigo-500',  label: 'Social' },
  [NOTIF_TYPES.MENTION]:       { icon: AtSign,          color: 'bg-purple-500',  label: 'Social' },
  [NOTIF_TYPES.CHALLENGE]:     { icon: Swords,          color: 'bg-orange-500',  label: 'Social' },
  [NOTIF_TYPES.GROUP_INVITE]:  { icon: Users,           color: 'bg-teal-500',    label: 'Social' },
  [NOTIF_TYPES.GROUP_REMOVE]:  { icon: UserMinus,       color: 'bg-red-500',     label: 'Social' },
  [NOTIF_TYPES.CALL]:          { icon: Phone,           color: 'bg-emerald-500', label: 'Other' },
  [NOTIF_TYPES.GENERAL]:       { icon: Bell,            color: 'bg-gray-500',    label: 'Other' },
};

function getConfig(notif) {
  const type = detectNotifType(notif);
  return TYPE_CONFIG[type] || TYPE_CONFIG[NOTIF_TYPES.GENERAL];
}

// ─── NotificationItem ─────────────────────────────────────────────────────────

const NotificationItem = ({ notif, onMarkRead }) => {
  const navigate = useNavigate();
  const cfg = getConfig(notif);
  const Icon = cfg.icon;

  const handleClick = () => {
    if (!notif.is_read) onMarkRead(notif.id);
    if (notif.link && notif.link !== '/') navigate(notif.link);
  };

  return (
    <div
      onClick={handleClick}
      className={`flex gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
        notif.is_read ? 'hover:bg-muted/50' : 'bg-primary/5 hover:bg-primary/10'
      }`}
    >
      {/* Avatar with type icon badge */}
      <div className="relative flex-shrink-0">
        <Avatar className="w-10 h-10">
          <AvatarImage src={notif.sender_avatar} />
          <AvatarFallback className="text-xs">{notif.content?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 p-1 rounded-full ${cfg.color}`}>
          <Icon className="w-2.5 h-2.5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notif.is_read ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
          {notif.content}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatDistanceToNow(new Date(notif.created_date), { addSuffix: true })}
        </p>
      </div>

      {/* Unread dot */}
      {!notif.is_read && (
        <div className="flex-shrink-0 mt-1.5">
          <span className="block w-2 h-2 rounded-full bg-primary" />
        </div>
      )}
    </div>
  );
};

// ─── ActivityPage (Notification Centre) ──────────────────────────────────────

export default function ActivityPage() {
  const [tab, setTab] = useState('all');
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['all_notifications', me?.email],
    queryFn: () =>
      base44.entities.Notification.filter(
        { recipient_id: me.email },
        '-created_date',
        100
      ).then(items => items.filter(n => !n.content?.startsWith('__CALL__:'))),
    enabled: !!me,
    refetchInterval: 15000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id) => base44.entities.Notification.update(id, { is_read: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['all_notifications', me?.email] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const unread = notifications.filter(n => !n.is_read);
      await Promise.allSettled(
        unread.map(n => base44.entities.Notification.update(n.id, { is_read: true }))
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all_notifications', me?.email] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const filtered = useMemo(() => {
    if (tab === 'unread') return notifications.filter(n => !n.is_read);
    if (tab === 'messages') return notifications.filter(n => detectNotifType(n) === NOTIF_TYPES.MESSAGE);
    if (tab === 'social') {
      const socialTypes = new Set([NOTIF_TYPES.FOLLOW, NOTIF_TYPES.FOLLOW_REQ, NOTIF_TYPES.FOLLOW_ACCEPT,
        NOTIF_TYPES.REACTION, NOTIF_TYPES.COMMENT, NOTIF_TYPES.MENTION,
        NOTIF_TYPES.CHALLENGE, NOTIF_TYPES.GROUP_INVITE, NOTIF_TYPES.GROUP_REMOVE]);
      return notifications.filter(n => socialTypes.has(detectNotifType(n)));
    }
    return notifications;
  }, [notifications, tab]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Bell className="w-6 h-6 sm:w-8 sm:h-8" />
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">Stay up to date with your community</p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
              className="gap-1.5 text-xs"
            >
              {markAllReadMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <CheckCheck className="w-3.5 h-3.5" />}
              Mark all read
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="mb-4">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              All
              {notifications.length > 0 && (
                <span className="ml-1 text-[10px] bg-muted rounded-full px-1.5">{notifications.length}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs sm:text-sm">
              Unread
              {unreadCount > 0 && (
                <span className="ml-1 text-[10px] bg-primary text-primary-foreground rounded-full px-1.5">{unreadCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs sm:text-sm flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Messages
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs sm:text-sm flex items-center gap-1">
              <Users className="w-3 h-3" /> Social
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notification list */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
              <h3 className="text-lg font-semibold">
                {tab === 'unread' ? 'All caught up!' : 'No notifications yet'}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {tab === 'unread' ? "You have no unread notifications." : "Notifications will appear here."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-2">
              <div className="divide-y divide-border">
                {filtered.map(notif => (
                  <NotificationItem
                    key={notif.id}
                    notif={notif}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
