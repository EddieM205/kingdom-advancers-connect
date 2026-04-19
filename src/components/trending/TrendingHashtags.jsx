import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { Loader2, TrendingUp } from 'lucide-react';
import { extractHashtags } from '@/utils/hashtags';

export default function TrendingHashtags() {
    const { data: posts = [] } = useQuery({
        queryKey: ['all_posts_trending'],
        queryFn: () => base44.entities.Post.list('-created_date', 100),
    });

    const trendingTags = React.useMemo(() => {
        const tagCounts = {};
        posts.forEach(post => {
            const tags = extractHashtags(post.content);
            tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([tag, count]) => ({ tag, count }));
    }, [posts]);

    if (!trendingTags.length) {
        return (
            <div className="bg-card border border-border rounded-lg p-4">
                <h3 className="font-semibold flex items-center gap-2 mb-3">
                    <TrendingUp className="w-4 h-4" />
                    Trending Hashtags
                </h3>
                <p className="text-sm text-muted-foreground">No trending hashtags yet</p>
            </div>
        );
    }

    return (
        <div className="bg-card border border-border rounded-lg p-4">
            <h3 className="font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="w-4 h-4" />
                Trending Hashtags
            </h3>
            <div className="space-y-2">
                {trendingTags.map(({ tag, count }) => (
                    <Link
                        key={tag}
                        to={`/Discover?tag=${tag.substring(1)}`}
                        className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors group"
                    >
                        <span className="text-sm font-medium text-blue-500 group-hover:underline">
                            {tag}
                        </span>
                        <span className="text-xs text-muted-foreground">{count} posts</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}