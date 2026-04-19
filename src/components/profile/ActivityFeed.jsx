import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image, Users, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const ActivityItem = ({ icon: Icon, title, description, time, iconBg }) => (
    <div className="flex gap-3 items-start">
        <div className={`p-2 rounded-full ${iconBg}`}>
            <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground truncate">{description}</p>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">{time}</span>
    </div>
);

export default function ActivityFeed({ userEmail }) {
    const { data: posts, isLoading: postsLoading } = useQuery({
        queryKey: ['user_posts', userEmail],
        queryFn: () => base44.entities.Post.filter({ created_by: userEmail }, '-created_date', 5),
        enabled: !!userEmail,
    });

    const { data: stories, isLoading: storiesLoading } = useQuery({
        queryKey: ['user_stories', userEmail],
        queryFn: () => base44.entities.Story.filter({ created_by: userEmail }, '-created_date', 5),
        enabled: !!userEmail,
    });

    const { data: friendships, isLoading: friendsLoading } = useQuery({
        queryKey: ['user_friendships', userEmail],
        queryFn: () => base44.entities.Friend.filter({ 
            requester_email: userEmail, 
            status: 'accepted' 
        }, '-created_date', 5),
        enabled: !!userEmail,
    });

    const isLoading = postsLoading || storiesLoading || friendsLoading;

    const activities = React.useMemo(() => {
        const items = [];
        
        posts?.forEach(post => {
            items.push({
                id: `post-${post.id}`,
                icon: post.file_url ? Image : FileText,
                iconBg: 'bg-blue-500',
                title: 'Created a post',
                description: post.content?.substring(0, 50) + (post.content?.length > 50 ? '...' : ''),
                date: new Date(post.created_date),
            });
        });

        stories?.forEach(story => {
            items.push({
                id: `story-${story.id}`,
                icon: Image,
                iconBg: 'bg-purple-500',
                title: 'Shared a story',
                description: story.content || 'Photo/Video story',
                date: new Date(story.created_date),
            });
        });

        friendships?.forEach(f => {
            items.push({
                id: `friend-${f.id}`,
                icon: Users,
                iconBg: 'bg-green-500',
                title: 'Made a new friend',
                description: f.recipient_email,
                date: new Date(f.created_date),
            });
        });

        return items.sort((a, b) => b.date - a.date).slice(0, 10);
    }, [posts, stories, friendships]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                ) : activities.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                ) : (
                    <div className="space-y-4">
                        {activities.map(activity => (
                            <ActivityItem
                                key={activity.id}
                                icon={activity.icon}
                                iconBg={activity.iconBg}
                                title={activity.title}
                                description={activity.description}
                                time={formatDistanceToNow(activity.date, { addSuffix: true })}
                            />
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}