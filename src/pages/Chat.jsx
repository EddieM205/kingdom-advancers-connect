import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Loader2, Search, Hash, MessageSquare,
  Edit, Users, Check, X, UserPlus,
} from 'lucide-react';
import ChatWindow from '@/components/chat/ChatWindow';
import { isToday, isYesterday, format } from 'date-fns';
import { createNotification, NOTIF_TYPES } from '@/lib/notifications';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatLastTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'dd/MM/yy');
}

const LAST_READ_KEY = 'ka_chat_last_read';

function readLastReadMap() {
  try { return JSON.parse(localStorage.getItem(LAST_READ_KEY) || '{}'); }
  catch { return {}; }
}
function saveLastReadMap(map) {
  try { localStorage.setItem(LAST_READ_KEY, JSON.stringify(map)); } catch {}
}

// ─── ConversationItem ─────────────────────────────────────────────────────────

const ConversationItem = ({ group, lastMessage, unreadCount, isActive, onClick, otherUser, me }) => {
  const displayName = group.type === 'dm'
    ? (otherUser?.full_name || group.name.replace('DM with ', ''))
    : group.name;

  const avatarSrc = group.type === 'dm'
    ? (otherUser?.avatar_url || group.cover_photo_url)
    : group.cover_photo_url;

  let preview = 'No messages yet';
  if (group._isSearchResult) preview = 'Tap to start conversation';
  else if (lastMessage) {
    const isOwn = lastMessage.created_by === me?.email;
    const prefix = isOwn ? 'You: ' : '';
    preview = prefix + (lastMessage.content?.slice(0, 60) || (lastMessage.file_url ? '📎 Attachment' : ''));
  }

  const hasUnread = unreadCount > 0;

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer transition-colors select-none ${
        isActive ? 'bg-primary/10 dark:bg-primary/20' : 'hover:bg-muted/60 active:bg-muted'
      }`}
      onClick={onClick}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
          <AvatarImage src={avatarSrc} className="object-cover" />
          <AvatarFallback className={group.type === 'group' ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600' : 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600'}>
            {group.type === 'dm'
              ? (displayName.charAt(0) || '?').toUpperCase()
              : <Hash className="w-5 h-5" />}
          </AvatarFallback>
        </Avatar>
        {group.type === 'dm' && otherUser?.status === 'online' && (
          <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full" />
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <p className={`text-sm truncate ${hasUnread ? 'font-bold text-foreground' : 'font-semibold'}`}>
            {displayName}
          </p>
          <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-1">
            {lastMessage ? formatLastTime(lastMessage.created_date) : ''}
          </span>
        </div>
        <div className="flex items-center justify-between gap-1">
          <p className={`text-xs truncate ${hasUnread ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
            {preview}
          </p>
          {hasUnread && (
            <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 flex-shrink-0">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChatPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [lastReadMap, setLastReadMap] = useState(readLastReadMap);

  // New DM state
  const [showNewDM, setShowNewDM] = useState(false);
  const [dmSearch, setDmSearch] = useState('');

  // New Group state
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const [searchParams] = useSearchParams();

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: allGroups = [], isLoading } = useQuery({
    queryKey: ['chat_groups'],
    queryFn: () => base44.entities.Group.list(),
    refetchInterval: 8000,
  });

  // Auto-open conversation when navigated from sidebar
  useEffect(() => {
    const groupId = searchParams.get('groupId');
    if (!groupId || !allGroups.length) return;
    const group = allGroups.find(g => g.id === groupId);
    if (group) {
      setActiveGroup(group);
      setShowChat(true);
      markRead(group.id);
    }
  }, [searchParams, allGroups]);

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: recentMessages = [] } = useQuery({
    queryKey: ['recent_messages_chat'],
    queryFn: () => base44.entities.Message.list('-created_date', 300),
    refetchInterval: 4000,
  });

  // ── Computed ─────────────────────────────────────────────────────────────

  const userMap = useMemo(() => {
    const m = {};
    users.forEach(u => { m[u.email] = u; });
    return m;
  }, [users]);

  // Groups the current user belongs to
  const myGroups = useMemo(() =>
    allGroups.filter(g => g.members?.includes(me?.email)),
    [allGroups, me?.email]
  );

  // Last message per group (already sorted by -created_date, so first is latest)
  const lastMessageByGroup = useMemo(() => {
    const map = {};
    recentMessages.forEach(msg => {
      if (!map[msg.group_id]) map[msg.group_id] = msg;
    });
    return map;
  }, [recentMessages]);

  // Unread count per group
  const unreadByGroup = useMemo(() => {
    const counts = {};
    recentMessages.forEach(msg => {
      if (msg.created_by === me?.email) return;
      const lastRead = lastReadMap[msg.group_id] ? new Date(lastReadMap[msg.group_id]) : new Date(0);
      if (new Date(msg.created_date) > lastRead) {
        counts[msg.group_id] = (counts[msg.group_id] || 0) + 1;
      }
    });
    return counts;
  }, [recentMessages, me?.email, lastReadMap]);

  const getOtherUser = useCallback((group) => {
    if (group.type !== 'dm') return null;
    const email = group.members?.find(e => e !== me?.email);
    return email ? userMap[email] : null;
  }, [me?.email, userMap]);

  // Sorted + filtered conversation list
  const sortedGroups = useMemo(() => {
    const filtered = searchTerm
      ? myGroups.filter(g => {
          const name = g.type === 'dm'
            ? (getOtherUser(g)?.full_name || g.name.replace('DM with ', ''))
            : g.name;
          return name.toLowerCase().includes(searchTerm.toLowerCase());
        })
      : myGroups;

    return [...filtered].sort((a, b) => {
      const aTime = lastMessageByGroup[a.id]?.created_date || a.created_date || '';
      const bTime = lastMessageByGroup[b.id]?.created_date || b.created_date || '';
      return bTime.localeCompare(aTime);
    });
  }, [myGroups, searchTerm, lastMessageByGroup, getOtherUser]);

  // Search results for users without existing DMs (shown at bottom of search)
  const searchResultNewUsers = useMemo(() => {
    if (!searchTerm) return [];
    const existingDmEmails = new Set(
      myGroups.filter(g => g.type === 'dm').map(g => g.members?.find(e => e !== me?.email))
    );
    return users.filter(u =>
      u.email !== me?.email &&
      !existingDmEmails.has(u.email) &&
      (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    ).slice(0, 5).map(u => ({
      id: `search_${u.email}`,
      type: 'dm',
      name: `DM with ${u.full_name}`,
      members: [me?.email, u.email],
      cover_photo_url: u.avatar_url,
      _isSearchResult: true,
      _user: u,
    }));
  }, [searchTerm, users, myGroups, me?.email]);

  const dmGroups = sortedGroups.filter(g => g.type === 'dm');
  const chatGroups = sortedGroups.filter(g => g.type === 'group');

  // ── Handlers ─────────────────────────────────────────────────────────────

  const markRead = useCallback((groupId) => {
    const newMap = { ...lastReadMap, [groupId]: new Date().toISOString() };
    setLastReadMap(newMap);
    saveLastReadMap(newMap);
  }, [lastReadMap]);

  const handleSelect = (group) => {
    if (group._isSearchResult) {
      // Create the DM first
      createDMMutation.mutate(group._user || users.find(u => group.members?.includes(u.email) && u.email !== me?.email));
      return;
    }
    setActiveGroup(group);
    setShowChat(true);
    markRead(group.id);
  };

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createDMMutation = useMutation({
    mutationFn: async (user) => {
      const existing = myGroups.find(g =>
        g.type === 'dm' && g.members?.includes(user.email)
      );
      if (existing) return existing;
      return base44.entities.Group.create({
        name: `DM with ${user.full_name}`,
        description: `Direct message between ${me.full_name} and ${user.full_name}`,
        type: 'dm',
        admins: [me.email, user.email],
        members: [me.email, user.email],
        dm_status: 'accepted',
        dm_initiator: me.email,
      });
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['chat_groups'] });
      setShowNewDM(false);
      setDmSearch('');
      setActiveGroup(group);
      setShowChat(true);
      markRead(group.id);
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async () => {
      const group = await base44.entities.Group.create({
        name: groupName.trim(),
        type: 'group',
        members: [me.email, ...selectedMembers],
        admins: [me.email],
        description: '',
      });
      // Notify all added members
      await Promise.allSettled(
        selectedMembers.map(email =>
          createNotification({
            recipient_id: email,
            content: `${me.full_name} added you to the group "${group.name}"`,
            link: '/Chat',
            type: NOTIF_TYPES.GROUP_INVITE,
            sender_avatar: me.avatar_url || '',
          })
        )
      );
      return group;
    },
    onSuccess: (group) => {
      queryClient.invalidateQueries({ queryKey: ['chat_groups'] });
      setShowNewGroup(false);
      setGroupName('');
      setSelectedMembers([]);
      setGroupSearch('');
      setActiveGroup(group);
      setShowChat(true);
    },
  });

  const toggleMember = (email) => {
    setSelectedMembers(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const dmSearchResults = useMemo(() => {
    if (!dmSearch.trim()) return [];
    return users.filter(u =>
      u.email !== me?.email &&
      (u.full_name?.toLowerCase().includes(dmSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(dmSearch.toLowerCase()))
    ).slice(0, 10);
  }, [dmSearch, users, me?.email]);

  const groupMemberResults = useMemo(() => {
    if (!groupSearch.trim()) return users.filter(u => u.email !== me?.email).slice(0, 15);
    return users.filter(u =>
      u.email !== me?.email &&
      (u.full_name?.toLowerCase().includes(groupSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(groupSearch.toLowerCase()))
    ).slice(0, 15);
  }, [groupSearch, users, me?.email]);

  // ── Conversation List JSX ─────────────────────────────────────────────────

  const totalUnread = Object.values(unreadByGroup).reduce((a, b) => a + b, 0);

  const ConversationList = (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
        <h1 className="text-xl font-bold flex-1">
          Chats
          {totalUnread > 0 && (
            <span className="ml-2 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">{totalUnread}</span>
          )}
        </h1>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowNewGroup(true)} title="New Group">
          <Users className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setShowNewDM(true)} title="New Message">
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="px-3 sm:px-4 pb-2 sm:pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 rounded-xl bg-muted border-0"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {dmGroups.length === 0 && chatGroups.length === 0 && searchResultNewUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                <MessageSquare className="w-12 h-12 opacity-30" />
                <p className="text-sm">No conversations yet</p>
                <Button variant="outline" size="sm" onClick={() => setShowNewDM(true)} className="gap-2">
                  <Edit className="w-4 h-4" /> Start a conversation
                </Button>
              </div>
            )}

            {/* DMs */}
            {dmGroups.map(group => (
              <ConversationItem
                key={group.id}
                group={group}
                lastMessage={lastMessageByGroup[group.id]}
                unreadCount={unreadByGroup[group.id] || 0}
                isActive={activeGroup?.id === group.id}
                onClick={() => handleSelect(group)}
                otherUser={getOtherUser(group)}
                me={me}
              />
            ))}

            {/* Group chats */}
            {chatGroups.length > 0 && (
              <>
                {dmGroups.length > 0 && <div className="h-px bg-border/50 mx-4 my-1" />}
                {chatGroups.map(group => (
                  <ConversationItem
                    key={group.id}
                    group={group}
                    lastMessage={lastMessageByGroup[group.id]}
                    unreadCount={unreadByGroup[group.id] || 0}
                    isActive={activeGroup?.id === group.id}
                    onClick={() => handleSelect(group)}
                    otherUser={null}
                    me={me}
                  />
                ))}
              </>
            )}

            {/* Search result new users */}
            {searchResultNewUsers.length > 0 && (
              <>
                <div className="px-4 py-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">People</p>
                </div>
                {searchResultNewUsers.map(group => (
                  <ConversationItem
                    key={group.id}
                    group={group}
                    lastMessage={null}
                    unreadCount={0}
                    isActive={false}
                    onClick={() => handleSelect(group)}
                    otherUser={group._user}
                    me={me}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );

  // ── Mobile Chat View ──────────────────────────────────────────────────────

  if (showChat && activeGroup) {
    return (
      <>
        <div className="md:hidden flex flex-col" style={{ height: 'calc(100dvh - 7rem)' }}>
          <ChatWindow
            group={activeGroup}
            me={me}
            userMap={userMap}
            onBack={() => { setShowChat(false); setActiveGroup(null); }}
          />
        </div>
        <div className="hidden md:flex" style={{ height: 'calc(100dvh - 4rem)' }}>
          <div className="w-72 lg:w-80 border-r flex flex-col flex-shrink-0">{ConversationList}</div>
          <div className="flex-1 overflow-hidden">
            <ChatWindow group={activeGroup} me={me} userMap={userMap} />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Mobile: full-screen list */}
      <div className="md:hidden" style={{ height: 'calc(100dvh - 7rem)' }}>{ConversationList}</div>

      {/* Desktop: side-by-side */}
      <div className="hidden md:flex" style={{ height: 'calc(100dvh - 4rem)' }}>
        <div className="w-72 lg:w-80 border-r flex flex-col flex-shrink-0">{ConversationList}</div>
        <div className="flex-1 overflow-hidden">
          <ChatWindow group={activeGroup} me={me} userMap={userMap} onSelect={(g) => { setActiveGroup(g); markRead(g.id); }} />
        </div>
      </div>

      {/* ── New DM Sheet ─────────────────────────────────────────────── */}
      <Sheet open={showNewDM} onOpenChange={setShowNewDM}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle>New Message</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Search people..."
                value={dmSearch}
                onChange={e => setDmSearch(e.target.value)}
                className="pl-9 rounded-xl bg-muted border-0"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {createDMMutation.isPending && (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" /></div>
            )}
            {dmSearchResults.length === 0 && dmSearch && (
              <p className="text-center text-sm text-muted-foreground py-8">No users found</p>
            )}
            {dmSearchResults.length === 0 && !dmSearch && (
              <p className="text-center text-sm text-muted-foreground py-8">Type a name to search</p>
            )}
            {dmSearchResults.map(user => (
              <div
                key={user.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer"
                onClick={() => createDMMutation.mutate(user)}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.avatar_url} />
                  <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* ── New Group Sheet ──────────────────────────────────────────── */}
      <Sheet open={showNewGroup} onOpenChange={(o) => { setShowNewGroup(o); if (!o) { setGroupName(''); setSelectedMembers([]); setGroupSearch(''); } }}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0">
            <SheetTitle>New Group</SheetTitle>
          </SheetHeader>
          <div className="px-4 py-3 space-y-2 border-b">
            <Input
              placeholder="Group name..."
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              className="rounded-xl"
            />
            {selectedMembers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {selectedMembers.map(email => (
                  <span key={email} className="flex items-center gap-1 bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
                    {userMap[email]?.full_name || email}
                    <button onClick={() => toggleMember(email)}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Add members..."
                value={groupSearch}
                onChange={e => setGroupSearch(e.target.value)}
                className="pl-9 rounded-xl bg-muted border-0"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {groupMemberResults.map(user => {
              const isSelected = selectedMembers.includes(user.email);
              return (
                <div
                  key={user.id}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer"
                  onClick={() => toggleMember(user.email)}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  {isSelected && <Check className="w-5 h-5 text-primary" />}
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 border-t">
            <Button
              className="w-full"
              disabled={!groupName.trim() || selectedMembers.length === 0 || createGroupMutation.isPending}
              onClick={() => createGroupMutation.mutate()}
            >
              {createGroupMutation.isPending
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : <UserPlus className="w-4 h-4 mr-2" />}
              Create Group ({selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''})
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
