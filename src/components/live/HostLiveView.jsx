import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Mic, MicOff, Video, VideoOff, FlipHorizontal,
  MessageCircle, Users, X, Pin, PinOff, BarChart2, Clock, AlertCircle
} from 'lucide-react';
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

export default function HostLiveView({ stream, me, onEnd }) {
  const videoRef   = useRef(null);
  const streamRef  = useRef(null);
  const queryClient = useQueryClient();

  const [isMuted,       setIsMuted]       = useState(false);
  const [isVideoOff,    setIsVideoOff]    = useState(false);
  const [cameraError,   setCameraError]   = useState(null);
  const [showChat,      setShowChat]      = useState(true);
  const [showStats,     setShowStats]     = useState(false);
  const [showPinInput,  setShowPinInput]  = useState(false);
  const [pinText,       setPinText]       = useState('');
  const [pinnedMessage, setPinnedMessage] = useState(stream.pinned_message || '');
  const [floats,        setFloats]        = useState([]);
  const [duration,      setDuration]      = useState('00:00');
  const [cameras,       setCameras]       = useState([]);
  const [camIdx,        setCamIdx]        = useState(0);

  /* ── data polling ─────────────────────────────────────── */
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['live-chat', stream.id],
    queryFn: () => base44.entities.LiveChat.filter({ stream_id: stream.id }, '-created_date', 50),
    refetchInterval: 3000,
  });
  const { data: allReactions = [] } = useQuery({
    queryKey: ['live-reactions', stream.id],
    queryFn: () => base44.entities.LiveReaction.filter({ stream_id: stream.id }, 'created_date', 1000),
    refetchInterval: 4000,
  });
  const { data: liveStream } = useQuery({
    queryKey: ['live-stream-detail', stream.id],
    queryFn: () => base44.entities.LiveStream.filter({ id: stream.id }, 'created_date', 1).then(r => r[0]),
    refetchInterval: 5000,
  });

  const raisedHands = useMemo(
    () => chatMessages.filter(m => m.content?.startsWith('__HAND__:')),
    [chatMessages]
  );
  const reactionCounts = useMemo(() => {
    const map = {};
    allReactions.forEach(r => { map[r.emoji] = (map[r.emoji] || 0) + 1; });
    return Object.entries(map).sort(([,a],[,b]) => b - a);
  }, [allReactions]);

  /* ── duration ticker ──────────────────────────────────── */
  useEffect(() => {
    setDuration(formatDuration(stream.created_date));
    const id = setInterval(() => setDuration(formatDuration(stream.created_date)), 1000);
    return () => clearInterval(id);
  }, [stream.created_date]);

  /* ── camera init via getUserMedia ─────────────────────── */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (active) setCameras(videoDevices);

        const media = await navigator.mediaDevices.getUserMedia({
          video: videoDevices[0] ? { deviceId: videoDevices[0].deviceId } : true,
          audio: true,
        });
        if (!active) { media.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = media;
        if (videoRef.current) videoRef.current.srcObject = media;
      } catch (err) {
        if (active) setCameraError(err.message || 'Cannot access camera or mic.');
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    };
  }, []);

  /* ── controls ─────────────────────────────────────────── */
  const toggleMute = () => {
    streamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(v => !v);
  };
  const toggleVideo = () => {
    streamRef.current?.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(v => !v);
  };
  const flipCamera = async () => {
    if (cameras.length < 2) return;
    const next = (camIdx + 1) % cameras.length;
    setCamIdx(next);
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: cameras[next].deviceId } },
        audio: true,
      });
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = media;
      if (videoRef.current) videoRef.current.srcObject = media;
      if (isMuted)    media.getAudioTracks().forEach(t => { t.enabled = false; });
      if (isVideoOff) media.getVideoTracks().forEach(t => { t.enabled = false; });
    } catch (_) {}
  };

  const addFloat = (emoji) => {
    const id = Date.now() + Math.random();
    setFloats(p => [...p, { id, emoji }]);
    setTimeout(() => setFloats(p => p.filter(r => r.id !== id)), 3000);
  };

  const pinMessage = async () => {
    const msg = pinText.trim();
    await base44.entities.LiveStream.update(stream.id, { pinned_message: msg }).catch(() => {});
    setPinnedMessage(msg);
    setPinText('');
    setShowPinInput(false);
    queryClient.invalidateQueries({ queryKey: ['live-stream-detail', stream.id] });
  };
  const unpinMessage = async () => {
    await base44.entities.LiveStream.update(stream.id, { pinned_message: '' }).catch(() => {});
    setPinnedMessage('');
    queryClient.invalidateQueries({ queryKey: ['live-stream-detail', stream.id] });
  };
  const dismissHand = async (id) => {
    await base44.entities.LiveChat.delete(id).catch(() => {});
    queryClient.invalidateQueries({ queryKey: ['live-chat', stream.id] });
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden z-[9999]">

      {/* Camera video — mirrored so host sees natural view */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className={`absolute inset-0 w-full h-full object-cover transition-opacity ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
        style={{ zIndex: 1, transform: 'scaleX(-1)' }}
      />

      {/* Camera-off backdrop */}
      {isVideoOff && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black" style={{ zIndex: 1 }}>
          <Avatar className="w-28 h-28 mb-4 ring-4 ring-white/20">
            <AvatarImage src={me?.avatar_url} />
            <AvatarFallback className="bg-gray-700 text-4xl">{me?.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <p className="text-white font-semibold text-xl mt-2">{me?.full_name}</p>
          <p className="text-gray-400 text-sm mt-1">Camera is off</p>
        </div>
      )}

      {/* Camera error */}
      {cameraError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 gap-4 px-8" style={{ zIndex: 20 }}>
          <AlertCircle className="w-14 h-14 text-red-500" />
          <p className="text-lg font-semibold text-red-400">Camera Error</p>
          <p className="text-sm text-gray-300 text-center">{cameraError}</p>
          <button onClick={onEnd} className="mt-2 bg-red-600 hover:bg-red-700 px-6 py-2 rounded-full text-sm font-semibold">Go Back</button>
        </div>
      )}

      {/* Gradients */}
      <div className="absolute bottom-0 left-0 right-0 h-2/3 pointer-events-none"
        style={{ background: 'linear-gradient(to top,rgba(0,0,0,.9) 0%,rgba(0,0,0,.35) 55%,transparent 100%)', zIndex: 2 }} />
      <div className="absolute top-0 left-0 right-0 h-36 pointer-events-none"
        style={{ background: 'linear-gradient(to bottom,rgba(0,0,0,.75) 0%,transparent 100%)', zIndex: 2 }} />

      {/* Floating reactions */}
      <div style={{ zIndex: 3 }}><FloatingHearts reactions={floats} /></div>

      {/* ── TOP BAR ───────────────────────────────────────── */}
      <div className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-5 pb-3 gap-2 flex-wrap" style={{ zIndex: 5 }}>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-red-600 px-3 py-1 rounded-full shadow-lg">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <span className="text-xs font-bold tracking-wide">LIVE</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Clock className="w-3 h-3 text-gray-300" />
            <span className="text-xs text-gray-200 tabular-nums">{duration}</span>
          </div>
          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
            <Users className="w-3 h-3 text-gray-300" />
            <span className="text-xs text-gray-200 tabular-nums">{liveStream?.viewer_count ?? stream.viewer_count ?? 0}</span>
          </div>
          {raisedHands.length > 0 && (
            <div className="flex items-center gap-1 bg-amber-500 px-2.5 py-1 rounded-full animate-pulse">
              <span className="text-xs">✋</span>
              <span className="text-xs font-bold text-black">{raisedHands.length}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => setShowStats(v => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${showStats ? 'bg-blue-600' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'}`}>
            <BarChart2 className="w-4 h-4" />
          </button>
          <button onClick={toggleMute}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-red-600' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'}`}>
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
          <button onClick={toggleVideo}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isVideoOff ? 'bg-red-600' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'}`}>
            {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
          </button>
          <button onClick={onEnd}
            className="bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide shadow-lg">
            End
          </button>
        </div>
      </div>

      {/* ── STATS PANEL ───────────────────────────────────── */}
      {showStats && (
        <div className="absolute inset-x-4 bg-black/90 backdrop-blur-md rounded-2xl p-4 border border-white/10" style={{ top: 80, zIndex: 6 }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-bold">Stream Analytics</span>
            <button onClick={() => setShowStats(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            {[['Watching', liveStream?.viewer_count ?? 0], ['Reactions', allReactions.length], ['Hands', raisedHands.length]].map(([label, val]) => (
              <div key={label} className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-2xl font-bold">{val}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
          {reactionCounts.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {reactionCounts.map(([emoji, count]) => (
                <div key={emoji} className="flex items-center gap-1 bg-white/10 rounded-full px-2.5 py-1">
                  <span className="text-base leading-none">{emoji}</span>
                  <span className="text-xs font-semibold">{count}</span>
                </div>
              ))}
            </div>
          )}
          {raisedHands.length > 0 && (
            <div className="border-t border-white/10 pt-3 space-y-1.5 max-h-28 overflow-y-auto">
              {raisedHands.map(h => (
                <div key={h.id} className="flex items-center justify-between">
                  <span className="text-xs">{h.content.replace('__HAND__:', '')} ✋</span>
                  <button onClick={() => dismissHand(h.id)} className="text-[10px] text-red-400 hover:underline">Dismiss</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PINNED MESSAGE ─────────────────────────────────── */}
      {pinnedMessage && !showStats && (
        <div className="absolute inset-x-4 flex items-center gap-2 bg-amber-500/90 backdrop-blur-sm rounded-2xl px-4 py-2.5" style={{ top: 80, zIndex: 5 }}>
          <span className="text-lg">📌</span>
          <p className="text-black text-sm font-semibold flex-1 line-clamp-1">{pinnedMessage}</p>
          <button onClick={unpinMessage}><X className="w-4 h-4 text-black/60 hover:text-black" /></button>
        </div>
      )}

      {/* ── PIN INPUT ──────────────────────────────────────── */}
      {showPinInput && (
        <div className="absolute inset-x-4 bg-black/90 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex gap-2" style={{ bottom: 220, zIndex: 7 }}>
          <input autoFocus value={pinText} onChange={e => setPinText(e.target.value)}
            onKeyPress={e => e.key === 'Enter' && pinText.trim() && pinMessage()}
            placeholder="Pin a message or verse for viewers…" maxLength={200}
            className="flex-1 bg-white/10 text-white text-sm rounded-xl px-3 py-2 placeholder-gray-500 focus:outline-none" />
          <button onClick={() => pinText.trim() && pinMessage()} disabled={!pinText.trim()}
            className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs px-3 py-2 rounded-xl disabled:opacity-40">Pin</button>
          <button onClick={() => setShowPinInput(false)} className="text-gray-400 hover:text-white px-1"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── BOTTOM AREA ────────────────────────────────────── */}
      <div className="absolute bottom-0 inset-x-0 flex items-end gap-2 px-4 pb-8" style={{ zIndex: 4 }}>
        <div className="flex-1 flex flex-col gap-2 min-w-0 max-w-[72%]">
          <div className="flex items-center gap-2 self-start">
            <Avatar className="w-9 h-9 ring-2 ring-red-500 flex-shrink-0">
              <AvatarImage src={me?.avatar_url} />
              <AvatarFallback className="bg-gray-700 text-sm">{me?.full_name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="bg-black/75 backdrop-blur-sm rounded-2xl px-3 py-1.5">
              <p className="text-sm font-bold leading-none truncate">{stream.title}</p>
              <p className="text-xs text-gray-300 mt-0.5">{me?.full_name}</p>
            </div>
          </div>
          {showChat && <StreamChat streamId={stream.id} me={me} isHost={true} />}
        </div>

        <div className="flex flex-col items-center gap-3 pb-1 flex-shrink-0">
          {cameras.length > 1 && (
            <button onClick={flipCamera}
              className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 active:scale-95 transition-all">
              <FlipHorizontal className="w-5 h-5" />
            </button>
          )}
          <button onClick={() => setShowPinInput(v => !v)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${pinnedMessage || showPinInput ? 'bg-amber-500' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'}`}>
            {pinnedMessage ? <PinOff className="w-5 h-5" /> : <Pin className="w-5 h-5" />}
          </button>
          <button onClick={() => setShowChat(v => !v)}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-95 ${showChat ? 'bg-white/20 backdrop-blur-sm' : 'bg-black/60 backdrop-blur-sm hover:bg-black/80'}`}>
            <MessageCircle className="w-5 h-5" />
          </button>
          <LiveReactionBar streamId={stream.id} me={me} onFloat={addFloat} />
        </div>
      </div>
    </div>
  );
}
