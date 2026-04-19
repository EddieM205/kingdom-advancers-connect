import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Heart, Gift } from 'lucide-react';

const REACTIONS = [
  { emoji: '❤️', label: 'heart' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '😂', label: 'laugh' },
  { emoji: '🙏', label: 'pray' },
  { emoji: '🎉', label: 'party' },
];

export default function ReactionButtons({ streamId, me, onReaction }) {
  const queryClient = useQueryClient();
  const [showReactions, setShowReactions] = useState(false);

  const reactionMutation = useMutation({
    mutationFn: (emoji) =>
      base44.entities.LiveReaction.create({
        stream_id: streamId,
        emoji,
        user_name: me?.full_name,
      }),
    onSuccess: (data) => {
      onReaction(data);
      queryClient.invalidateQueries({ queryKey: ['live-reactions', streamId] });
    },
  });

  const handleReaction = (emoji) => {
    reactionMutation.mutate(emoji);
    setShowReactions(false);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {showReactions && (
        <div className="flex flex-col items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-3 py-3 mb-2">
          {REACTIONS.map(({ emoji, label }) => (
            <button
              key={label}
              onClick={() => handleReaction(emoji)}
              className="text-2xl hover:scale-125 active:scale-110 transition-transform"
              title={label}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          onClick={() => setShowReactions(!showReactions)}
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full h-12 w-12"
        >
          {showReactions ? '✕' : <Heart className="w-6 h-6" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 rounded-full h-12 w-12"
        >
          <Gift className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
}