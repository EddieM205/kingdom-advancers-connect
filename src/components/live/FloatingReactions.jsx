import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const EMOJIS = [
  { emoji: '❤️', label: 'heart' },
  { emoji: '👏', label: 'clap' },
  { emoji: '🔥', label: 'fire' },
  { emoji: '😂', label: 'laugh' },
  { emoji: '🙏', label: 'pray' },
  { emoji: '🎉', label: 'party' },
];

// Each floating particle
function FloatingEmoji({ emoji, id, onDone }) {
  const left = 10 + Math.random() * 80; // % from left
  const duration = 2500 + Math.random() * 1500; // ms
  const size = 24 + Math.floor(Math.random() * 20); // px

  useEffect(() => {
    const t = setTimeout(onDone, duration + 200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <span
      key={id}
      className="pointer-events-none absolute select-none"
      style={{
        left: `${left}%`,
        bottom: '70px',
        fontSize: `${size}px`,
        lineHeight: 1,
        animation: `floatUp ${duration}ms ease-out forwards`,
      }}
    >
      {emoji}
    </span>
  );
}

export default function FloatingReactions({ streamId, me }) {
  const queryClient = useQueryClient();
  const [particles, setParticles] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const REACTION_GROUP = `reaction_${streamId}`;

  // Poll for new reactions every 2s
  const { data: reactions = [] } = useQuery({
    queryKey: ['stream-reactions', streamId],
    queryFn: () => base44.entities.Reaction.filter({ story_id: REACTION_GROUP }, '-created_date', 20),
    refetchInterval: 2000,
  });

  // Track seen reaction IDs to avoid re-animating old ones
  const seenIds = useRef(new Set());

  useEffect(() => {
    reactions.forEach(r => {
      if (!seenIds.current.has(r.id)) {
        seenIds.current.add(r.id);
        const particleId = r.id + '_' + Date.now();
        setParticles(prev => [...prev, { id: particleId, emoji: r.emoji }]);
      }
    });
  }, [reactions]);

  const sendMutation = useMutation({
    mutationFn: async (emoji) => {
      const existing = reactions.find(r => r.reactor_email === me?.email && r.emoji === emoji);
      if (existing) {
        await base44.entities.Reaction.delete(existing.id);
      } else {
        await base44.entities.Reaction.create({
          story_id: REACTION_GROUP,
          emoji,
          reactor_email: me?.email,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stream-reactions', streamId] });
    },
  });

  const removeParticle = useCallback((id) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  return (
    <>
      {/* CSS keyframes injected once */}
      <style>{`
        @keyframes floatUp {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          60%  { opacity: 1; }
          100% { transform: translateY(-320px) scale(1.4); opacity: 0; }
        }
      `}</style>

      {/* Floating particles layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
        {particles.map(p => (
          <FloatingEmoji
            key={p.id}
            id={p.id}
            emoji={p.emoji}
            onDone={() => removeParticle(p.id)}
          />
        ))}
      </div>

      {/* Emoji picker — collapsed toggle on right side */}
      <div className="absolute right-2 bottom-[9rem] z-20 flex flex-col items-center gap-1">
        {/* Expanded emoji list */}
        {expanded && (
          <div className="flex flex-col items-center gap-1 bg-black/70 backdrop-blur-sm rounded-full px-1.5 py-2 mb-1">
            {EMOJIS.map(({ emoji, label }) => {
              const hasReacted = reactions.some(r => r.reactor_email === me?.email && r.emoji === emoji);
              return (
                <button
                  key={label}
                  onClick={() => { sendMutation.mutate(emoji); setExpanded(false); }}
                  title={label}
                  className={`text-lg hover:scale-125 active:scale-110 transition-transform select-none rounded-full p-0.5 ${hasReacted ? 'bg-white/20 ring-1 ring-white/50' : ''}`}
                >
                  {emoji}
                </button>
              );
            })}
          </div>
        )}
        {/* Toggle button */}
        <button
          onClick={() => setExpanded(prev => !prev)}
          className="text-xl bg-black/60 backdrop-blur-sm rounded-full w-8 h-8 flex items-center justify-center hover:bg-black/80 transition-colors"
        >
          {expanded ? '✕' : '😊'}
        </button>
      </div>
    </>
  );
}