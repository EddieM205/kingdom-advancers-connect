import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MessageCircle, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { createNotification, NOTIF_TYPES } from '@/lib/notifications';
import CommentReactions from './CommentReactions';

export default function CommentsSection({ postId, me, postOwnerId }) {
    const [commentText, setCommentText] = useState('');
    const [replyingTo, setReplyingTo] = useState(null);
    const queryClient = useQueryClient();

    const { data: comments = [] } = useQuery({
        queryKey: ['post-comments', postId],
        queryFn: () => base44.entities.Comment.filter({ post_id: postId }, '-created_date'),
    });

    const createCommentMutation = useMutation({
        mutationFn: async (content) => {
            await base44.entities.Comment.create({
                content,
                post_id: postId,
                reply_to_comment_id: replyingTo?.id
            });
            // Notify the post/reel owner
            const targetEmail = replyingTo ? replyingTo.created_by : postOwnerId;
            if (targetEmail && targetEmail !== me?.email) {
                await createNotification({
                    recipient_id: targetEmail,
                    content: replyingTo
                        ? `${me.full_name} replied to your comment`
                        : `${me.full_name} commented on your post`,
                    link: '/Posts',
                    type: NOTIF_TYPES.COMMENT,
                    sender_avatar: me.avatar_url || '',
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['post-comments', postId] });
            setCommentText('');
            setReplyingTo(null);
        }
    });

    // Separate top-level comments and replies
    const topLevelComments = comments.filter(c => !c.reply_to_comment_id);
    const repliesByCommentId = comments.reduce((acc, c) => {
        if (c.reply_to_comment_id) {
            if (!acc[c.reply_to_comment_id]) acc[c.reply_to_comment_id] = [];
            acc[c.reply_to_comment_id].push(c);
        }
        return acc;
    }, {});

    const handleSubmit = () => {
        if (commentText.trim()) {
            createCommentMutation.mutate(commentText.trim());
        }
    };



    return (
        <div className="border-t border-gray-200 px-2 sm:px-3 pt-2 sm:pt-3 mt-2 sm:mt-3">
            {/* Comment input */}
            {me && (
                <div className="mb-3 sm:mb-4">
                    {replyingTo && (
                        <div className="mb-2 p-2 sm:p-2.5 bg-blue-50 rounded-lg border border-blue-200 flex justify-between items-start gap-2">
                            <span className="text-xs sm:text-sm text-blue-900 break-words">
                                Replying to <strong>{replyingTo.created_by?.split('@')[0]}</strong>
                            </span>
                            <button
                                onClick={() => setReplyingTo(null)}
                                className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                            >
                                ✕
                            </button>
                        </div>
                    )}
                    <div className="flex gap-2 sm:gap-2.5 items-end">
                        <Avatar className="w-7 h-7 sm:w-8 sm:h-8 flex-shrink-0">
                            <AvatarImage src={me.avatar_url} />
                            <AvatarFallback className="text-xs bg-gray-300">{me.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 flex gap-1.5 sm:gap-2 items-center">
                            <Input
                                value={commentText}
                                onChange={e => setCommentText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && commentText.trim() && handleSubmit()}
                                placeholder={replyingTo ? 'Write a reply...' : 'Write a comment...'}
                                className="bg-gray-100 border-0 rounded-full text-xs sm:text-sm text-gray-900 placeholder:text-gray-500 focus-visible:bg-gray-200 h-8 sm:h-9"
                            />
                            {commentText.trim() && (
                                <Button
                                    size="icon"
                                    onClick={handleSubmit}
                                    disabled={createCommentMutation.isPending}
                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0"
                                >
                                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Comments list */}
            <div className="space-y-2 sm:space-y-2.5">
                {comments.length === 0 ? (
                    <p className="text-center text-gray-500 py-2 sm:py-3 text-xs sm:text-sm">No comments yet</p>
                ) : (
                    comments.map(comment => (
                        <div key={comment.id} className={`flex gap-1.5 sm:gap-2 ${comment.reply_to_comment_id ? 'ml-4 sm:ml-6' : ''}`}>
                            <Avatar className="w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0 mt-0.5">
                                <AvatarFallback className="text-xs bg-gray-300">{comment.created_by?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <div className="bg-gray-100 rounded-2xl px-2.5 sm:px-3 py-1.5 sm:py-2">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{comment.created_by?.split('@')[0]}</p>
                                    <p className="text-xs sm:text-sm text-gray-800 break-words">{comment.content}</p>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3 mt-1 text-xs text-gray-600 ml-2 flex-wrap">
                                    <span className="text-xs">{formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}</span>
                                    <button
                                        onClick={() => setReplyingTo(comment)}
                                        className="font-semibold text-gray-700 hover:text-gray-900 transition-colors text-xs sm:text-sm"
                                    >
                                        Reply
                                    </button>
                                </div>
                                <div className="mt-1 ml-2">
                                    <CommentReactions commentId={comment.id} me={me} />
                                </div>
                            </div>
                        </div>
                    ))
                )}

            </div>
        </div>
    );
}