import React, { useState, useRef, useEffect, useCallback } from "react";
import InterestPrompt from "@/components/InterestPrompt";
import FollowButton from "@/components/profile/FollowButton";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Heart, MessageCircle, Share2, MoreHorizontal, Play,
  Volume2, VolumeX, X, Send, Globe, Users, Edit, Trash,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const REACTION_EMOJIS = ["❤️", "😂", "😍", "🔥", "😢", "🙏"];

export default function ReelCard({ reel, me }) {
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const playIconTimer = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editedVisibility, setEditedVisibility] = useState(reel.visibility);
  const [showInterestPrompt, setShowInterestPrompt] = useState(false);

  /* ── Queries ───────────────────────────────────────────── */
  const { data: reactions = [] } = useQuery({
    queryKey: ["reelReactions", reel.id],
    queryFn: () => base44.entities.ReelReaction.filter({ reel_id: reel.id }),
    refetchInterval: 15000,
  });

  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ["reelComments", reel.id],
    queryFn: () => base44.entities.Comment.filter({ post_id: reel.id }),
    enabled: showComments,
  });

  const totalReactions = reactions.length;
  const userReaction = reactions.find(r => r.reactor_email === me?.email);

  /* ── Mutations ─────────────────────────────────────────── */
  const updateReelMutation = useMutation({
    mutationFn: (data) => base44.entities.Reel.update(reel.id, data),
    onSuccess: () => { queryClient.invalidateQueries(['reels']); setIsEditing(false); },
  });

  const deleteReelMutation = useMutation({
    mutationFn: () => base44.entities.Reel.delete(reel.id),
    onSuccess: () => queryClient.invalidateQueries(['reels']),
  });

  const createReactionMutation = useMutation({
    mutationFn: async (emoji) => {
      // Remove existing reaction first
      if (userReaction) {
        await base44.entities.ReelReaction.delete(userReaction.id);
      }
      // If tapping the same emoji → just unreact (done)
      if (userReaction?.emoji === emoji) return null;
      // Create new reaction
      const result = await base44.entities.ReelReaction.create({ reel_id: reel.id, emoji });
      if (reel.created_by && reel.created_by !== me?.email) {
        base44.entities.Notification.create({
          recipient_id: reel.created_by,
          content: `${me?.full_name || 'Someone'} reacted ${emoji} to your reel`,
          link: '/Reels',
        }).catch(() => {});
      }
      base44.entities.Interest.create({
        user_email: me?.email,
        content_id: reel.id,
        content_type: 'reel',
        is_interested: true,
        content_creator_email: reel.created_by,
        themes: reel.themes || [],
        keywords: reel.caption?.split(/\s+/).slice(0, 5) || [],
      }).catch(() => {});
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reelReactions", reel.id] });
      setShowReactions(false);
      setShowInterestPrompt(true);
    },
  });

  const createCommentMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.Comment.create({ content, post_id: reel.id });
      if (reel.created_by && reel.created_by !== me?.email) {
        base44.entities.Notification.create({
          recipient_id: reel.created_by,
          content: `${me?.full_name || 'Someone'} commented on your reel`,
          link: '/Reels',
        }).catch(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reelComments", reel.id] });
      setNewComment('');
    },
  });

  /* ── IntersectionObserver: auto-play when in view ──────── */
  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          video.play().then(() => setIsPlaying(true)).catch(() => {});
        } else {
          video.pause();
          video.currentTime = 0;
          setIsPlaying(false);
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* ── Tap to play / pause ───────────────────────────────── */
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    } else {
      video.pause();
      setIsPlaying(false);
    }
    setShowPlayIcon(true);
    clearTimeout(playIconTimer.current);
    playIconTimer.current = setTimeout(() => setShowPlayIcon(false), 800);
  }, []);

  const toggleMute = useCallback((e) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  }, []);

  /* ── Cleanup timer on unmount ──────────────────────────── */
  useEffect(() => () => clearTimeout(playIconTimer.current), []);

  const displayName = reel.creator_name || reel.created_by_name || reel.created_by?.split('@')[0] || 'User';

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black overflow-hidden select-none">

      {/* ── Video ─────────────────────────────────────────── */}
      <video
        ref={videoRef}
        src={reel.video_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        muted={isMuted}
        playsInline
        onClick={togglePlay}
      />

      {/* ── Play/Pause flash icon ──────────────────────────── */}
      {showPlayIcon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center animate-pulse">
            {isPlaying ? (
              <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-8 bg-white rounded-full" />
                <div className="w-1.5 h-8 bg-white rounded-full" />
              </div>
            ) : (
              <Play className="w-8 h-8 text-white fill-white ml-1" />
            )}
          </div>
        </div>
      )}

      {/* ── Edit visibility overlay ────────────────────────── */}
      {isEditing && (
        <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center z-20 gap-4 px-8">
          <p className="text-white font-semibold">Change Visibility</p>
          <Select value={editedVisibility} onValueChange={setEditedVisibility}>
            <SelectTrigger className="w-44 bg-gray-800 border-gray-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="public">
                <div className="flex items-center gap-2"><Globe className="w-4 h-4" />Public</div>
              </SelectItem>
              <SelectItem value="friends">
                <div className="flex items-center gap-2"><Users className="w-4 h-4" />Friends Only</div>
              </SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" onClick={() => { setIsEditing(false); setEditedVisibility(reel.visibility); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={() => updateReelMutation.mutate({ visibility: editedVisibility })} disabled={updateReelMutation.isPending}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* ── Bottom gradient ────────────────────────────────── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-[1]"
        style={{ height: '65%', background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
      />

      {/* ── Creator info + caption (bottom-left) ──────────── */}
      <div className="absolute bottom-8 left-4 right-20 z-[2]">
        <div className="flex items-center gap-2 mb-2">
          <Avatar className="w-9 h-9 ring-2 ring-white flex-shrink-0">
            <AvatarImage src={reel.avatar_url} />
            <AvatarFallback className="bg-gray-700 text-white text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-white font-semibold text-sm drop-shadow">{displayName}</span>
          <FollowButton targetEmail={reel.created_by} me={me} dark />
        </div>
        {reel.caption && (
          <p className="text-white text-sm leading-snug line-clamp-2 drop-shadow">{reel.caption}</p>
        )}
      </div>

      {/* ── Right side action buttons ──────────────────────── */}
      <div className="absolute right-3 bottom-8 flex flex-col items-center gap-5 z-[2]">
        {/* Mute toggle */}
        <button onClick={toggleMute} className="active:scale-90 transition-transform">
          {isMuted
            ? <VolumeX className="w-7 h-7 text-white drop-shadow-lg" />
            : <Volume2 className="w-7 h-7 text-white drop-shadow-lg" />}
        </button>

        {/* Like / Reaction */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => setShowReactions(v => !v)}
            className="active:scale-90 transition-transform"
          >
            <Heart
              className={`w-7 h-7 drop-shadow-lg transition-colors ${
                userReaction ? 'fill-red-500 text-red-500' : 'text-white'
              }`}
            />
          </button>
          {totalReactions > 0 && (
            <span className="text-white text-xs font-semibold drop-shadow">{totalReactions}</span>
          )}
        </div>

        {/* Comment */}
        <div className="flex flex-col items-center gap-0.5">
          <button
            onClick={() => { setShowComments(true); refetchComments(); }}
            className="active:scale-90 transition-transform"
          >
            <MessageCircle className="w-7 h-7 text-white drop-shadow-lg" />
          </button>
          {comments.length > 0 && (
            <span className="text-white text-xs font-semibold drop-shadow">{comments.length}</span>
          )}
        </div>

        {/* Share */}
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const url = `${window.location.origin}/Reels`;
            try {
              if (navigator.share) { await navigator.share({ title: reel.caption || 'Reel', url }); return; }
            } catch (_) {}
            try { await navigator.clipboard.writeText(url); } catch (_) {}
          }}
          className="active:scale-90 transition-transform"
        >
          <Share2 className="w-7 h-7 text-white drop-shadow-lg" />
        </button>

        {/* Owner actions */}
        {me?.email === reel.created_by && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="active:scale-90 transition-transform" onClick={e => e.stopPropagation()}>
                <MoreHorizontal className="w-7 h-7 text-white drop-shadow-lg" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4 mr-2" /> Edit Visibility
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => deleteReelMutation.mutate()} className="text-red-500">
                <Trash className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* ── Reaction emoji picker ──────────────────────────── */}
      {showReactions && (
        <div
          className="absolute right-16 bottom-44 z-20 bg-black/90 backdrop-blur-md rounded-2xl px-3 py-2.5 flex gap-2 shadow-2xl border border-white/10"
          onClick={e => e.stopPropagation()}
        >
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => createReactionMutation.mutate(emoji)}
              disabled={createReactionMutation.isPending}
              className={`text-2xl p-1 rounded-xl transition-transform hover:scale-125 active:scale-110
                ${userReaction?.emoji === emoji ? 'bg-white/20 ring-2 ring-white/50 scale-110' : ''}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* ── Comments bottom sheet ──────────────────────────── */}
      {showComments && (
        <div
          className="absolute inset-x-0 bottom-0 z-30 bg-gray-950/96 backdrop-blur-md rounded-t-3xl flex flex-col"
          style={{ maxHeight: '65%' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle bar */}
          <div className="flex justify-center pt-2.5 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-600" />
          </div>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-800 flex-shrink-0">
            <h3 className="text-white font-semibold">Comments</h3>
            <button onClick={() => setShowComments(false)} className="text-gray-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
          {/* List */}
          <div className="flex-1 overflow-y-auto px-5 py-3 space-y-4">
            {comments.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-6">No comments yet. Be the first!</p>
            )}
            {comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8 flex-shrink-0">
                  <AvatarFallback className="bg-gray-700 text-white text-xs">
                    {comment.created_by?.charAt(0)?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold text-gray-400">
                    {comment.created_by?.split('@')[0]}
                  </p>
                  <p className="text-sm text-white mt-0.5">{comment.content}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Input */}
          {me && (
            <div className="flex gap-3 px-4 py-3 border-t border-gray-800 flex-shrink-0" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarImage src={me.avatar_url} />
                <AvatarFallback className="bg-gray-700 text-white text-xs">
                  {me.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Input
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newComment.trim() && createCommentMutation.mutate(newComment.trim())}
                placeholder="Add a comment..."
                className="bg-gray-800 border-gray-700 text-white text-sm h-9 rounded-full flex-1 placeholder:text-gray-500"
              />
              {newComment.trim() && (
                <button
                  onClick={() => createCommentMutation.mutate(newComment.trim())}
                  disabled={createCommentMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Interest prompt ────────────────────────────────── */}
      {showInterestPrompt && me && (
        <div className="absolute bottom-32 left-4 right-16 z-20 bg-gray-900/95 rounded-2xl px-3 py-2">
          <InterestPrompt
            contentId={reel.id}
            contentType="reel"
            creatorEmail={reel.created_by}
            themes={reel.themes || []}
            keywords={reel.caption?.split(/\s+/).slice(0, 5) || []}
            me={me}
          />
        </div>
      )}
    </div>
  );
}
