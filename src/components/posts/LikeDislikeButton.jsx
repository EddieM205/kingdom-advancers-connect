import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function LikeDislikeButton({ postId, me }) {
    const queryClient = useQueryClient();

    const { data: userLike } = useQuery({
        queryKey: ['post-like', postId, me?.email],
        queryFn: () => base44.entities.Like.filter({
            post_id: postId,
            created_by: me?.email
        }),
        enabled: !!me,
    });

    const { data: likes = [] } = useQuery({
        queryKey: ['post-likes', postId],
        queryFn: () => base44.entities.Like.filter({ post_id: postId }),
    });

    const currentUserLike = userLike?.[0];
    const likeCount = likes.filter(l => l.type === 'like').length;
    const dislikeCount = likes.filter(l => l.type === 'dislike').length;

    const likeMutation = useMutation({
        mutationFn: async (type) => {
            if (currentUserLike) {
                if (currentUserLike.type === type) {
                    // Toggle off
                    await base44.entities.Like.delete(currentUserLike.id);
                } else {
                    // Change reaction
                    await base44.entities.Like.update(currentUserLike.id, { type });
                }
            } else {
                // Create new
                await base44.entities.Like.create({ post_id: postId, type });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['post-like', postId, me?.email] });
            queryClient.invalidateQueries({ queryKey: ['post-likes', postId] });
        }
    });

    if (!me) return null;

    return (
        <div className="flex items-center gap-0 border-t border-gray-200 -mb-2 mt-2 sm:mt-3 pt-2 sm:pt-3 mx-0">
            <Button
                variant="ghost"
                size="sm"
                onClick={() => likeMutation.mutate('like')}
                className={`flex-1 font-semibold text-xs sm:text-sm h-9 sm:h-10 rounded-none transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    currentUserLike?.type === 'like'
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentUserLike?.type === 'like' ? 'fill-blue-600' : ''}`} />
                <span className="hidden sm:inline">Like</span>
                {likeCount > 0 && <span className="text-xs">({likeCount})</span>}
            </Button>
            <div className="w-px h-9 sm:h-10 bg-gray-200" />
            <Button
                variant="ghost"
                size="sm"
                onClick={() => likeMutation.mutate('dislike')}
                className={`flex-1 font-semibold text-xs sm:text-sm h-9 sm:h-10 rounded-none transition-all duration-200 flex items-center justify-center gap-1 sm:gap-2 ${
                    currentUserLike?.type === 'dislike'
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-600 hover:bg-gray-100'
                }`}
            >
                <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${currentUserLike?.type === 'dislike' ? 'fill-red-600' : ''}`} />
                <span className="hidden sm:inline">Dislike</span>
                {dislikeCount > 0 && <span className="text-xs">({dislikeCount})</span>}
            </Button>
        </div>
    );
}