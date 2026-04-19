import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Heart, MessageCircle, Share2, MoreHorizontal, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";

const emojis = ["❤️", "😂", "😍", "😡", "🔥", "😢"];

export default function InstagramPostItem({ post, me }) {
  const queryClient = useQueryClient();
  const [showReactions, setShowReactions] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");

  const { data: reactions = [] } = useQuery({
    queryKey: ["postReactions", post.id],
    queryFn: () => base44.entities.Reaction.filter({ story_id: post.id }),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["postComments", post.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: post.id }),
  });

  const reactionCounts = emojis.reduce((acc, emoji) => {
    acc[emoji] = reactions.filter((r) => r.emoji === emoji).length;
    return acc;
  }, {});

  const userReaction = reactions.find((r) => r.reactor_email === me?.email);

  const createReactionMutation = useMutation({
    mutationFn: (emoji) =>
      base44.entities.Reaction.create({ story_id: post.id, emoji, reactor_email: me.email }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["postReactions", post.id] }),
  });

  const deleteReactionMutation = useMutation({
    mutationFn: (reactionId) => base44.entities.Reaction.delete(reactionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["postReactions", post.id] }),
  });

  const createCommentMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.Comment.create({ content, post_id: post.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["postComments", post.id] });
      setCommentText("");
    },
  });

  const handleEmojiClick = (emoji) => {
    if (userReaction?.emoji === emoji) {
      deleteReactionMutation.mutate(userReaction.id);
    } else {
      if (userReaction) deleteReactionMutation.mutate(userReaction.id);
      createReactionMutation.mutate(emoji);
    }
    setShowReactions(false);
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden max-w-md mx-auto shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <Link to={`/CreatorProfile?email=${post.created_by}`} className="flex items-center gap-3 hover:opacity-80">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{post.created_by?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-semibold text-gray-900">{post.created_by?.split("@")[0]}</p>
            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</p>
          </div>
        </Link>
        <Button size="icon" variant="ghost" className="text-gray-600">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Image */}
      {post.file_url && (
        <div className="w-full aspect-square bg-gray-100 overflow-hidden">
          <img src={post.file_url} alt="post" className="w-full h-full object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowReactions(!showReactions)}
              className="text-gray-600 hover:text-gray-900 h-9 w-9"
            >
              <Heart className={`w-6 h-6 ${userReaction ? "fill-red-500 text-red-500" : ""}`} />
            </Button>
            {showReactions && (
              <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-full p-2 flex gap-2 shadow-lg">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleEmojiClick(emoji)}
                    className="text-2xl hover:scale-125 transition-transform"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button size="icon" variant="ghost" onClick={() => setShowComments(!showComments)} className="text-gray-600 hover:text-gray-900 h-9 w-9">
            <MessageCircle className="w-6 h-6" />
          </Button>
          <Button size="icon" variant="ghost" className="text-gray-600 hover:text-gray-900 h-9 w-9">
            <Share2 className="w-6 h-6" />
          </Button>
        </div>
        <Button size="icon" variant="ghost" className="text-gray-600 hover:text-gray-900 h-9 w-9">
          <Bookmark className="w-6 h-6" />
        </Button>
      </div>

      {/* Reaction Count */}
      {totalReactions > 0 && (
        <div className="px-4 py-2 text-sm font-semibold text-gray-900">
          {totalReactions} {totalReactions === 1 ? "reaction" : "reactions"}
        </div>
      )}

      {/* Caption */}
      <div className="px-4 py-2 text-sm text-gray-900">
        <span className="font-semibold">{post.created_by?.split("@")[0]} </span>
        {post.content}
      </div>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-gray-100">
          <div className="px-4 py-3 max-h-48 overflow-y-auto space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="text-sm">
                <span className="font-semibold">{comment.created_by?.split("@")[0]} </span>
                <span className="text-gray-700">{comment.content}</span>
                <p className="text-xs text-gray-500 mt-1">{formatDistanceToNow(new Date(comment.created_date), { addSuffix: true })}</p>
              </div>
            ))}
          </div>

          {/* Comment Input */}
          {me && (
            <div className="border-t border-gray-100 p-4 flex items-center gap-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commentText.trim() && createCommentMutation.mutate(commentText)}
                placeholder="Add a comment..."
                className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {commentText.trim() && (
                <Button
                  size="sm"
                  onClick={() => createCommentMutation.mutate(commentText)}
                  className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4"
                >
                  Post
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}