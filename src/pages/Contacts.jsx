import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Users, MessageSquare, Globe, Video } from 'lucide-react';
import RecentChatsSection from '@/components/contacts/RecentChatsSection';
import ContactsSection from '@/components/contacts/ContactsSection';
import JitsiCallView from '@/components/calls/JitsiCallView';

function getRoomName(emailA, emailB) {
  const sorted = [emailA, emailB].sort().join('');
  const safe = sorted.replace(/[^a-zA-Z0-9]/g, '');
  // Add a short timestamp so each call session gets a fresh room (no stale lobby state)
  const session = Date.now().toString(36);
  return `KingdomAdvancers-dm-${safe}-${session}`;
}

export default function ContactsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [activeCall, setActiveCall] = useState(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: follows = [], isLoading: followsLoading } = useQuery({
    queryKey: ['follows'],
    queryFn: () => base44.entities.Follow.list('-created_date', 1000),
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
  });

  const { data: dmGroups = [], isLoading: dmsLoading } = useQuery({
    queryKey: ['dm_groups'],
    queryFn: () => base44.entities.Group.filter({ type: 'dm' }),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 500),
  });

  const isLoading = usersLoading || dmsLoading || followsLoading || groupsLoading;

  // Build mutual / following / followers sets (no overlap)
  const { mutual, following, followers } = useMemo(() => {
    if (!me || !follows.length) return { mutual: [], following: [], followers: [] };

    const iFollow = new Set(
      follows
        .filter(f => f.follower_email === me.email && f.status === 'accepted')
        .map(f => f.following_email)
    );
    const followsMe = new Set(
      follows
        .filter(f => f.following_email === me.email && f.status === 'accepted')
        .map(f => f.follower_email)
    );

    const mutualEmails = [...iFollow].filter(e => followsMe.has(e));
    const followingOnlyEmails = [...iFollow].filter(e => !followsMe.has(e));
    const followersOnlyEmails = [...followsMe].filter(e => !iFollow.has(e));

    const toUsers = (emails) =>
      emails
        .map(email => users.find(u => u.email === email))
        .filter(Boolean)
        .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    return {
      mutual: toUsers(mutualEmails),
      following: toUsers(followingOnlyEmails),
      followers: toUsers(followersOnlyEmails),
    };
  }, [me, follows, users]);

  const allContacts = useMemo(() => [...mutual, ...following, ...followers], [mutual, following, followers]);

  // Recent chats
  const recentChats = useMemo(() => {
    if (!me || !dmGroups.length) return [];
    const acceptedDms = dmGroups.filter(g => g.dm_status === 'accepted' || !g.dm_status);
    return acceptedDms
      .map(dm => {
        const otherEmail = dm.members?.find(e => e !== me.email);
        const user = users.find(u => u.email === otherEmail);
        if (!user) return null;
        const groupMessages = messages.filter(m => m.group_id === dm.id);
        const lastMessage = groupMessages[0]?.content || '';
        return { user, lastMessage, unreadCount: 0, group: dm };
      })
      .filter(Boolean)
      .sort((a, b) => {
        const aTime = messages.filter(m => m.group_id === a.group.id)[0]?.created_date || 0;
        const bTime = messages.filter(m => m.group_id === b.group.id)[0]?.created_date || 0;
        return new Date(bTime) - new Date(aTime);
      })
      .slice(0, 10);
  }, [me, dmGroups, users, messages]);

  // Pending message requests
  const pendingRequests = useMemo(() => {
    if (!me) return [];
    return dmGroups
      .filter(g => g.dm_status === 'pending' && g.dm_initiator !== me.email)
      .map(dm => {
        const otherEmail = dm.members?.find(e => e !== me.email);
        const user = users.find(u => u.email === otherEmail);
        return user ? { ...user, dm_group_id: dm.id } : null;
      })
      .filter(Boolean);
  }, [dmGroups, me, users]);

  const acceptRequestMutation = useMutation({
    mutationFn: (groupId) => base44.entities.Group.update(groupId, { dm_status: 'accepted' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dm_groups'] }),
  });

  const declineRequestMutation = useMutation({
    mutationFn: (groupId) => base44.entities.Group.delete(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dm_groups'] }),
  });

  // Search filtering
  const searchLower = searchTerm.toLowerCase();
  const filterUsers = (arr) =>
    searchTerm
      ? arr.filter(u =>
          u.full_name?.toLowerCase().includes(searchLower) ||
          u.email?.toLowerCase().includes(searchLower)
        )
      : arr;

  const filteredMutual = filterUsers(mutual);
  const filteredFollowing = filterUsers(following);
  const filteredFollowers = filterUsers(followers);
  const filteredAll = filterUsers(allContacts);
  const hasResults = filteredAll.length > 0;

  // Global search across all users
  const globalResults = useMemo(() => {
    if (!showGlobalSearch || !searchTerm) return [];
    const contactEmails = new Set(allContacts.map(u => u.email));
    return users.filter(u =>
      u.email !== me?.email &&
      !contactEmails.has(u.email) &&
      (u.full_name?.toLowerCase().includes(searchLower) || u.email?.toLowerCase().includes(searchLower))
    );
  }, [showGlobalSearch, searchTerm, users, allContacts, me]);

  // Group list for calls
  const userGroups = useMemo(() => {
    if (!me || !groups.length) return [];
    return groups.filter(g => g.type === 'group' && g.members?.includes(me.email));
  }, [me, groups]);

  // ── Call handlers ──────────────────────────────────────────
  const startCall = async (user, callType) => {
    if (!me) return;
    const roomName = getRoomName(me.email, user.email);

    // Notify the receiver
    try {
      await base44.entities.Notification.create({
        recipient_id: user.email,
        is_read: false,
        content: `__CALL__:${JSON.stringify({
          callerName: me.full_name,
          callerAvatar: me.avatar_url || '',
          callerEmail: me.email,
          callType,
          roomName,
        })}`,
        link: `/VideoCalls?roomName=${roomName}&callType=${callType}`,
      });
    } catch (e) {
      console.warn('Could not send call notification:', e);
    }

    // Start the call locally
    setActiveCall({ roomName, callName: user.full_name, callType, isGroupCall: false });
  };

  const handleVideoCall = (user) => startCall(user, 'video');
  const handleAudioCall = (user) => startCall(user, 'audio');
  const handleMessage = (user) => navigate('/Chat');
  const handleViewProfile = (user) => navigate(`/CreatorProfile?email=${user.email}`);

  const startGroupCall = async (group) => {
    if (!me) return;
    const safeId = group.id.replace(/[^a-zA-Z0-9]/g, '');
    const roomName = `KingdomAdvancers-group-${safeId}`;
    // Notify all group members except self
    const otherMembers = (group.members || []).filter(email => email !== me.email);
    await Promise.allSettled(
      otherMembers.map(email =>
        base44.entities.Notification.create({
          recipient_id: email,
          is_read: false,
          content: `__CALL__:${JSON.stringify({
            callerName: me.full_name,
            callerAvatar: me.avatar_url || '',
            callerEmail: me.email,
            callType: 'video',
            roomName,
            isGroupCall: true,
            groupName: group.name,
            groupId: group.id,
          })}`,
          link: `/VideoCalls?roomName=${roomName}&callType=video&isGroup=true&groupId=${group.id}`,
        })
      )
    );
    setActiveCall({ roomName, callName: group.name, callType: 'video', isGroupCall: true, groupId: group.id });
  };

  // ── Render Jitsi when call is active ──────────────────────
  if (activeCall) {
    return (
      <JitsiCallView
        roomName={activeCall.roomName}
        displayName={me?.full_name}
        avatarUrl={me?.avatar_url}
        onEndCall={() => setActiveCall(null)}
        isGroupCall={activeCall.isGroupCall || false}
        groupId={activeCall.groupId || null}
        audioOnly={activeCall.callType === 'audio'}
      />
    );
  }

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="container mx-auto max-w-3xl px-3 sm:px-4 md:px-8 py-4 md:py-8">

        {/* Header */}
        <div className="mb-3 sm:mb-5">
          <h1 className="text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">Contacts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Tap a contact to message, call, or view profile</p>
        </div>

        {/* Search */}
        <div className="relative mb-4 sm:mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setShowGlobalSearch(false); }}
            className="pl-10 h-10 sm:h-11 rounded-xl text-sm"
          />
        </div>

        <div className="space-y-5 sm:space-y-8">

          {/* Recent Chats */}
          {!searchTerm && (
            <RecentChatsSection
              isLoading={isLoading}
              recentChats={recentChats}
              onMessage={handleMessage}
              onAudioCall={handleAudioCall}
              onVideoCall={handleVideoCall}
              onViewProfile={handleViewProfile}
            />
          )}

          {/* Contacts (sectioned or search results) */}
          {searchTerm ? (
            <>
              {hasResults ? (
                <ContactsSection
                  title="Search Results"
                  contacts={filteredAll}
                  onMessage={handleMessage}
                  onAudioCall={handleAudioCall}
                  onVideoCall={handleVideoCall}
                  onViewProfile={handleViewProfile}
                />
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm mb-4">No contacts found for "{searchTerm}"</p>
                  {!showGlobalSearch ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowGlobalSearch(true)}
                      className="gap-2"
                    >
                      <Globe className="w-4 h-4" />
                      Search all users globally
                    </Button>
                  ) : globalResults.length > 0 ? (
                    <ContactsSection
                      title="Global Results"
                      contacts={globalResults}
                      onMessage={handleMessage}
                      onAudioCall={handleAudioCall}
                      onVideoCall={handleVideoCall}
                      onViewProfile={handleViewProfile}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No users found globally.</p>
                  )}
                </div>
              )}
            </>
          ) : (
            <ContactsSection
              isLoading={isLoading}
              mutual={mutual}
              following={following}
              followers={followers}
              emptyMessage="No contacts yet. Follow people to see them here."
              onMessage={handleMessage}
              onAudioCall={handleAudioCall}
              onVideoCall={handleVideoCall}
              onViewProfile={handleViewProfile}
            />
          )}

          {/* Groups Section */}
          {!searchTerm && userGroups.length > 0 && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Groups <span className="opacity-60">({userGroups.length})</span>
              </h2>
              <div className="space-y-0.5 bg-card rounded-xl border border-border overflow-hidden p-1">
                {userGroups.map(group => (
                  <div
                    key={group.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => navigate('/Chat')}>
                      <p className="font-semibold text-sm truncate">{group.name}</p>
                      <p className="text-xs text-muted-foreground">{group.members?.length || 0} members</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-900/30 active:scale-95 transition-all"
                        onClick={() => startGroupCall(group)}
                        title="Start Group Video Call"
                      >
                        <Video className="w-4 h-4 text-green-500" />
                      </button>
                      <button
                        className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900/30 active:scale-95 transition-all"
                        onClick={() => navigate('/Chat')}
                        title="Open Group Chat"
                      >
                        <MessageSquare className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message Requests */}
          {pendingRequests.length > 0 && !searchTerm && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 pb-2 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5" />
                Message Requests <span className="opacity-60">({pendingRequests.length})</span>
              </h2>
              <div className="space-y-2 bg-card rounded-xl border border-border overflow-hidden p-2">
                {pendingRequests.map(user => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{user.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" onClick={() => acceptRequestMutation.mutate(user.dm_group_id)} disabled={acceptRequestMutation.isPending}>Accept</Button>
                      <Button size="sm" variant="outline" onClick={() => declineRequestMutation.mutate(user.dm_group_id)} disabled={declineRequestMutation.isPending}>Decline</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
