import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Video, Phone, Users, MoreVertical, BellOff, Bell,
  LogOut, Hash, ChevronLeft, UserCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GroupChatHeader({ group, me, memberMap = {}, onBack }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [showMembers, setShowMembers] = useState(false);

  const members = Object.values(memberMap).filter(u => group?.members?.includes(u.email));
  const otherUser = group?.type === 'dm'
    ? members.find(m => m.email !== me?.email)
    : null;

  const displayName = group?.type === 'dm'
    ? (otherUser?.full_name || group?.name?.replace('DM with ', '') || '')
    : (group?.name || '');

  const avatarSrc = group?.type === 'dm'
    ? (otherUser?.avatar_url || group?.cover_photo_url)
    : group?.cover_photo_url;

  const onlineCount = members.filter(m => m.status === 'online').length;
  const isMuted = me?.muted_groups?.includes(group?.id);

  // ── Mutations ──────────────────────────────────────────────────────────────

  const muteMutation = useMutation({
    mutationFn: () => {
      const current = me?.muted_groups || [];
      const updated = isMuted
        ? current.filter(id => id !== group.id)
        : [...current, group.id];
      return base44.entities.User.update(me.id, { muted_groups: updated });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['me'] }),
  });

  const leaveGroupMutation = useMutation({
    mutationFn: () => {
      const newMembers = (group.members || []).filter(e => e !== me?.email);
      const newAdmins = (group.admins || []).filter(e => e !== me?.email);
      if (newMembers.length === 0) {
        return base44.entities.Group.delete(group.id);
      }
      return base44.entities.Group.update(group.id, { members: newMembers, admins: newAdmins });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat_groups'] });
      onBack?.();
    },
  });

  // Guard — must be after all hooks
  if (!group) return null;

  // ── Call handlers ──────────────────────────────────────────────────────────

  const startCall = async (callType) => {
    if (!me) return;
    if (group.type === 'dm' && otherUser) {
      const sorted = [me.email, otherUser.email].sort().join('');
      const safe = sorted.replace(/[^a-zA-Z0-9]/g, '');
      const session = Date.now().toString(36);
      const roomName = `KingdomAdvancers-dm-${safe}-${session}`;
      try {
        await base44.entities.Notification.create({
          recipient_id: otherUser.email,
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
      } catch {}
      navigate(`/VideoCalls?roomName=${roomName}&callType=${callType}`);
    } else {
      // Group call
      const safeId = group.id.replace(/[^a-zA-Z0-9]/g, '');
      const roomName = `KingdomAdvancers-group-${safeId}`;
      const others = (group.members || []).filter(e => e !== me.email);
      await Promise.allSettled(others.map(email =>
        base44.entities.Notification.create({
          recipient_id: email,
          is_read: false,
          content: `__CALL__:${JSON.stringify({
            callerName: me.full_name, callerAvatar: me.avatar_url || '',
            callerEmail: me.email, callType, roomName,
            isGroupCall: true, groupName: group.name, groupId: group.id,
          })}`,
          link: `/VideoCalls?roomName=${roomName}&callType=${callType}&isGroup=true&groupId=${group.id}`,
        })
      ));
      navigate(`/VideoCalls?roomName=${roomName}&callType=${callType}&isGroup=true&groupId=${group.id}`);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 sm:py-2.5 border-b bg-background">
        {/* Back (mobile) */}
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden -ml-1 flex-shrink-0 h-8 w-8" onClick={onBack}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
        )}

        {/* Avatar + Name */}
        <div
          className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
          onClick={() => group.type === 'group' ? setShowMembers(true) : null}
        >
          <Avatar className="h-9 w-9 flex-shrink-0">
            <AvatarImage src={avatarSrc} className="object-cover" />
            <AvatarFallback>
              {group.type === 'dm'
                ? (displayName.charAt(0) || '?').toUpperCase()
                : <Hash className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate leading-tight">{displayName}</p>
            <p className="text-[11px] text-muted-foreground truncate leading-tight">
              {group.type === 'dm'
                ? (otherUser?.status === 'online' ? '🟢 Online' : '⚫ Offline')
                : `${members.length} members${onlineCount > 0 ? ` · ${onlineCount} online` : ''}`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startCall('video')} title="Video Call">
            <Video className="w-4 h-4 text-green-500" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => startCall('audio')} title="Audio Call">
            <Phone className="w-4 h-4 text-purple-500" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {group.type === 'group' && (
                <DropdownMenuItem onClick={() => setShowMembers(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Members ({members.length})
                </DropdownMenuItem>
              )}
              {group.type === 'dm' && otherUser && (
                <DropdownMenuItem onClick={() => navigate(`/CreatorProfile?email=${otherUser.email}`)}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  View Profile
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => muteMutation.mutate()} disabled={muteMutation.isPending}>
                {isMuted
                  ? <><Bell className="w-4 h-4 mr-2" />Unmute</>
                  : <><BellOff className="w-4 h-4 mr-2" />Mute</>}
              </DropdownMenuItem>
              {group.type === 'group' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Leave "${group.name}"?`)) {
                        leaveGroupMutation.mutate();
                      }
                    }}
                    disabled={leaveGroupMutation.isPending}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave Group
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Members Sheet */}
      <Sheet open={showMembers} onOpenChange={setShowMembers}>
        <SheetContent side="right" className="w-[85vw] sm:w-80 max-w-xs p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2 border-b">
            <SheetTitle>{group.name} · {members.length} members</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto py-2">
            {members.map(member => (
              <div
                key={member.email}
                className="flex items-center gap-3 px-4 py-3 hover:bg-muted cursor-pointer"
                onClick={() => navigate(`/CreatorProfile?email=${member.email}`)}
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.avatar_url} />
                    <AvatarFallback>{member.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  {member.status === 'online' && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {member.full_name}
                    {member.email === me?.email && <span className="text-muted-foreground font-normal"> (You)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {group.admins?.includes(member.email) ? '👑 Admin' : member.status === 'online' ? '🟢 Online' : '⚫ Offline'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
