import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Send, Loader2, Paperclip, X, Image as ImageIcon,
  Reply, Trash2, MessageSquare, ChevronDown,
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import GroupChatHeader from './GroupChatHeader';
import { sendPushNotification } from '@/lib/usePushNotifications';
import { notifyMessageSent, markChatNotificationsRead } from '@/lib/notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMsgTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Yesterday ${format(d, 'HH:mm')}`;
  return format(d, 'dd MMM, HH:mm');
}

function DateDivider({ date }) {
  const d = new Date(date);
  const label = isToday(d) ? 'Today' : isYesterday(d) ? 'Yesterday' : format(d, 'EEEE, d MMMM');
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-border" />
      <span className="text-[11px] font-medium text-muted-foreground bg-background px-2">{label}</span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

const MessageBubble = ({ message, isOwn, sender, onReply, onDelete, members }) => {
  const [showActions, setShowActions] = useState(false);

  const replyToSender = message.reply_to_sender
    ? members?.find(m => m.email === message.reply_to_sender)?.full_name || message.reply_to_sender?.split('@')[0]
    : null;

  return (
    <div
      className={`flex gap-2 group ${isOwn ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar (others only) */}
      {!isOwn && (
        <Avatar className="w-7 h-7 flex-shrink-0 mt-1">
          <AvatarImage src={sender?.avatar_url} />
          <AvatarFallback className="text-[10px]">{sender?.full_name?.charAt(0) || '?'}</AvatarFallback>
        </Avatar>
      )}

      <div className={`max-w-[85%] sm:max-w-[75%] md:max-w-[65%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
        {/* Sender name (others, group only) */}
        {!isOwn && sender && (
          <p className="text-[11px] font-semibold text-muted-foreground mb-1 px-1">{sender.full_name}</p>
        )}

        {/* Bubble */}
        <div
          className={`relative rounded-2xl px-3 py-2 shadow-sm ${
            isOwn
              ? 'bg-primary text-primary-foreground rounded-tr-sm'
              : 'bg-muted dark:bg-muted/80 rounded-tl-sm'
          }`}
        >
          {/* Reply quote */}
          {message.reply_to_content && (
            <div className={`mb-2 pl-2 border-l-2 ${isOwn ? 'border-white/50' : 'border-primary'}`}>
              {replyToSender && (
                <p className={`text-[10px] font-semibold mb-0.5 ${isOwn ? 'text-white/70' : 'text-primary'}`}>
                  {replyToSender}
                </p>
              )}
              <p className={`text-xs opacity-70 truncate`}>{message.reply_to_content}</p>
            </div>
          )}

          {/* Image attachment */}
          {message.file_url && (
            <img
              src={message.file_url}
              alt="attachment"
              className="max-w-full rounded-xl mb-1.5 max-h-56 object-cover cursor-pointer"
              onClick={() => window.open(message.file_url, '_blank')}
            />
          )}

          {/* Text */}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
          )}

          {/* Timestamp inside bubble */}
          <p className={`text-[10px] mt-1 text-right ${isOwn ? 'text-white/60' : 'text-muted-foreground'}`}>
            {formatMsgTime(message.created_date)}
          </p>
        </div>
      </div>

      {/* Action buttons (hover) */}
      <div className={`flex flex-col justify-end gap-1 transition-opacity ${showActions ? 'opacity-100' : 'opacity-0'} ${isOwn ? 'mr-1' : 'ml-1'}`}>
        <button
          className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-muted shadow-sm"
          onClick={() => onReply(message, sender)}
          title="Reply"
        >
          <Reply className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
        {isOwn && (
          <button
            className="w-7 h-7 rounded-full bg-background border border-border flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm"
            onClick={() => onDelete(message.id)}
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        )}
      </div>
    </div>
  );
};

// ─── ChatWindow ───────────────────────────────────────────────────────────────

export default function ChatWindow({ group, me, userMap = {}, onBack, onSelect }) {
  const queryClient = useQueryClient();
  const messagesEndRef = useRef(null);
  const scrollRef = useRef(null);
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [replyTo, setReplyTo] = useState(null); // { id, content, senderName, senderEmail }
  const [atBottom, setAtBottom] = useState(true);

  const isPendingDm = group?.type === 'dm' && group?.dm_status === 'pending';
  const isRequester = isPendingDm && group?.dm_initiator === me?.email;
  const isRecipient = isPendingDm && group?.dm_initiator !== me?.email;

  const acceptMutation = useMutation({
    mutationFn: () => base44.entities.Group.update(group.id, { dm_status: 'accepted' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat_groups'] }),
  });

  const declineMutation = useMutation({
    mutationFn: () => base44.entities.Group.delete(group.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['chat_groups'] }),
  });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['messages', group?.id],
    queryFn: () => base44.entities.Message.filter({ group_id: group.id }, 'created_date', 100),
    enabled: !!group?.id && !group._isSearchResult,
    refetchInterval: 3000,
  });

  const { data: membersRaw = [] } = useQuery({
    queryKey: ['groupMembers', group?.id],
    queryFn: () => base44.entities.User.filter({ email: { '$in': group.members } }),
    enabled: !!group?.members?.length,
  });

  const memberMap = useMemo(() => {
    const map = {};
    membersRaw.forEach(m => { map[m.email] = m; });
    return { ...userMap, ...map };
  }, [membersRaw, userMap]);

  // Mark notifications as read when this conversation is opened
  useEffect(() => {
    if (me?.email && group?.id) {
      markChatNotificationsRead(me.email, group.id);
    }
  }, [me?.email, group?.id]);

  // Group messages by date
  const messagesByDate = useMemo(() => {
    const groups = [];
    let currentDate = null;
    messages.forEach(msg => {
      const msgDate = msg.created_date?.split('T')[0];
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ type: 'divider', date: msg.created_date, key: `divider-${msgDate}` });
      }
      groups.push({ type: 'message', data: msg, key: msg.id });
    });
    return groups;
  }, [messages]);

  // Scroll tracking
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAtBottom(distFromBottom < 60);
  }, []);

  useEffect(() => {
    if (atBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, atBottom]);

  // Real-time subscription
  useEffect(() => {
    if (!group?.id || !me?.email) return;
    const unsub = base44.entities.Message.subscribe((event) => {
      if (event.type !== 'create') return;
      const msg = event.data;
      if (msg.group_id !== group.id || msg.created_by === me.email) return;
      const senderName = memberMap[msg.created_by]?.full_name || 'Someone';
      const label = group.type === 'dm' ? senderName : group.name;
      sendPushNotification({
        title: label,
        body: msg.content?.slice(0, 100) || '📎 Attachment',
        tag: `chat-${group.id}`,
        url: '/Chat',
      });
      queryClient.invalidateQueries({ queryKey: ['messages', group.id] });
    });
    return () => unsub();
  }, [group?.id, me?.email, memberMap, queryClient, group?.name, group?.type]);

  // Send message
  const sendMutation = useMutation({
    mutationFn: (data) => base44.entities.Message.create(data),
    onMutate: async (newMsg) => {
      await queryClient.cancelQueries({ queryKey: ['messages', group?.id] });
      const previous = queryClient.getQueryData(['messages', group?.id]);
      const optimistic = {
        id: `opt-${Date.now()}`,
        content: newMsg.content,
        group_id: newMsg.group_id,
        file_url: newMsg.file_url,
        reply_to_id: newMsg.reply_to_id,
        reply_to_content: newMsg.reply_to_content,
        reply_to_sender: newMsg.reply_to_sender,
        created_by: me?.email,
        created_date: new Date().toISOString(),
        _optimistic: true,
      };
      queryClient.setQueryData(['messages', group?.id], (old = []) => [...old, optimistic]);
      setContent('');
      setFile(null);
      setReplyTo(null);
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['messages', group?.id], ctx.previous);
    },
    onSuccess: (savedMessage) => {
      if (me && group) {
        notifyMessageSent({ sender: me, group, message: savedMessage });
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['messages', group?.id] }),
  });

  // Delete message
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Message.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['messages', group?.id] });
      const previous = queryClient.getQueryData(['messages', group?.id]);
      queryClient.setQueryData(['messages', group?.id], (old = []) => old.filter(m => m.id !== id));
      return { previous };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['messages', group?.id], ctx.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['messages', group?.id] }),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && !file) return;
    if (group._isSearchResult) return;

    let file_url = null;
    if (file) {
      setIsUploading(true);
      try {
        const res = await base44.integrations.Core.UploadFile({ file });
        file_url = res.file_url;
      } catch (err) {
        console.error('Upload failed', err);
      }
      setIsUploading(false);
    }

    sendMutation.mutate({
      content: content.trim(),
      group_id: group.id,
      file_url,
      ...(replyTo ? {
        reply_to_id: replyTo.id,
        reply_to_content: replyTo.content,
        reply_to_sender: replyTo.senderEmail,
      } : {}),
    });
  };

  const handleReply = (message, sender) => {
    setReplyTo({
      id: message.id,
      content: message.content || '📎 Attachment',
      senderName: sender?.full_name || message.created_by?.split('@')[0] || 'Unknown',
      senderEmail: message.created_by,
    });
  };

  // ── No group selected ──────────────────────────────────────────────────────

  if (!group) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3 h-full">
        <MessageSquare className="w-16 h-16 opacity-20" />
        <p className="text-base font-medium">Select a conversation</p>
        <p className="text-sm opacity-60">Choose from your chats on the left</p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <GroupChatHeader
        group={group}
        me={me}
        memberMap={memberMap}
        onBack={onBack}
      />

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-2 space-y-1"
        onScroll={handleScroll}
      >
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <MessageSquare className="w-10 h-10 opacity-20" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs opacity-60">Say hello! 👋</p>
          </div>
        ) : (
          messagesByDate.map(item =>
            item.type === 'divider'
              ? <DateDivider key={item.key} date={item.date} />
              : <MessageBubble
                  key={item.key}
                  message={item.data}
                  isOwn={item.data.created_by === me?.email}
                  sender={memberMap[item.data.created_by]}
                  members={membersRaw}
                  onReply={handleReply}
                  onDelete={(id) => deleteMutation.mutate(id)}
                />
          )
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      {!atBottom && (
        <button
          className="sticky bottom-20 sm:bottom-16 ml-auto mr-3 -mt-11 z-10 bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center shadow-lg flex-shrink-0"
          onClick={() => { setAtBottom(true); messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      )}

      {/* Message Request Banner */}
      {isRecipient && (
        <div className="p-4 border-t bg-amber-50 dark:bg-amber-950/20">
          <p className="text-sm font-semibold mb-1">Message Request</p>
          <p className="text-xs text-muted-foreground mb-3">Accept to reply and connect with this person.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => acceptMutation.mutate()} disabled={acceptMutation.isPending}>Accept</Button>
            <Button size="sm" variant="outline" onClick={() => declineMutation.mutate()} disabled={declineMutation.isPending}>Decline</Button>
          </div>
        </div>
      )}
      {isRequester && (
        <div className="p-3 border-t bg-muted/30 text-center">
          <p className="text-xs text-muted-foreground">Message request pending — waiting for the other person to accept.</p>
        </div>
      )}

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-3 px-4 py-2 border-t bg-muted/40">
          <div className="flex-1 min-w-0 pl-2 border-l-2 border-primary">
            <p className="text-xs font-semibold text-primary mb-0.5">{replyTo.senderName}</p>
            <p className="text-xs text-muted-foreground truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="flex-shrink-0 p-1 hover:bg-muted rounded-full">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Input */}
      {!isPendingDm && (
        <form onSubmit={handleSubmit} className="px-3 py-2.5 border-t bg-background">
          {file && (
            <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-muted rounded-lg text-sm">
              <ImageIcon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 truncate text-xs">{file.name}</span>
              <button type="button" onClick={() => setFile(null)}><X className="w-4 h-4" /></button>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="flex-shrink-0 cursor-pointer">
              <input type="file" className="hidden" accept="image/*,video/*,.pdf,.doc,.docx" onChange={(e) => setFile(e.target.files[0])} />
              <div className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </div>
            </label>
            <Input
              placeholder="Message..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
              }}
              className="flex-1 rounded-2xl bg-muted border-0 focus-visible:ring-1"
            />
            <Button
              type="submit"
              size="icon"
              className="rounded-full w-9 h-9 flex-shrink-0"
              disabled={sendMutation.isPending || isUploading || (!content.trim() && !file)}
            >
              {(sendMutation.isPending || isUploading)
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
