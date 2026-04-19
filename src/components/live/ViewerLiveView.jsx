import React, { useEffect, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Users, MessageCircle, Share2, Clock, Radio } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import StreamChat from './StreamChat';
import FloatingHearts from './FloatingHearts';
import LiveReactionBar from './LiveReactionBar';

function formatDuration(startDate) {
  const s = Math.floor((Date.now() - new Date(startDate).getTime()) / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

export default function ViewerLiveView({ stream, me, onLeave }) {
  const queryClient = useQueryClient();

  const [showChat,   setShowChat]   = useState(true);
  const [handRaised, setHandRaised] = useState(false);
  const [floats,     setFloats]     = useState([]);
  const [duration,   setDuration]   = useState('00:00');
  const [copied,     setCopied]     = useState(false);

  /* ── poll live stream for viewer count + pinned message ── */
  const { data: liveStream } = useQuery({
    queryKey: ['live-stream-detail', stream.id],
    queryFn: () =>
      base44.entities.LiveStream.filter({ id: stream.id }, 'created_date', 1).then(r => r[0]),
    refetchInterval: 4000,
  });

  const pinnedMessage = liveStream?.pinned_message || null;

  /* ── duration ticker ──────────────────────────────────── */
  useEffect(() => {
    setDuration(formatDuration(stream.created_date));
    const id = setInterval(() => setDuration(formatDuration(stream.created_date)), 1000);
    return () => clearInterval(id);
  }, [stream.created_date]);

  /* ── viewer count: +1 on join, -1 on leave ────────────── */
  useEffect(() => {
    const joined = (stream.viewer_count || 0) + 1;
    base44.entities.LiveStream.update(stream.id, { viewer_count: joined }).catch(() => {});
    return () => {
      base44.entities.LiveStream.update(stream.id, {
        viewer_count: Math.max(0, joined - 1),
      }).catch(() => {});
    };
  }, [stream.id]);

  /* ── helpers ──────────────────────────────────────────── */
  const addFloat = (emoji) => {
    const id = Date.now() + Math.random();
    setFloats(p => [...p, { id, emoji }]);
    setTimeout(() => setFloats(p => p.filter(r => r.id !== id)), 3000);
  };

  const raiseHand = async () => {
    if (handRaised) { setHandRaised(false); return; }
    try {
      await base44.entities.LiveChat.create({
        stream_id:   stream.id,
        content:     `__HAND__:${me?.full_name || 'Viewer'}`,
        user_name:   me?.full_name,
        user_avatar: me?.avatar_url,
      });
      setHandRaised(true);
      addFloat('✋');
    } catch (_) {}
  };

  const shareStream = async () => {
    const url = `${window.location.origin}/LiveStreams`;
    try {
      if (navigator.share) {
        await navigator.share({ title: stream.title, text: `Join ${stream.host_name}'s live stream!`, url });
        return;
      }
    } catch (_) {}
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {}
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden z-[9999] flex flex-col">

      {/* Floating reactions */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 3 }}>
        <FloatingHearts reactions={floats} />
      </div>

      {/* ── TOP BAR ───────────────────────────────────────── */}
      <div
        className="relative flex items-center justify-between px-4 pt-5 pb-3 flex-shrink-0"
        style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,0.8) 0%,transparent 100%)', zIndex: 4 }}
      >
        <button
          onClick={onLeave}
          className="w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-xs text-gray-200 tabular-nums">{duration}</span>
          </div>
          <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Users className="w-3 h-3 text-gray-300" />
            <span className="text-xs text-gray-200 tabular-nums">
              {liveStream?.viewer_count ?? stream.viewer_count ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="text-xs font-bold tracking-wide">LIVE</span>
          </div>
        </div>
      </div>

      {/* ── HOST CARD ─────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center flex-1 px-6 gap-5" style={{ zIndex: 2 }}>
        {/* Pulsing live ring around avatar */}
        <div className="relative">
          <span className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" style={{ animationDuration: '2s' }} />
          <span className="absolute inset-0 rounded-full bg-red-500 opacity-10 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
          <Avatar className="w-28 h-28 ring-4 ring-red-500 relative">
            <AvatarImage src={stream.host_avatar} className="object-cover" />
            <AvatarFallback className="bg-gray-800 text-4xl text-white">
              {stream.host_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          {/* Live indicator dot */}
          <div className="absolute bottom-1 right-1 w-5 h-5 bg-red-600 rounded-full flex items-center justify-center ring-2 ring-black">
            <Radio className="w-3 h-3 text-white" />
          </div>
        </div>

        <div className="text-center">
          <p className="text-xl font-bold text-white">{stream.host_name}</p>
          <p className="text-sm text-gray-300 mt-1 max-w-xs line-clamp-2">{stream.title}</p>
          <p className="text-xs text-gray-500 mt-2">Broadcasting live</p>
        </div>

        {/* Pinned message */}
        {pinnedMessage && (
          <div className="flex items-start gap-2 bg-amber-500/20 border border-amber-500/40 rounded-2xl px-4 py-3 max-w-sm w-full">
            <span className="text-lg flex-shrink-0">📌</span>
            <p className="text-amber-200 text-sm leading-snug">{pinnedMessage}</p>
          </div>
        )}
      </div>

      {/* ── BOTTOM AREA ────────────────────────────────────── */}
      <div
        className="relative flex items-end gap-2 px-4 pb-8 flex-shrink-0"
        style={{ background: 'linear-gradient(to top,rgba(0,0,0,0.9) 0%,transparent 100%)', zIndex: 4 }}
      >
        {/* Chat */}
        <div className="flex-1 min-w-0 max-w-[72%]">
          {showChat && <StreamChat streamId={stream.id} me={me} isHost={false} />}
        </div>

        {/* Side buttons */}
        <div className="flex flex-col items-center gap-3 pb-1 flex-shrink-0">
          {/* Share */}
          <button
            onClick={shareStream}
            className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all"
            title={copied ? 'Copied!' : 'Share stream'}
          >
            {copied
              ? <span className="text-xs font-bold text-green-400">✓</span>
              : <Share2 className="w-5 h-5" />}
          </button>

          {/* Raise hand */}
          <button
            onClick={raiseHand}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 text-xl ${
              handRaised ? 'bg-amber-500 shadow-lg shadow-amber-900/40' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'
            }`}
            title={handRaised ? 'Lower hand' : 'Raise hand'}
          >
            ✋
          </button>

          {/* Chat toggle */}
          <button
            onClick={() => setShowChat(v => !v)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              showChat ? 'bg-white/20 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'
            }`}
          >
            <MessageCircle className="w-5 h-5" />
          </button>

          {/* Reactions */}
          <LiveReactionBar streamId={stream.id} me={me} onFloat={addFloat} />
        </div>
      </div>
    </div>
  );
}
