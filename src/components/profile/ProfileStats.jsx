import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Users, UserPlus, Image } from 'lucide-react';
import FollowersFollowingModal from './FollowersFollowingModal';

const StatItem = ({ icon: Icon, value, label, color, onClick }) => (
    <div
        className={`flex flex-col items-center p-4 ${onClick ? 'cursor-pointer hover:bg-muted/50 transition-colors rounded-lg' : ''}`}
        onClick={onClick}
    >
        <div className={`p-3 rounded-full ${color} mb-2`}>
            <Icon className="w-5 h-5 text-white" />
        </div>
        <span className="text-2xl font-bold">{value}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
    </div>
);

export default function ProfileStats({ userEmail }) {
    const [modalTab, setModalTab] = useState(null); // 'followers' | 'following' | null
    const { data: posts } = useQuery({
        queryKey: ['user_posts_count', userEmail],
        queryFn: () => base44.entities.Post.filter({ created_by: userEmail }),
        enabled: !!userEmail,
    });

    const { data: stories } = useQuery({
        queryKey: ['user_stories_count', userEmail],
        queryFn: () => base44.entities.Story.filter({ created_by: userEmail }),
        enabled: !!userEmail,
    });

    const { data: followers } = useQuery({
        queryKey: ['user_followers_count', userEmail],
        queryFn: () => base44.entities.Follow.filter({ following_email: userEmail }),
        enabled: !!userEmail,
    });

    const { data: following } = useQuery({
        queryKey: ['user_following_count', userEmail],
        queryFn: () => base44.entities.Follow.filter({ follower_email: userEmail }),
        enabled: !!userEmail,
    });

    return (
        <>
            <Card>
                <CardContent className="p-2">
                    <div className="grid grid-cols-4 divide-x">
                        <StatItem icon={FileText} value={posts?.length || 0} label="Posts" color="bg-blue-500" />
                        <StatItem icon={Image} value={stories?.length || 0} label="Stories" color="bg-purple-500" />
                        <StatItem icon={Users} value={followers?.length || 0} label="Followers" color="bg-green-500" onClick={() => setModalTab('followers')} />
                        <StatItem icon={UserPlus} value={following?.length || 0} label="Following" color="bg-orange-500" onClick={() => setModalTab('following')} />
                    </div>
                </CardContent>
            </Card>
            {modalTab && (
                <FollowersFollowingModal
                    isOpen={!!modalTab}
                    onClose={() => setModalTab(null)}
                    targetEmail={userEmail}
                    defaultTab={modalTab}
                />
            )}
        </>
    );
}