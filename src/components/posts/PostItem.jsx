import React, { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MoreHorizontal, Edit, Trash, Heart, Globe, Users, Flag } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { createNotification, NOTIF_TYPES } from "@/lib/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { getThemeClass } from '@/components/theming';
import CommentsSection from './CommentsSection';
import { Link } from 'react-router-dom';
import VideoPlayer from './VideoPlayer';
import InterestPrompt from '@/components/InterestPrompt';
import FollowButton from '@/components/profile/FollowButton';

const emojis = ["❤️", "😂", "😍", "😡", "🔥", "😢", "👍", "👎"];

export default function PostItem({ post, currentUserId, author, me }) {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(post.content);
    const [editedVisibility, setEditedVisibility] = useState(post.visibility);
    const [showReactions, setShowReactions] = useState(false);
    const [showInterestPrompt, setShowInterestPrompt] = useState(false);
    const [reportSent, setReportSent] = useState(false);

    const reportMutation = useMutation({
        mutationFn: () => base44.entities.Notification.create({
            recipient_id: 'admin',
            is_read: false,
            content: `REPORT: Post by ${author?.full_name || post.created_by} reported by ${me?.full_name || me?.email}. Post ID: ${post.id}. Content: ${post.content?.slice(0, 120)}`,
            link: '/AdminDashboard',
        }),
        onSuccess: () => setReportSent(true),
    });
    
    const themeClass = getThemeClass(post.theme);

    const { data: reactions = [] } = useQuery({
        queryKey: ["postReactions", post.id],
        queryFn: () => base44.entities.Reaction.filter({ story_id: post.id }),
    });

    const userReaction = reactions.find((r) => r.reactor_email === me?.email);

    const createReactionMutation = useMutation({
        mutationFn: async (emoji) => {
            await base44.entities.Reaction.create({ story_id: post.id, emoji, reactor_email: me.email });
            if (post.created_by && post.created_by !== me.email) {
                await createNotification({
                    recipient_id: post.created_by,
                    content: `${me.full_name} reacted ${emoji} to your post`,
                    link: '/Posts',
                    type: NOTIF_TYPES.REACTION,
                    sender_avatar: me.avatar_url || '',
                });
            }
            // Silent interest signal — reaction means the user is interested
            base44.entities.Interest.create({
                user_email: me.email,
                content_id: post.id,
                content_type: 'post',
                is_interested: true,
                content_creator_email: post.created_by,
                themes: post.theme ? [post.theme] : [],
                keywords: post.content?.split(/\s+/).slice(0, 5) || [],
            }).catch(() => {});
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["postReactions", post.id] }),
    });

    const deleteReactionMutation = useMutation({
        mutationFn: (reactionId) => base44.entities.Reaction.delete(reactionId),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["postReactions", post.id] }),
    });

    const handleEmojiClick = (emoji) => {
        if (userReaction?.emoji === emoji) {
            deleteReactionMutation.mutate(userReaction.id);
        } else {
            if (userReaction) deleteReactionMutation.mutate(userReaction.id);
            createReactionMutation.mutate(emoji);
            setShowInterestPrompt(true);
        }
        setShowReactions(false);
    };

    const updateMutation = useMutation({
      mutationFn: (updatedPost) => base44.entities.Post.update(post.id, updatedPost),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["feed_posts_visible"] });
        setIsEditing(false);
      }
    });

    const deleteMutation = useMutation({
        mutationFn: () => base44.entities.Post.delete(post.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feed_posts_visible"] });
        }
    });

    const handleUpdate = () => {
      updateMutation.mutate({ content: editedContent, visibility: editedVisibility });
    };

    return (
        <Card className={`${themeClass} w-full`}>
            <CardHeader className="flex flex-row items-start gap-3 sm:gap-4 p-3 sm:p-4">
                 <Link to={`/CreatorProfile?email=${author?.email}`} className="flex-shrink-0">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={author?.avatar_url} />
                        <AvatarFallback>{author?.full_name?.charAt(0) || 'U'}</AvatarFallback>
                    </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <Link to={`/CreatorProfile?email=${author?.email}`} className="font-bold hover:text-red-500 transition-colors truncate text-sm sm:text-base">
                            {author?.full_name}
                        </Link>
                        <div className="flex items-center gap-1 flex-shrink-0">
                            <FollowButton targetEmail={post.created_by} me={me} />
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0 hover:bg-black/10">
                                <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                {post.created_by === currentUserId ? (<>
                                <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                <Edit className="mr-2 h-4 w-4"/> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => deleteMutation.mutate()} className="text-red-500 focus:text-red-500" disabled={deleteMutation.isPending}>
                                <Trash className="mr-2 h-4 w-4"/> Delete
                                </DropdownMenuItem>
                                </>) : (
                                <DropdownMenuItem
                                    onClick={() => !reportSent && reportMutation.mutate()}
                                    disabled={reportSent || reportMutation.isPending}
                                    className="text-orange-600 focus:text-orange-600"
                                >
                                    <Flag className="mr-2 h-4 w-4"/>
                                    {reportSent ? 'Reported' : 'Report Post'}
                                </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                    <Link to={`/CreatorProfile?email=${author?.email}`} className="text-xs sm:text-sm opacity-80 hover:opacity-100 transition-opacity block truncate">
                        @{author?.handle || author?.email?.split('@')[0]}
                    </Link>
                    <time className="text-xs opacity-60 block mt-1">
                        {format(new Date(post.created_date), "MMM d, yyyy")}
                    </time>
                </div>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 space-y-3">
                 {isEditing ? (
                    <div className="space-y-2">
                      <Textarea value={editedContent} onChange={(e) => setEditedContent(e.target.value)} className="w-full bg-black/5 text-sm resize-none" />
                      <div className="space-y-2">
                        <label className="text-xs font-medium">Visibility</label>
                        <Select value={editedVisibility} onValueChange={setEditedVisibility}>
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public"><div className="flex items-center gap-2"><Globe className="w-4 h-4" /> Public</div></SelectItem>
                            <SelectItem value="friends"><div className="flex items-center gap-2"><Users className="w-4 h-4" /> Friends Only</div></SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setIsEditing(false); setEditedVisibility(post.visibility); }}>Cancel</Button>
                        <Button size="sm" onClick={handleUpdate} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <p className="whitespace-pre-wrap text-sm sm:text-base break-words flex-1">{post.content}</p>
                      {post.created_by === currentUserId && (
                        <div className="flex-shrink-0 ml-2">
                          {post.visibility === 'public' ? <Globe className="w-4 h-4 text-muted-foreground" /> : <Users className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      )}
                    </div>
                  )}
                {post.file_url && (
                    post.file_url.match(/\.(mp4|webm|mov|avi)$/i) ? (
                        <div className="mt-3"><VideoPlayer src={post.file_url} /></div>
                    ) : (
                        <img src={post.file_url} alt="Post attachment" className="mt-3 rounded-lg w-full object-cover max-h-96" />
                    )
                )}
                <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => setShowReactions(!showReactions)}
                                className="h-9 w-9 sm:h-10 sm:w-10"
                            >
                                <Heart className={`w-4 h-4 sm:w-5 sm:h-5 ${userReaction ? "fill-red-500 text-red-500" : ""}`} />
                            </Button>
                            {showReactions && (
                                <div className="absolute bottom-12 left-0 bg-white border border-gray-200 rounded-lg p-1 sm:p-2 flex gap-0.5 sm:gap-1 shadow-lg z-10">
                                    {emojis.map((emoji) => (
                                        <button
                                            key={emoji}
                                            onClick={() => handleEmojiClick(emoji)}
                                            className="text-lg sm:text-xl hover:scale-125 transition-transform"
                                        >
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {reactions.length > 0 && <span className="text-xs text-gray-600">{reactions.length}</span>}
                    </div>
                    {showInterestPrompt && me && (
                        <InterestPrompt
                            contentId={post.id}
                            contentType="post"
                            creatorEmail={post.created_by}
                            themes={post.theme ? [post.theme] : []}
                            keywords={post.content?.split(/\s+/).slice(0, 5) || []}
                            me={me}
                        />
                    )}
                </div>
            </CardContent>
            <CommentsSection postId={post.id} me={me} postOwnerId={post.created_by} />
        </Card>
    );
}