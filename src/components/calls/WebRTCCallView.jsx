import React, { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  FlipHorizontal, BookOpen, X, Share2,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BiblePanel from '@/components/bible/BiblePanel';
import VerseSharePanel from './VerseSharePanel';
import SharedVerseOverlay from './SharedVerseOverlay';
import { useVerseSharing } from '@/hooks/useVerseSharing';
import { ringOutgoing, playConnected, playHangup } from '@/lib/callSounds';

/* ── Free public STUN servers (no account needed) ───────────── */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
];

function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function ControlBtn({ onClick, icon: Icon, label, active, danger, large }) {
  const size = large ? 'w-16 h-16' : 'w-13 h-13';
  const color = danger
    ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/40'
    : active
    ? 'bg-white/20 backdrop-blur-sm hover:bg-white/30'
    : 'bg-black/50 backdrop-blur-sm hover:bg-black/70';
  return (
    <button
      onClick={onClick}
      title={label}
      className={`${size} w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-95 ${color} ${large ? 'w-16 h-16' : ''}`}
    >
      <Icon className={large ? 'w-7 h-7' : 'w-5 h-5'} />
    </button>
  );
}

/**
 * WebRTCCallView — custom P2P video/audio call using native WebRTC.
 *
 * Props:
 *  roomId          string   — unique ID for the CallSignal entity
 *  isCaller        boolean  — true for the person who initiated the call
 *  callType        'video' | 'audio'
 *  myEmail         string
 *  myName          string
 *  myAvatar        string
 *  remoteEmail     string
 *  remoteName      string
 *  remoteAvatar    string
 *  onEndCall       function
 */
export default function WebRTCCallView({
  roomId,
  isCaller,
  callType = 'video',
  myEmail,
  myName,
  myAvatar,
  remoteEmail,
  remoteName,
  remoteAvatar,
  onEndCall,
}) {
  const localVideoRef  = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef          = useRef(null);
  const localStreamRef = useRef(null);
  const signalIdRef    = useRef(null);
  const pollRef        = useRef(null);
  const hideTimer      = useRef(null);
  // Track how many ICE candidates we've already added from the other side
  const addedRemoteCandidates = useRef(0);
  // Accumulate our own ICE candidates to batch-update
  const localCandidates = useRef([]);
  const stopRingRef     = useRef(null);

  const [status, setStatus]         = useState(isCaller ? 'calling' : 'connecting');
  const [connected, setConnected]   = useState(false);
  const [isMuted, setIsMuted]       = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(callType === 'audio');
  const [elapsed, setElapsed]       = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [showBible, setShowBible]           = useState(false);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [facingMode, setFacingMode]         = useState('user');

  const verseShare = useVerseSharing();

  /* ── Duration timer ───────────────────────────────────────── */
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  /* ── Auto-hide controls ───────────────────────────────────── */
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, []);

  /* ── Outgoing ring: start when caller mounts, stop on connect ── */
  useEffect(() => {
    if (!isCaller) return;
    stopRingRef.current = ringOutgoing();
    return () => { stopRingRef.current?.(); stopRingRef.current = null; };
  }, []);

  /* ── Connected chime ────────────────────────────────────────── */
  useEffect(() => {
    if (!connected) return;
    stopRingRef.current?.();
    stopRingRef.current = null;
    playConnected();
  }, [connected]);

  /* ── Cleanup on unmount ───────────────────────────────────── */
  const endCall = useCallback(async () => {
    clearTimeout(pollRef.current);
    if (signalIdRef.current) {
      base44.entities.CallSignal.update(signalIdRef.current, { status: 'ended' }).catch(() => {});
    }
    stopRingRef.current?.();
    stopRingRef.current = null;
    pcRef.current?.close();
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    playHangup();
    setTimeout(onEndCall, 500); // let hangup sound finish
  }, [onEndCall]);

  /* ── Main WebRTC setup ────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      /* 1. Get local media */
      const constraints = callType === 'audio'
        ? { audio: true, video: false }
        : { audio: true, video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } };

      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (_) {
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch (__) { setStatus('failed'); return; }
      }
      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      /* 2. Create RTCPeerConnection */
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      /* 3. Add local tracks */
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      /* 4. Remote track handler */
      pc.ontrack = (event) => {
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
          setHasRemoteVideo(event.streams[0].getVideoTracks().length > 0);
        }
      };

      /* 5. Connection state changes */
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setConnected(true);
          setStatus('connected');
          resetHideTimer();
        } else if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
          if (!cancelled) endCall();
        }
      };

      /* 6. ICE candidate handler — accumulates and writes to entity */
      const myCandidateField = isCaller ? 'caller_ice' : 'callee_ice';
      pc.onicecandidate = async (event) => {
        if (!event.candidate || !signalIdRef.current) return;
        localCandidates.current.push(event.candidate.toJSON());
        try {
          await base44.entities.CallSignal.update(signalIdRef.current, {
            [myCandidateField]: JSON.stringify(localCandidates.current),
          });
        } catch (_) {}
      };

      /* ── CALLER FLOW ──────────────────────────────────────── */
      if (isCaller) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const signal = await base44.entities.CallSignal.create({
          room_id:      roomId,
          caller_email: myEmail,
          callee_email: remoteEmail,
          call_type:    callType,
          status:       'ringing',
          offer:        JSON.stringify(offer),
          answer:       '',
          caller_ice:   '[]',
          callee_ice:   '[]',
        });
        if (cancelled) return;
        signalIdRef.current = signal.id;

        /* Poll for answer + callee ICE candidates */
        const poll = async () => {
          if (cancelled) return;
          try {
            const fresh = await base44.entities.CallSignal.filter(
              { room_id: roomId }, '-created_date', 1
            ).then(r => r[0]);

            if (!fresh || ['rejected', 'ended'].includes(fresh.status)) {
              endCall(); return;
            }

            /* Apply answer once */
            if (fresh.answer && !pc.remoteDescription) {
              await pc.setRemoteDescription(
                new RTCSessionDescription(JSON.parse(fresh.answer))
              );
            }

            /* Add new callee ICE candidates */
            if (fresh.callee_ice && pc.remoteDescription) {
              const candidates = JSON.parse(fresh.callee_ice);
              for (let i = addedRemoteCandidates.current; i < candidates.length; i++) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidates[i])); } catch (_) {}
              }
              addedRemoteCandidates.current = candidates.length;
            }
          } catch (_) {}
          if (!cancelled) pollRef.current = setTimeout(poll, 1500);
        };
        poll();

      /* ── CALLEE FLOW ──────────────────────────────────────── */
      } else {
        /* Fetch signal with retries */
        let signal = null;
        for (let i = 0; i < 10 && !signal; i++) {
          try {
            const r = await base44.entities.CallSignal.filter(
              { room_id: roomId }, '-created_date', 1
            );
            signal = r[0] || null;
          } catch (_) {}
          if (!signal) await new Promise(r => setTimeout(r, 1000));
        }
        if (!signal || cancelled) { setStatus('failed'); return; }
        signalIdRef.current = signal.id;

        /* Set remote description from offer */
        await pc.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(signal.offer))
        );

        /* Create and send answer */
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await base44.entities.CallSignal.update(signalIdRef.current, {
          answer: JSON.stringify(answer),
          status: 'accepted',
        });

        /* Apply any caller ICE candidates already in signal */
        if (signal.caller_ice) {
          const existing = JSON.parse(signal.caller_ice);
          for (let i = 0; i < existing.length; i++) {
            try { await pc.addIceCandidate(new RTCIceCandidate(existing[i])); } catch (_) {}
          }
          addedRemoteCandidates.current = existing.length;
        }

        /* Poll for more caller ICE candidates */
        const poll = async () => {
          if (cancelled) return;
          try {
            const fresh = await base44.entities.CallSignal.filter(
              { room_id: roomId }, '-created_date', 1
            ).then(r => r[0]);

            if (!fresh || fresh.status === 'ended') { endCall(); return; }

            if (fresh.caller_ice) {
              const candidates = JSON.parse(fresh.caller_ice);
              for (let i = addedRemoteCandidates.current; i < candidates.length; i++) {
                try { await pc.addIceCandidate(new RTCIceCandidate(candidates[i])); } catch (_) {}
              }
              addedRemoteCandidates.current = candidates.length;
            }
          } catch (_) {}
          if (!cancelled) pollRef.current = setTimeout(poll, 1500);
        };
        poll();
      }
    };

    run().catch(() => setStatus('failed'));

    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ── Controls ─────────────────────────────────────────────── */
  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = isMuted; });
    setIsMuted(v => !v);
    resetHideTimer();
  };

  const toggleVideo = () => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = isVideoOff; });
    setIsVideoOff(v => !v);
    resetHideTimer();
  };

  const flipCamera = async () => {
    const next = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(next);
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: next },
      });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = pcRef.current?.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      // Replace local preview
      const oldVideo = localStreamRef.current?.getVideoTracks()[0];
      if (oldVideo) { oldVideo.stop(); }
      if (localVideoRef.current) {
        const mixed = new MediaStream([
          ...localStreamRef.current.getAudioTracks(),
          newTrack,
        ]);
        localVideoRef.current.srcObject = mixed;
        localStreamRef.current = mixed;
      }
    } catch (_) {}
    resetHideTimer();
  };

  const showAudioOnly = callType === 'audio' || isVideoOff || !hasRemoteVideo;

  /* ── Render ───────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onClick={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ── Remote video (full screen) ──────────────────────── */}
      <video
        ref={remoteVideoRef}
        autoPlay
        playsInline
        className={`absolute inset-0 w-full h-full object-cover ${showAudioOnly ? 'hidden' : ''}`}
        style={{ zIndex: 1 }}
      />

      {/* ── Audio / no-video backdrop ───────────────────────── */}
      {showAudioOnly && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black z-[1]">
          <div className="relative mb-5">
            <span className="absolute inset-0 rounded-full bg-white/10 animate-ping" style={{ animationDuration: '2s' }} />
            <span className="absolute inset-0 rounded-full bg-white/5  animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
            <Avatar className="relative w-32 h-32 ring-4 ring-white/20">
              <AvatarImage src={remoteAvatar} className="object-cover" />
              <AvatarFallback className="bg-gray-700 text-5xl text-white">{remoteName?.charAt(0) || '?'}</AvatarFallback>
            </Avatar>
          </div>
          <p className="text-white font-bold text-2xl">{remoteName}</p>
          <p className="text-gray-400 text-sm mt-2">
            {connected
              ? formatDuration(elapsed)
              : status === 'calling' ? 'Calling…'
              : status === 'failed'  ? 'Connection failed'
              : 'Connecting…'}
          </p>
          {!connected && status !== 'failed' && (
            <div className="flex gap-1 mt-3">
              {[0, 0.2, 0.4].map(d => (
                <span key={d} className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Local video PiP (bottom-right) ─────────────────── */}
      {callType !== 'audio' && !isVideoOff && (
        <div
          className="absolute bottom-28 right-4 z-10 rounded-2xl overflow-hidden border-2 border-white/30 shadow-2xl"
          style={{ width: 112, height: 160 }}
        >
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-5 pb-4 transition-opacity duration-300"
        style={{
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div>
          <p className="text-white font-semibold text-lg leading-tight">{remoteName}</p>
          <p className="text-gray-400 text-xs mt-0.5">
            {connected
              ? formatDuration(elapsed)
              : status === 'calling' ? 'Calling…' : 'Connecting…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {connected && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
          <button
            onClick={() => { setShowBible(v => !v); resetHideTimer(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showBible ? 'bg-blue-600 text-white' : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bible</span>
          </button>
          <button
            onClick={() => { setShowVerseModal(true); resetHideTimer(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/25"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verse</span>
          </button>
        </div>
      </div>

      {/* ── Bottom controls ─────────────────────────────────── */}
      <div
        className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-10 pt-6 px-8 transition-opacity duration-300"
        style={{
          zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div className="flex items-end justify-center gap-6">
          {/* Mute */}
          <div className="flex flex-col items-center gap-1.5">
            <ControlBtn onClick={toggleMute} icon={isMuted ? MicOff : Mic} label={isMuted ? 'Unmute' : 'Mute'} active={!isMuted} />
            <span className="text-white/60 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* End call — larger red */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full flex items-center justify-center bg-red-600 hover:bg-red-500 active:scale-95 transition-all shadow-xl shadow-red-900/50"
            >
              <PhoneOff className="w-7 h-7 text-white" />
            </button>
            <span className="text-white/60 text-[10px]">End</span>
          </div>

          {/* Camera toggle */}
          {callType !== 'audio' && (
            <div className="flex flex-col items-center gap-1.5">
              <ControlBtn onClick={toggleVideo} icon={isVideoOff ? VideoOff : Video} label={isVideoOff ? 'Start Camera' : 'Stop Camera'} active={!isVideoOff} />
              <span className="text-white/60 text-[10px]">{isVideoOff ? 'Start Cam' : 'Stop Cam'}</span>
            </div>
          )}

          {/* Flip camera (mobile) */}
          {callType !== 'audio' && (
            <div className="flex flex-col items-center gap-1.5">
              <ControlBtn onClick={flipCamera} icon={FlipHorizontal} label="Flip Camera" />
              <span className="text-white/60 text-[10px]">Flip</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Bible panel ─────────────────────────────────────── */}
      {showBible && (
        <div className="absolute top-0 right-0 h-full w-72 sm:w-80 bg-gray-900/95 backdrop-blur-md border-l border-white/10 flex flex-col z-20">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white font-semibold text-sm">Bible</span>
            <button onClick={() => setShowBible(false)} className="text-gray-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <BiblePanel onClose={() => setShowBible(false)} />
          </div>
        </div>
      )}

      {/* ── Verse share modal ───────────────────────────────── */}
      {showVerseModal && (
        <VerseSharePanel
          verse={{ reference: '', text: '' }}
          onClose={() => setShowVerseModal(false)}
          onShare={(verse) => { verseShare.shareVerse(verse); setShowVerseModal(false); }}
        />
      )}

      {/* ── Shared verse overlay ────────────────────────────── */}
      {verseShare.sharedVerse && (
        <SharedVerseOverlay verse={verseShare.sharedVerse} onDismiss={() => verseShare.clearSharedVerse()} />
      )}

      {/* ── Failed overlay ──────────────────────────────────── */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/85">
          <p className="text-white text-xl font-bold mb-2">Call Failed</p>
          <p className="text-gray-400 text-sm mb-8 text-center px-8">Could not establish a connection. Check your internet connection and try again.</p>
          <button onClick={onEndCall} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold active:scale-95 transition-all">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
