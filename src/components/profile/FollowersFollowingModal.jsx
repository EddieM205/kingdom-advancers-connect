import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import FollowButton from './FollowButton';

function UserRow({ userEmail, me, onNavigate }) {
    const { data: users = [] } = useQuery({
        queryKey: ['user_profile', userEmail],
        queryFn: () => base44.entities.User.filter({ email: userEmail }),
        select: (d) => d[0],
    });

    const user = users;

    if (!user) return (
        <div className="flex items-center gap-3 py-3 px-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 h-4 bg-muted rounded" />
        </div>
    );

    return (
        <div className="flex items-center gap-3 py-3 px-4 hover:bg-muted/50 transition-colors">
            <Link
                to={`/CreatorProfile?email=${userEmail}`}
                onClick={onNavigate}
                className="flex items-center gap-3 flex-1 min-w-0"
            >
                <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">@{user.handle || user.full_name?.toLowerCase().replace(/\s+/g, '_')}</p>
                </div>
            </Link>
            <FollowButton targetEmail={userEmail} me={me} />
        </div>
    );
}

export default function FollowersFollowingModal({ isOpen, onClose, targetEmail, defaultTab = 'followers' }) {
    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    const { data: followersData = [], isLoading: loadingFollowers } = useQuery({
        queryKey: ['followers_list', targetEmail],
        queryFn: () => base44.entities.Follow.filter({ following_email: targetEmail, status: 'accepted' }),
        enabled: isOpen && !!targetEmail,
    });

    const { data: followingData = [], isLoading: loadingFollowing } = useQuery({
        queryKey: ['following_list', targetEmail],
        queryFn: () => base44.entities.Follow.filter({ follower_email: targetEmail, status: 'accepted' }),
        enabled: isOpen && !!targetEmail,
    });

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden">
                <DialogHeader className="px-4 pt-4 pb-0">
                    <DialogTitle className="sr-only">Followers & Following</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue={defaultTab} className="w-full">
                    <TabsList className="w-full rounded-none border-b bg-transparent h-auto p-0">
                        <TabsTrigger
                            value="followers"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 text-sm font-semibold"
                        >
                            Followers {followersData.length > 0 && <span className="ml-1 text-muted-foreground font-normal">({followersData.length})</span>}
                        </TabsTrigger>
                        <TabsTrigger
                            value="following"
                            className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:shadow-none py-3 text-sm font-semibold"
                        >
                            Following {followingData.length > 0 && <span className="ml-1 text-muted-foreground font-normal">({followingData.length})</span>}
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="followers" className="mt-0 max-h-96 overflow-y-auto">
                        {loadingFollowers ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : followersData.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-10">No followers yet</p>
                        ) : (
                            followersData.map(f => (
                                <UserRow key={f.id} userEmail={f.follower_email} me={me} onNavigate={onClose} />
                            ))
                        )}
                    </TabsContent>

                    <TabsContent value="following" className="mt-0 max-h-96 overflow-y-auto">
                        {loadingFollowing ? (
                            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                        ) : followingData.length === 0 ? (
                            <p className="text-center text-muted-foreground text-sm py-10">Not following anyone yet</p>
                        ) : (
                            followingData.map(f => (
                                <UserRow key={f.id} userEmail={f.following_email} me={me} onNavigate={onClose} />
                            ))
                        )}
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}