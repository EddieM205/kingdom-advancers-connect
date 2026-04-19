import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';
import StoryViewer from './StoryViewer';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';

const StorySkeleton = () => (
    <div className="flex flex-col items-center space-y-1.5 flex-shrink-0 w-14 sm:w-20">
        <Skeleton className="h-12 w-12 sm:h-16 sm:w-16 rounded-full" />
        <Skeleton className="h-3 w-12 sm:h-4 sm:w-16" />
    </div>
);

const StoryReelContent = ({ me }) => {
    const [viewingUser, setViewingUser] = useState(null);

    // Fetch blocked emails
    const { data: blockedEmails = [], isLoading: blocksLoading } = useQuery({
        queryKey: ['blocked_emails_stories', me?.email],
        queryFn: async () => {
            if (!me) return [];
            const blocks = await base44.entities.Block.filter({
                '$or': [
                    { blocker_email: me.email },
                    { blocked_email: me.email }
                ]
            });
            return blocks.map(b => 
                b.blocker_email === me.email ? b.blocked_email : b.blocker_email
            );
        },
        enabled: !!me,
    });

    // Fetch all active stories, visible to everyone
    const { data: visibleStories, isLoading: storiesLoading } = useQuery({
        queryKey: ['all_active_stories', blockedEmails],
        queryFn: async () => {
            const allStories = await base44.entities.Story.list("-created_date", 200);
            const now = new Date();
            const blockedSet = new Set(blockedEmails);
            return allStories.filter(s => 
                s.expires_at && 
                new Date(s.expires_at) > now &&
                !blockedSet.has(s.created_by)
            );
        },
        enabled: !!me && !blocksLoading,
    });
    
    const storiesByUser = useMemo(() => {
        if (!visibleStories) return {};
        return visibleStories.reduce((acc, story) => {
            (acc[story.created_by] = acc[story.created_by] || []).push(story);
            return acc;
        }, {});
    }, [visibleStories]);
    
    const storyAuthorEmails = useMemo(() => Object.keys(storiesByUser), [storiesByUser]);

    const { data: storyAuthors, isLoading: authorsLoading } = useQuery({
        queryKey: ['story_authors', storyAuthorEmails],
        queryFn: async () => {
            if (storyAuthorEmails.length === 0) return [];
            return base44.entities.User.filter({ email: { '$in': storyAuthorEmails } });
        },
        enabled: storyAuthorEmails.length > 0,
    });

    const orderedStoryUsers = useMemo(() => {
        if (!storyAuthors) return [];
        const allUsers = [...storyAuthors];
        const meInList = allUsers.find(u => u.email === me.email);
        if (!meInList && me) { // Ensure 'me' is valid before adding
             allUsers.push(me);
        }
        
        return allUsers.sort((a, b) => 
            a.email === me.email ? -1 : b.email === me.email ? 1 : 0
        );
    }, [storyAuthors, me]);

    const isLoading = storiesLoading || authorsLoading || blocksLoading;

    return (
        <>
            <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2 scrollbar-hide">
                <Link to={createPageUrl('CreateStory')} className="flex flex-col items-center space-y-1.5 flex-shrink-0 w-14 sm:w-20">
                    <div className="relative">
                        <Avatar className="h-12 w-12 sm:h-16 sm:w-16">
                            <AvatarImage src={me?.avatar_url} />
                            <AvatarFallback>{me?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 bg-primary rounded-full text-primary-foreground border-2 border-slate-800">
                            <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5 p-0.5" />
                        </div>
                    </div>
                    <span className="text-[10px] sm:text-xs font-medium text-center truncate w-full text-white/90">Add Story</span>
                </Link>

                {isLoading && !orderedStoryUsers?.length ? (
                    <>
                        <StorySkeleton />
                        <StorySkeleton />
                        <StorySkeleton />
                    </>
                ) : (
                    orderedStoryUsers.map(user => {
                        const userStories = storiesByUser[user.email] || [];
                        // Only display user if they have stories, or if it's the current user even if they don't
                        if (user.email !== me.email && userStories.length === 0) return null;
                        
                        // const latestStory = userStories.sort((a, b) => new Date(b.created_date) - new Date(a.created_date))[0]; // This variable is no longer needed after the simplification below

                        return (
                            <div
                                key={user.id}
                                className="flex flex-col items-center space-y-1.5 cursor-pointer flex-shrink-0 w-14 sm:w-20"
                                onClick={() => userStories.length > 0 && setViewingUser(user)}
                            >
                                <div className={`p-0.5 sm:p-1 rounded-full ${userStories.length > 0 ? 'bg-gradient-to-tr from-yellow-400 to-orange-500' : ''}`}>
                                    <div className="p-0.5 bg-slate-800 rounded-full">
                                        <Avatar className="h-11 w-11 sm:h-14 sm:w-14">
                                            <AvatarImage src={user.avatar_url} />
                                            <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                                <span className="text-[10px] sm:text-xs font-medium truncate w-full text-center text-white/90">
                                    {user.email === me.email ? "Your Story" : user.full_name}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>
            
            {viewingUser && (
                <StoryViewer
                    users={orderedStoryUsers.filter(u => (storiesByUser[u.email] || []).length > 0)}
                    initialUser={viewingUser}
                    storiesByUser={storiesByUser}
                    onClose={() => setViewingUser(null)}
                />
            )}
        </>
    );
};

export default function StoryReel() {
    const { data: me, isLoading: meLoading } = useQuery({ 
        queryKey: ['me'], 
        queryFn: () => base44.auth.me() 
    });

    return (
        <div className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border-t border-white/10">
            {meLoading ? (
                <div className="h-28 flex items-center">
                    <StorySkeleton />
                </div>
            ) : me ? (
                <StoryReelContent me={me} />
            ) : null}
        </div>
    );
}