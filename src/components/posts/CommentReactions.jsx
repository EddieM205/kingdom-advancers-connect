import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Smile } from 'lucide-react';

const EMOJI_REACTIONS = ['❤️', '😂', '😮', '😢', '🔥'];

export default function CommentReactions({ commentId, me }) {
    const [showEmojis, setShowEmojis] = useState(false);
    const queryClient = useQueryClient();

    const { data: reactions = [] } = useQuery({
        queryKey: ['comment-reactions', commentId],
        queryFn: () => base44.entities.Reaction.filter({ comment_id: commentId }),
    });

    const addReactionMutation = useMutation({
        mutationFn: (emoji) => base44.entities.Reaction.create({
            comment_id: commentId,
            emoji,
            reactor_email: me?.email
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] });
            setShowEmojis(false);
        }
    });

    const removeReactionMutation = useMutation({
        mutationFn: (reactionId) => base44.entities.Reaction.delete(reactionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comment-reactions', commentId] });
        }
    });

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, r) => {
        if (!acc[r.emoji]) acc[r.emoji] = [];
        acc[r.emoji].push(r);
        return acc;
    }, {});

    if (!me) return null;

    return (
        <div className="relative">
            <div className="flex items-center gap-1 flex-wrap">
                {Object.entries(groupedReactions).map(([emoji, reacts]) => {
                    const userReacted = reacts.some(r => r.reactor_email === me.email);
                    return (
                        <button
                            key={emoji}
                            onClick={() => {
                                if (userReacted) {
                                    const userReaction = reacts.find(r => r.reactor_email === me.email);
                                    removeReactionMutation.mutate(userReaction.id);
                                } else {
                                    addReactionMutation.mutate(emoji);
                                }
                            }}
                            className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                userReacted
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {emoji} {reacts.length}
                        </button>
                    );
                })}

                <button
                    onClick={() => setShowEmojis(!showEmojis)}
                    className="p-1 rounded hover:bg-gray-100 text-gray-500"
                >
                    <Smile className="w-4 h-4" />
                </button>
            </div>

            {showEmojis && (
                <div className="absolute z-10 mt-1 flex gap-1 bg-white border rounded-lg shadow-lg p-2">
                    {EMOJI_REACTIONS.map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => addReactionMutation.mutate(emoji)}
                            className="text-lg hover:scale-125 transition-transform"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}