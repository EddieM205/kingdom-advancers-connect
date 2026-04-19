import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Loader2, Video, Phone, Search, Users } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import WebRTCCallView from '@/components/calls/WebRTCCallView';
import GroupCallView from '@/components/calls/GroupCallView';

export default function VideoCallsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCall, setActiveCall]   = useState(null);   // 1-on-1
  const [activeGroup, setActiveGroup] = useState(null);   // group call
  const [callingUser, setCallingUser] = useState(null);   // "calling…" spinner
  const [activeTab,   setActiveTab]   = useState('contacts');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  /* ── Handle incoming call from URL ───────────────────────── */
  useEffect(() => {
    const roomId       = searchParams.get('roomId');
    const callType     = searchParams.get('callType') || 'video';
    const isGroup      = searchParams.get('isGroup') === 'true';
    const isCaller     = searchParams.get('isCaller') !== 'false';
    const remoteName   = searchParams.get('remoteName')   || 'Unknown';
    const remoteAvatar = searchParams.get('remoteAvatar') || '';
    const remoteEmail  = searchParams.get('remoteEmail')  || '';
    const groupName    = searchParams.get('groupName')    || 'Group Call';

    if (roomId && me) {
      if (isGroup) {
        setActiveGroup({ roomId, callType, groupName });
      } else {
        setActiveCall({ roomId, callType, isCaller, remoteName, remoteAvatar, remoteEmail });
      }
    }
  }, [me, searchParams.get('roomId')]);

  /* ── Fetch data ──────────────────────────────────────────── */
  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: follows = [] } = useQuery({
    queryKey: ['follows'],
    queryFn: () => base44.entities.Follow.list(),
  });

  const { data: groups = [] } = useQuery({
    queryKey: ['groups'],
    queryFn: () => base44.entities.Group.list(),
  });

  const { data: blockedEmails = [] } = useQuery({
    queryKey: ['blocked_emails_calls', me?.email],
    queryFn: async () => {
      if (!me) return [];
      const blocks = await base44.entities.Block.filter({
        '$or': [{ blocker_email: me.email }, { blocked_email: me.email }]
      });
      return blocks.map(b => b.blocker_email === me.email ? b.blocked_email : b.blocker_email);
    },
    enabled: !!me,
  });

  const contacts = useMemo(() => {
    if (!me || !allUsers.length) return [];
    const blockedSet = new Set(blockedEmails);
    const contactSet = new Set();
    follows.forEach(f => {
      if (f.status === 'accepted') {
        if (f.follower_email === me.email)  contactSet.add(f.following_email);
        if (f.following_email === me.email) contactSet.add(f.follower_email);
      }
    });
    return allUsers.filter(u =>
      contactSet.has(u.email) && u.email !== me.email && !blockedSet.has(u.email)
    );
  }, [me, allUsers, follows, blockedEmails]);

  const myGroups = useMemo(
    () => groups.filter(g => g.members?.includes(me?.email)),
    [groups, me]
  );

  const filteredContacts = useMemo(() => {
    if (!searchTerm) return contacts;
    const t = searchTerm.toLowerCase();
    return contacts.filter(u =>
      u.full_name?.toLowerCase().includes(t) || u.email?.toLowerCase().includes(t)
    );
  }, [contacts, searchTerm]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm) return myGroups;
    const t = searchTerm.toLowerCase();
    return myGroups.filter(g => g.name?.toLowerCase().includes(t));
  }, [myGroups, searchTerm]);

  /* ── Initiate 1-on-1 call ───────────────────────────────── */
  const initiateCall = async (user, callType) => {
    if (!me) return;
    const roomId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    setCallingUser({ email: user.email, callType });

    try {
      await base44.entities.Notification.create({
        recipient_id: user.email,
        is_read: false,
        content: `__CALL__:${JSON.stringify({
          callerName:   me.full_name,
          callerAvatar: me.avatar_url || '',
          callerEmail:  me.email,
          callType,
          roomId,
          roomName:     roomId,
          isGroupCall:  false,
        })}`,
        link: `/VideoCalls?roomId=${roomId}&callType=${callType}&isCaller=false&remoteName=${encodeURIComponent(me.full_name)}&remoteAvatar=${encodeURIComponent(me.avatar_url || '')}&remoteEmail=${encodeURIComponent(me.email)}`,
      });
    } catch { /* proceed even if notification fails */ }

    setCallingUser(null);
    setActiveCall({
      roomId,
      callType,
      isCaller:     true,
      remoteEmail:  user.email,
      remoteName:   user.full_name,
      remoteAvatar: user.avatar_url || '',
    });
  };

  /* ── Start group call ───────────────────────────────────── */
  const startGroupCall = async (group, callType) => {
    if (!me) return;
    const roomId = `grpcall_${group.id}_${Date.now()}`;

    // Notify all other group members
    const others = (group.members || []).filter(email => email !== me.email);
    await Promise.allSettled(
      others.map(email =>
        base44.entities.Notification.create({
          recipient_id: email,
          is_read: false,
          content: `__CALL__:${JSON.stringify({
            callerName:   me.full_name,
            callerAvatar: me.avatar_url || '',
            callerEmail:  me.email,
            callType,
            roomId,
            roomName:     roomId,
            isGroupCall:  true,
            groupName:    group.name,
          })}`,
          link: `/VideoCalls?roomId=${roomId}&callType=${callType}&isGroup=true&groupName=${encodeURIComponent(group.name)}`,
        })
      )
    );

    setActiveGroup({ roomId, callType, groupName: group.name });
  };

  /* ── Active calls ────────────────────────────────────────── */
  if (activeCall) {
    return (
      <WebRTCCallView
        roomId={activeCall.roomId}
        isCaller={activeCall.isCaller}
        callType={activeCall.callType}
        myEmail={me?.email}
        myName={me?.full_name}
        myAvatar={me?.avatar_url}
        remoteEmail={activeCall.remoteEmail}
        remoteName={activeCall.remoteName}
        remoteAvatar={activeCall.remoteAvatar}
        onEndCall={() => { setActiveCall(null); navigate('/VideoCalls', { replace: true }); }}
      />
    );
  }

  if (activeGroup) {
    return (
      <GroupCallView
        groupRoomId={activeGroup.roomId}
        callType={activeGroup.callType}
        myEmail={me?.email}
        myName={me?.full_name}
        myAvatar={me?.avatar_url}
        groupName={activeGroup.groupName}
        onEndCall={() => { setActiveGroup(null); navigate('/VideoCalls', { replace: true }); }}
      />
    );
  }

  /* ── Main UI ─────────────────────────────────────────────── */
  return (
    <div className="w-full min-h-screen pb-24 sm:pb-6">
      <div className="container mx-auto max-w-2xl px-3 sm:px-4 md:px-8 py-4 md:py-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">Calls</h1>
          <p className="text-muted-foreground text-sm">
            Video and voice calls — direct, no third-party apps.
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-5">
          {[
            { key: 'contacts', label: 'Contacts', count: contacts.length },
            { key: 'groups',   label: 'Groups',   count: myGroups.length },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${
                activeTab === tab.key
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={activeTab === 'contacts' ? 'Search contacts…' : 'Search groups…'}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>

        {/* ── Contacts tab ──────────────────────────────────── */}
        {activeTab === 'contacts' && (
          filteredContacts.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Phone className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchTerm ? `No contacts found for "${searchTerm}"` : 'No contacts yet'}
              </p>
              {!searchTerm && <p className="text-sm mt-1">Follow people to call them here.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredContacts.map(user => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
                >
                  <Avatar className="w-12 h-12 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="font-semibold">{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  {/* Voice call */}
                  <button
                    onClick={() => initiateCall(user, 'audio')}
                    disabled={!!callingUser}
                    title="Voice call"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-600 hover:bg-green-500/20 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {callingUser?.email === user.email && callingUser?.callType === 'audio'
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Phone className="w-5 h-5" />}
                  </button>
                  {/* Video call */}
                  <button
                    onClick={() => initiateCall(user, 'video')}
                    disabled={!!callingUser}
                    title="Video call"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 active:scale-95 transition-all disabled:opacity-40"
                  >
                    {callingUser?.email === user.email && callingUser?.callType === 'video'
                      ? <Loader2 className="w-5 h-5 animate-spin" />
                      : <Video className="w-5 h-5" />}
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── Groups tab ────────────────────────────────────── */}
        {activeTab === 'groups' && (
          filteredGroups.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">
                {searchTerm ? `No groups found for "${searchTerm}"` : 'No groups yet'}
              </p>
              {!searchTerm && <p className="text-sm mt-1">Join or create a group to start group calls.</p>}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredGroups.map(group => (
                <div
                  key={group.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {group.cover_photo_url ? (
                      <img src={group.cover_photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <Users className="w-6 h-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{group.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.members?.length || 0} members
                    </p>
                  </div>
                  {/* Group voice call */}
                  <button
                    onClick={() => startGroupCall(group, 'audio')}
                    title="Group voice call"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500/10 text-green-600 hover:bg-green-500/20 active:scale-95 transition-all"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                  {/* Group video call */}
                  <button
                    onClick={() => startGroupCall(group, 'video')}
                    title="Group video call"
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 active:scale-95 transition-all"
                  >
                    <Video className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </div>
  );
}
