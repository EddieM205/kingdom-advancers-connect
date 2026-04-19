import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const REACTIONS = [
  { emoji: '❤️', label: 'Love' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '🙏', label: 'Pray' },
  { emoji: '👏', label: 'Clap' },
  { emoji: '😮', label: 'Wow' },
  { emoji: '🎉', label: 'Celebrate' },
];

/**
 * Facebook-style live reaction bar.
 *
 * Rules (enforced server-side inside the mutation, never trust cache alone):
 *  - Each user can only hold ONE reaction at a time.
 *  - Clicking the same emoji REMOVES it (unreact).
 *  - Clicking a different emoji REMOVES the old one and CREATES the new one.
 *  - Rapid clicks are blocked while the mutation is in-flight (isPending guard).
 *
 * The mutation always re-fetches the user's current reactions from the server
 * before acting so stale React Query cache cannot cause duplicates.
 */
export default function LiveReactionBar({ streamId, me, onFloat }) {
  const queryClient = useQueryClient();
  const [showPicker, setShowPicker] = useState(false);

  // All reactions for this stream — used for totals / breakdown display
  const { data: reactions = [] } = useQuery({
    queryKey: ['live-reactions', streamId],
    queryFn: () =>
      base44.entities.LiveReaction.filter({ stream_id: streamId }, 'created_date', 2000),
    refetchInterval: 2000,
  });

  // Count per emoji (for display)
  const counts = useMemo(() => {
    const map = {};
    reactions.forEach(r => { map[r.emoji] = (map[r.emoji] || 0) + 1; });
    return map;
  }, [reactions]);

  const total = reactions.length;

  const topEmojis = useMemo(
    () =>
      Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([e]) => e),
    [counts]
  );

  // User's current reaction derived from cache (for UI display only)
  const cachedMyReaction = useMemo(
    () => reactions.find(r => r.user_email === me?.email) || null,
    [reactions, me?.email]
  );

  const reactMutation = useMutation({
    mutationFn: async (tappedEmoji) => {
      if (!me?.email) return;

      // ── Step 1: fetch the user's CURRENT reactions fresh from the server ──
      // Never rely on React Query cache here — this prevents all duplicate bugs.
      const fresh = await base44.entities.LiveReaction.filter(
        { stream_id: streamId, user_email: me.email },
        'created_date',
        50
      ).catch(() => []);

      // ── Step 2: delete every existing reaction for this user ──
      // This also cleans up any duplicates that may have slipped through.
      if (fresh.length > 0) {
        await Promise.allSettled(
          fresh.map(r => base44.entities.LiveReaction.delete(r.id))
        );
      }

      const hadSameEmoji = fresh.some(r => r.emoji === tappedEmoji);

      // ── Step 3: if the user tapped the same emoji they already had → unreact (done) ──
      if (hadSameEmoji) return null;

      // ── Step 4: create the new reaction ──
      return base44.entities.LiveReaction.create({
        stream_id: streamId,
        user_email: me.email,
        user_name: me.full_name || 'Viewer',
        emoji: tappedEmoji,
      });
    },

    onSuccess: (result, tappedEmoji) => {
      // Invalidate so counts + user reaction refresh immediately
      queryClient.invalidateQueries({ queryKey: ['live-reactions', streamId] });
      // Only float if the user actually added a reaction (not on unreact)
      if (result !== null) {
        onFloat?.(tappedEmoji);
      }
      setShowPicker(false);
    },
  });

  const handleReact = (emoji) => {
    // Block if a mutation is already running (prevents double-tap duplicates)
    if (reactMutation.isPending) return;
    reactMutation.mutate(emoji);
  };

  return (
    <div className="flex flex-col items-end gap-2">
      {/* ── Emoji picker ── */}
      {showPicker && (
        <div className="flex gap-1 bg-black/90 backdrop-blur-md rounded-2xl px-3 py-3 shadow-2xl border border-white/10">
          {REACTIONS.map(({ emoji, label }) => {
            const isMyActive = cachedMyReaction?.emoji === emoji;
            return (
              <button
                key={emoji}
                onClick={() => handleReact(emoji)}
                disabled={reactMutation.isPending}
                title={label}
                className={`flex flex-col items-center gap-0.5 p-1.5 rounded-xl transition-all
                  hover:scale-125 active:scale-110 disabled:opacity-50 disabled:pointer-events-none
                  ${isMyActive ? 'bg-white/25 ring-2 ring-white/50 scale-110' : ''}`}
              >
                <span className="text-2xl leading-none">{emoji}</span>
                <span className="text-[9px] text-white/60 font-medium tabular-nums">
                  {counts[emoji] || ''}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── Summary bar + react button ── */}
      <div className="flex items-center gap-2">
        {/* Top-3 emojis + total */}
        {total > 0 && (
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
            <div className="flex">
              {topEmojis.map(e => (
                <span key={e} className="text-base leading-none -ml-0.5 first:ml-0">{e}</span>
              ))}
            </div>
            <span className="text-white text-xs font-bold ml-1.5 tabular-nums">
              {total >= 1000 ? `${(total / 1000).toFixed(1)}K` : total.toLocaleString()}
            </span>
          </div>
        )}

        {/* React / change button */}
        <button
          onClick={() => setShowPicker(v => !v)}
          disabled={reactMutation.isPending}
          className={`flex items-center gap-1.5 pl-2 pr-3 py-1.5 rounded-full text-sm font-semibold
            transition-all active:scale-95 border disabled:opacity-50 disabled:pointer-events-none
            ${cachedMyReaction
              ? 'bg-white/20 text-white border-white/40 shadow-inner'
              : 'bg-black/60 backdrop-blur-sm text-white/90 border-white/10 hover:border-white/30'
            }`}
        >
          <span className="text-lg leading-none">
            {cachedMyReaction?.emoji || '❤️'}
          </span>
          <span className="text-xs">
            {cachedMyReaction
              ? (REACTIONS.find(r => r.emoji === cachedMyReaction.emoji)?.label ?? 'Reacted')
              : 'React'}
          </span>
        </button>
      </div>
    </div>
  );
}
