import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSearchParams, Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Film, ArrowLeft, Lock } from 'lucide-react';
import BlockButton from '@/components/profile/BlockButton';
import FollowButton from '@/components/profile/FollowButton';
import { useBlockedEmails } from '@/lib/useBlockedEmails';
import FollowersFollowingModal from '@/components/profile/FollowersFollowingModal';

export default function CreatorProfile() {
    const [searchParams] = useSearchParams();
    const creatorEmail = searchParams.get('email');
    const [modalTab, setModalTab] = useState(null);

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    const { data: creator, isLoading: creatorLoading } = useQuery({
        queryKey: ['creator', creatorEmail],
        queryFn: () => base44.entities.User.filter({ email: creatorEmail }),
        enabled: !!creatorEmail,
        select: (data) => data[0],
    });

    // Block guard — two-way
    const blockedSet = useBlockedEmails(me?.email);
    const isBlockedRelationship = !!creatorEmail && blockedSet.has(creatorEmail);

    // Follow status (accepted only — used for content visibility)
    const { data: followRecords = [] } = useQuery({
        queryKey: ['follow_record', me?.email, creatorEmail],
        queryFn: () => base44.entities.Follow.filter({ follower_email: me.email, following_email: creatorEmail }),
        enabled: !!me?.email && !!creatorEmail,
    });
    const isFollowing = followRecords.some(f => f.status === 'accepted');

    // Followers / following counts — always public per spec
    const { data: followersData = [] } = useQuery({
        queryKey: ['followers_count', creatorEmail],
        queryFn: () => base44.entities.Follow.filter({ following_email: creatorEmail, status: 'accepted' }),
        enabled: !!creatorEmail,
    });
    const { data: followingData = [] } = useQuery({
        queryKey: ['following_count', creatorEmail],
        queryFn: () => base44.entities.Follow.filter({ follower_email: creatorEmail, status: 'accepted' }),
        enabled: !!creatorEmail,
    });

    const { data: streams = [] } = useQuery({
        queryKey: ['creator-streams', creatorEmail],
        queryFn: () => base44.entities.LiveStream.filter({ host_email: creatorEmail, status: 'posted' }, '-created_date', 50),
        enabled: !!creatorEmail,
    });

    if (creatorLoading) {
        return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;
    }

    if (!creator || isBlockedRelationship) {
        return (
            <div className="text-center py-16">
                <h3 className="text-xl font-semibold">User Not Found</h3>
                <p className="text-muted-foreground mt-1 text-sm">This profile isn't available.</p>
                <Link to="/Posts"><Button variant="outline" className="mt-4 flex items-center gap-2"><ArrowLeft className="w-4 h-4" /> Back to Feed</Button></Link>
            </div>
        );
    }

    const isOwnProfile = me?.email === creatorEmail;
    // Content visible if: own profile, public account, or accepted follower
    const canSeeContent = isOwnProfile || !creator.is_private || isFollowing;

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="max-w-4xl mx-auto p-3 sm:p-4 md:p-6">

                <Link to="/Posts" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
                    <ArrowLeft className="w-4 h-4" /> Back
                </Link>

                {/* Profile Header — always visible */}
                <div className="bg-gradient-to-r from-red-500/10 to-purple-500/10 rounded-xl p-4 sm:p-6 md:p-8 mb-6 sm:mb-8">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                        {/* Avatar with private badge */}
                        <div className="relative self-start">
                            <Avatar className="w-20 h-20 sm:w-24 sm:h-24">
                                <AvatarImage src={creator.avatar_url} />
                                <AvatarFallback className="text-lg sm:text-xl">{creator.full_name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            {creator.is_private && (
                                <span className="absolute -bottom-1 -right-1 bg-gray-800 text-white rounded-full p-1">
                                    <Lock className="w-3 h-3" />
                                </span>
                            )}
                        </div>

                        <div className="flex-1">
                            {/* Name + private label */}
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">{creator.full_name}</h1>
                                {creator.is_private && (
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                        <Lock className="w-3 h-3" /> Private
                                    </span>
                                )}
                            </div>
                            <p className="text-muted-foreground text-sm font-mono">@{creator.handle || creator.full_name?.toLowerCase().replace(/\s+/g, '_')}</p>

                            {/* Bio — always visible */}
                            {creator.bio && (
                                <p className="text-sm mt-2 text-gray-600 max-w-2xl">{creator.bio}</p>
                            )}

                            {/* Followers / Following counts — always visible per spec */}
                            <div className="flex gap-4 sm:gap-6 mt-2 sm:mt-3">
                                <button onClick={() => setModalTab('followers')} className="text-center hover:opacity-70 transition-opacity">
                                    <p className="text-lg font-bold">{followersData.length}</p>
                                    <p className="text-xs text-muted-foreground">Followers</p>
                                </button>
                                <button onClick={() => setModalTab('following')} className="text-center hover:opacity-70 transition-opacity">
                                    <p className="text-lg font-bold">{followingData.length}</p>
                                    <p className="text-xs text-muted-foreground">Following</p>
                                </button>
                            </div>

                            {/* Action buttons */}
                            {!isOwnProfile && (
                                <div className="flex gap-2 mt-4">
                                    <FollowButton targetEmail={creatorEmail} me={me} />
                                    <BlockButton targetEmail={creatorEmail} me={me} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Content Section */}
                {canSeeContent ? (
                    <div>
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Film className="w-5 h-5" /> Recorded Streams
                        </h2>
                        {streams.length === 0 ? (
                            <Card>
                                <CardContent className="py-16 text-center text-muted-foreground">
                                    <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p>{isOwnProfile ? 'No streams posted yet' : "This creator hasn't posted any streams yet"}</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {streams.map((stream) => (
                                    <Card key={stream.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group">
                                        <div className="relative aspect-video bg-gradient-to-br from-gray-900 to-black flex items-center justify-center overflow-hidden">
                                            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/50 transition-colors" />
                                            <Film className="w-12 h-12 text-gray-400 group-hover:scale-110 transition-transform relative z-10" />
                                            {stream.video_url && (
                                                <video src={stream.video_url} className="absolute inset-0 w-full h-full object-cover group-hover:opacity-70 transition-opacity" />
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-20" />
                                            <p className="absolute bottom-3 left-3 right-3 text-white font-semibold text-sm truncate drop-shadow z-30">{stream.title}</p>
                                        </div>
                                        <CardContent className="p-3">
                                            <p className="text-xs text-muted-foreground">
                                                {new Date(stream.created_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </p>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* Private account wall */
                    <div className="text-center py-16 border-t">
                        <Lock className="w-14 h-14 mx-auto mb-4 text-muted-foreground opacity-40" />
                        <h3 className="text-xl font-semibold">This account is private</h3>
                        <p className="text-muted-foreground mt-2 max-w-xs mx-auto text-sm">
                            Follow {creator.full_name} to see their posts and reels.
                        </p>
                        <div className="mt-4 flex justify-center">
                            <FollowButton targetEmail={creatorEmail} me={me} />
                        </div>
                    </div>
                )}
            </div>

            {modalTab && (
                <FollowersFollowingModal
                    isOpen={!!modalTab}
                    onClose={() => setModalTab(null)}
                    targetEmail={creatorEmail}
                    defaultTab={modalTab}
                />
            )}
        </div>
    );
}