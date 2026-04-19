import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";
import PostItem from "../components/posts/PostItem";
import { buildInterestScoreMap, rankPosts } from "@/lib/feedRanking";
import { useBlockedEmails } from "@/lib/useBlockedEmails";

const PostFeed = ({ me }) => {
    const blockedSet = useBlockedEmails(me?.email);
    const blocksLoading = false;

    // Who I follow
    const { data: myFollows = [], isLoading: followsLoading } = useQuery({
        queryKey: ['my_follows', me?.email],
        queryFn: () => base44.entities.Follow.filter({ follower_email: me.email }),
        enabled: !!me,
    });

    const followingSet = useMemo(() => new Set(myFollows.map(f => f.following_email)), [myFollows]);

    // My interest records for scoring
    const { data: myInterests = [] } = useQuery({
        queryKey: ['user_interests', me?.email],
        queryFn: () => base44.entities.Interest.filter({ user_email: me.email }),
        enabled: !!me,
    });

    const interestScoreMap = useMemo(() => buildInterestScoreMap(myInterests), [myInterests]);

    // All visible posts
    const { data: posts, isLoading: postsLoading } = useQuery({
        queryKey: ["feed_posts_visible", me?.email, [...blockedSet]],
        queryFn: async () => {
            const publicPosts = await base44.entities.Post.filter({ visibility: 'public' }, "-created_date", 100);
            const myPosts = await base44.entities.Post.filter({ visibility: 'friends', created_by: me.email }, "-created_date", 50);
            const all = [...publicPosts, ...myPosts].filter(p => !blockedSet.has(p.created_by));
            return Array.from(new Map(all.map(p => [p.id, p])).values());
        },
        enabled: !!me && !blocksLoading,
    });

    // Ranked posts
    const rankedPosts = useMemo(() => {
        if (!posts) return [];
        return rankPosts(posts, followingSet, interestScoreMap);
    }, [posts, followingSet, interestScoreMap]);

    const authorEmails = useMemo(() => [...new Set(rankedPosts.map(p => p.created_by))], [rankedPosts]);

    const { data: postAuthors = [], isLoading: authorsLoading } = useQuery({
        queryKey: ["postAuthors", authorEmails],
        queryFn: () => base44.entities.User.filter({ email: { '$in': authorEmails } }),
        enabled: authorEmails.length > 0,
    });

    const authorMap = useMemo(() => {
        return postAuthors.reduce((acc, user) => { acc[user.email] = user; return acc; }, {});
    }, [postAuthors]);

    const isLoading = followsLoading || postsLoading || blocksLoading;

    if (isLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>;

    if (!rankedPosts.length) return (
        <div className="text-center py-16">
            <h3 className="text-xl font-semibold">Your Feed is Empty</h3>
            <p className="text-gray-500 mt-2">Follow people to see their posts here first!</p>
        </div>
    );

    return (
        <div className="space-y-4">
            {rankedPosts.map((post) => {
                const author = authorMap[post.created_by];
                if (!author && authorsLoading) return <div key={post.id} className="h-48 bg-gray-100 rounded-lg animate-pulse" />;
                return <PostItem key={post.id} post={post} currentUserId={me?.email} author={author} me={me} />;
            })}
        </div>
    );
};

export default function PostsPage() {
    const { data: me, isLoading: meLoading } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me()
    });

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto max-w-3xl px-3 sm:px-4 md:px-8 py-4">
                {meLoading ? (
                    <div className="flex items-center justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-gray-500" /></div>
                ) : me ? (
                    <PostFeed me={me} />
                ) : (
                    <div className="text-center py-16 text-red-500">
                        <h3 className="text-xl font-semibold">Authentication Error</h3>
                        <p>Could not load your user profile. Please try refreshing.</p>
                    </div>
                )}
            </div>
        </div>
    );
}