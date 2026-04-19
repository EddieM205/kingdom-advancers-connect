import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Loader2, Search, UserCheck, Mail } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createPageUrl } from '@/utils';
import { notifyFollowRequest, notifyFollowAccepted } from '@/lib/notifications';
import FriendCard from '@/components/friends/FriendCard';
import VideoCallView from '@/components/calls/VideoCallView';
import OutgoingCallModal from '@/components/calls/OutgoingCallModal';

export default function FriendsPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [activeCall, setActiveCall] = useState(null); // { type: 'video' | 'audio', user, status: 'calling' | 'connected' }

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
    
    const { data: users, isLoading: usersLoading } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: [],
    });

    const { data: friendships, isLoading: friendsLoading } = useQuery({
        queryKey: ['friendships'],
        queryFn: () => base44.entities.Friend.list(),
        initialData: [],
    });

    const addFriendMutation = useMutation({
        mutationFn: async (recipientEmail) => {
            const result = await base44.entities.Friend.create({ requester_email: me.email, recipient_email: recipientEmail, status: 'pending' });
            await notifyFollowRequest({ follower: me, targetEmail: recipientEmail });
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries(['friendships']),
    });

    const updateFriendMutation = useMutation({
        mutationFn: async ({ id, status, requesterEmail }) => {
            const result = await base44.entities.Friend.update(id, { status });
            if (status === 'accepted' && requesterEmail) {
                await notifyFollowAccepted({ accepter: me, requesterEmail });
            }
            return result;
        },
        onSuccess: () => queryClient.invalidateQueries(['friendships']),
    });

    const createDmMutation = useMutation({
        mutationFn: async (otherUser) => {
            const userEmails = [me.email, otherUser.email].sort();
            const existingGroups = await base44.entities.Group.filter({ 
                type: 'dm',
                members: { '$all': userEmails }
            });
            if (existingGroups.length > 0) return existingGroups[0];

            const newGroup = await base44.entities.Group.create({
                name: `DM with ${otherUser.full_name}`,
                description: `Direct message between ${me.full_name} and ${otherUser.full_name}`,
                type: 'dm',
                admins: [me.email, otherUser.email],
                members: [me.email, otherUser.email]
            });
            return newGroup;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            navigate(createPageUrl('Posts'));
        }
    });
    
    const { friendList, pendingReceived, notFriends } = useMemo(() => {
        if (!me || !users.length) {
            return { friendList: [], pendingReceived: [], notFriends: [] };
        }

        const friendEmails = new Set();
        const pendingSentEmails = new Set();
        const pendingReceivedMap = new Map();

        friendships.forEach(f => {
            if (f.status === 'accepted') {
                if (f.requester_email === me.email) friendEmails.add(f.recipient_email);
                if (f.recipient_email === me.email) friendEmails.add(f.requester_email);
            } else if (f.status === 'pending') {
                if (f.requester_email === me.email) pendingSentEmails.add(f.recipient_email);
                if (f.recipient_email === me.email) pendingReceivedMap.set(f.requester_email, f.id);
            }
        });
        
        const allOtherUsers = users.filter(u => u.email !== me.email);

        const friendList = allOtherUsers.filter(u => friendEmails.has(u.email));
        const pendingReceived = allOtherUsers.filter(u => pendingReceivedMap.has(u.email)).map(u => ({...u, friend_request_id: pendingReceivedMap.get(u.email)}));
        
        const notFriends = allOtherUsers.filter(u => !friendEmails.has(u.email) && !pendingSentEmails.has(u.email) && !pendingReceivedMap.has(u.email));

        return { friendList, pendingReceived, notFriends };
    }, [me, users, friendships]);

    const filteredNotFriends = searchTerm 
        ? notFriends.filter(u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
        : notFriends;

    const isLoading = usersLoading || friendsLoading;

    const notifyCallMutation = useMutation({
        mutationFn: (data) => base44.entities.Notification.create(data),
    });

    const handleVideoCall = (user) => {
        setActiveCall({ type: 'video', user, status: 'calling' });
        // Send call notification
        notifyCallMutation.mutate({
            recipient_id: user.email,
            content: `📹 ${me?.full_name} is calling you (video)`,
            link: createPageUrl('VideoCalls'),
        });
        // Simulate connection after 2 seconds
        setTimeout(() => {
            setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        }, 2000);
    };

    const handleAudioCall = (user) => {
        setActiveCall({ type: 'audio', user, status: 'calling' });
        // Send call notification
        notifyCallMutation.mutate({
            recipient_id: user.email,
            content: `📞 ${me?.full_name} is calling you (voice)`,
            link: createPageUrl('VideoCalls'),
        });
        setTimeout(() => {
            setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        }, 2000);
    };

    const handleMessage = (user) => {
        createDmMutation.mutate(user);
    };

    const handleEndCall = () => {
        setActiveCall(null);
    };

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-8 py-4 md:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">Friends</h1>
            <Tabs defaultValue="friends">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                    <TabsTrigger value="friends"><UserCheck className="mr-2 h-4 w-4" />Friends ({friendList.length})</TabsTrigger>
                    <TabsTrigger value="requests"><Mail className="mr-2 h-4 w-4" />Requests ({pendingReceived.length})</TabsTrigger>
                    <TabsTrigger value="find"><Search className="mr-2 h-4 w-4" />Find People</TabsTrigger>
                </TabsList>
                <TabsContent value="friends">
                    {isLoading ? <Loader2 className="animate-spin mx-auto"/> :
                     friendList.length === 0 ? <p className="text-center text-gray-500 py-8">You haven't added any friends yet.</p> :
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {friendList.map(user => (
                            <FriendCard 
                                key={user.id} 
                                user={user} 
                                friendStatus="friends"
                                onVideoCall={handleVideoCall}
                                onAudioCall={handleAudioCall}
                                onMessage={handleMessage}
                            />
                        ))}
                    </div>}
                </TabsContent>
                <TabsContent value="requests">
                    {isLoading ? <Loader2 className="animate-spin mx-auto"/> :
                     pendingReceived.length === 0 ? <p className="text-center text-gray-500 py-8">No new friend requests.</p> :
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {pendingReceived.map(user => (
                            <FriendCard 
                                key={user.id} 
                                user={user} 
                                friendStatus="pending-received" 
                                onAccept={(id) => updateFriendMutation.mutate({ id, status: 'accepted', requesterEmail: user.email })}
                                onDecline={(id) => updateFriendMutation.mutate({ id, status: 'declined' })}
                                isProcessing={updateFriendMutation.isLoading} 
                            />
                        ))}
                    </div>}
                </TabsContent>
                <TabsContent value="find">
                    <div className="relative mb-6">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                        <Input type="text" placeholder="Search for people by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 text-base h-11" />
                    </div>
                     {isLoading ? <Loader2 className="animate-spin mx-auto"/> :
                     filteredNotFriends.length === 0 && searchTerm ? <p className="text-center text-gray-500 py-8">No users found for "{searchTerm}".</p> :
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredNotFriends.map(user => (
                            <FriendCard 
                                key={user.id} 
                                user={user} 
                                friendStatus="not-friends" 
                                onAddFriend={(user) => addFriendMutation.mutate(user.email)} 
                                isProcessing={addFriendMutation.isLoading && addFriendMutation.variables === user.email} 
                            />
                        ))}
                    </div>}
                </TabsContent>
            </Tabs>

            {/* Call modals */}
            {activeCall?.status === 'calling' && (
                <OutgoingCallModal
                    recipient={activeCall.user}
                    isVideoCall={activeCall.type === 'video'}
                    isGroupCall={false}
                    onCancel={handleEndCall}
                />
            )}

            {activeCall?.status === 'connected' && (
                <VideoCallView
                    participants={[activeCall.user]}
                    currentUser={me}
                    isGroupCall={false}
                    callName={activeCall.user.full_name}
                    onEndCall={handleEndCall}
                />
            )}
            </div>
        </div>
    );
}