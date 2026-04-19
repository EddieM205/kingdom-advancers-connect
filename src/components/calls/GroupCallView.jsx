import React, { useEffect, useRef, useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff,
  FlipHorizontal, Users, BookOpen, X,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BiblePanel from '@/components/bible/BiblePanel';
import {
  ringOutgoingGroup, playConnected, playHangup,
  playParticipantJoined, playParticipantLeft,
} from '@/lib/callSounds';

/* ─────────────────────────────────────────────────────────────
   Full-mesh WebRTC group call — no third-party services.

   Architecture:
   • GroupCall entity tracks active participants (JSON array).
   • Every pair of participants uses a CallSignal entity for
     signaling (offer / answer / ICE candidates).
   • Pair room_id = `${groupRoomId}__${[emailA,emailB].sort().join('__')}`
   • Lower email alphabetically acts as offerer for each pair.
   • ICE candidates polled every 1.5 s until connected.
   • Up to ~8 participants work well with full-mesh WebRTC.
───────────────────────────────────────────────────────────── */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

function formatDuration(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function pairRoomId(groupRoomId, a, b) {
  return `${groupRoomId}__${[a, b].sort().join('__')}`;
}

/* ── Single video tile ─────────────────────────────────────── */
function VideoTile({ stream, name, avatar, isMuted, isVideoOff, isLocal, size }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const noVideo = isVideoOff || !stream?.getVideoTracks().length;

  return (
    <div
      className={`relative bg-gray-900 rounded-2xl overflow-hidden flex items-center justify-center ${size}`}
    >
      {noVideo ? (
        <div className="flex flex-col items-center gap-2">
          <Avatar className="w-16 h-16">
            <AvatarImage src={avatar} className="object-cover" />
            <AvatarFallback className="bg-gray-700 text-white text-2xl">
              {name?.charAt(0) || '?'}
            </AvatarFallback>
          </Avatar>
          <span className="text-white text-xs font-medium">{name}</span>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
          style={isLocal ? { transform: 'scaleX(-1)' } : {}}
        />
      )}

      {/* Name + mute badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
        {!noVideo && (
          <span className="text-white text-xs font-semibold bg-black/50 rounded-full px-2 py-0.5">
            {name}{isLocal ? ' (You)' : ''}
          </span>
        )}
        {isMuted && (
          <span className="w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────────── */
export default function GroupCallView({
  groupRoomId,
  callType = 'video',
  myEmail,
  myName,
  myAvatar,
  groupName = 'Group Call',
  onEndCall,
}) {
  const localStreamRef  = useRef(null);
  const peersRef        = useRef({});   // email → { pc, stream, signalId, candidates: [] }
  const pollRef         = useRef(null);
  const hideTimer       = useRef(null);
  const localCands      = useRef({});   // email → [candidates sent so far]
  const remoteCandsSeen = useRef({});   // email → count of candidates applied

  const [localStream,    setLocalStream]    = useState(null);
  const [remoteStreams,  setRemoteStreams]  = useState({});  // email → MediaStream
  const [participants,   setParticipants]  = useState([]);  // [{email, name, avatar}]
  const [isMuted,        setIsMuted]        = useState(false);
  const [isVideoOff,     setIsVideoOff]     = useState(callType === 'audio');
  const [elapsed,        setElapsed]        = useState(0);
  const [showControls,   setShowControls]   = useState(true);
  const [showBible,      setShowBible]      = useState(false);
  const [facingMode,     setFacingMode]     = useState('user');
  const [status,         setStatus]         = useState('joining');

  const stopRingRef    = useRef(null);
  const prevOthersRef  = useRef(0); // count of OTHER participants seen so far

  /* ── Duration timer ───────────────────────────────────────── */
  useEffect(() => {
    if (status !== 'joined') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  /* ── Outgoing ring: start on mount, stop when first person joins ── */
  useEffect(() => {
    stopRingRef.current = ringOutgoingGroup();
    return () => { stopRingRef.current?.(); stopRingRef.current = null; };
  }, []);

  /* ── Participant join / leave sounds ──────────────────────── */
  useEffect(() => {
    const others = participants.filter(p => p.email !== myEmail).length;
    const prev   = prevOthersRef.current;

    if (others > prev) {
      if (prev === 0) {
        // First person joined the room — stop outgoing ring, play connected
        stopRingRef.current?.();
        stopRingRef.current = null;
        playConnected();
      } else {
        // Additional participant joined mid-call
        playParticipantJoined();
      }
    } else if (others < prev && prev > 0) {
      playParticipantLeft();
    }

    prevOthersRef.current = others;
  }, [participants]);

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

  /* ── Create or join GroupCall entity ──────────────────────── */
  const groupCallIdRef = useRef(null);

  const joinGroupCall = useCallback(async (stream) => {
    const me = { email: myEmail, name: myName, avatar: myAvatar || '' };

    // Try to find existing active call for this room
    let calls = [];
    try {
      calls = await base44.entities.GroupCall.filter({ room_id: groupRoomId, status: 'active' });
    } catch { calls = []; }

    let gcId;
    if (calls.length > 0) {
      // Join existing call — add myself to participants
      const gc = calls[0];
      gcId = gc.id;
      const existing = JSON.parse(gc.participants_json || '[]');
      const already = existing.some(p => p.email === myEmail);
      if (!already) {
        const updated = [...existing, me];
        await base44.entities.GroupCall.update(gcId, {
          participants_json: JSON.stringify(updated),
        });
      }
    } else {
      // Create new call
      const gc = await base44.entities.GroupCall.create({
        room_id:           groupRoomId,
        status:            'active',
        call_type:         callType,
        host_email:        myEmail,
        participants_json: JSON.stringify([me]),
      });
      gcId = gc.id;
    }

    groupCallIdRef.current = gcId;
    setStatus('joined');
    return gcId;
  }, [groupRoomId, myEmail, myName, myAvatar, callType]);

  /* ── Connect to a new peer ────────────────────────────────── */
  const connectToPeer = useCallback(async (peer, localStream) => {
    const { email: peerEmail, name: peerName, avatar: peerAvatar } = peer;
    if (peersRef.current[peerEmail]) return; // already connecting

    const iAmOfferer = myEmail < peerEmail; // deterministic offerer selection
    const pairId = pairRoomId(groupRoomId, myEmail, peerEmail);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    localCands.current[peerEmail]      = [];
    remoteCandsSeen.current[peerEmail] = 0;
    peersRef.current[peerEmail] = { pc, stream: null, signalId: null };

    /* Add local tracks */
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));

    /* Remote track handler */
    pc.ontrack = (event) => {
      if (event.streams[0]) {
        peersRef.current[peerEmail].stream = event.streams[0];
        setRemoteStreams(prev => ({ ...prev, [peerEmail]: event.streams[0] }));
      }
    };

    /* ICE candidates — batch-write to CallSignal */
    const myCandField = iAmOfferer ? 'caller_ice' : 'callee_ice';
    pc.onicecandidate = async (event) => {
      if (!event.candidate || !peersRef.current[peerEmail]?.signalId) return;
      localCands.current[peerEmail].push(event.candidate.toJSON());
      try {
        await base44.entities.CallSignal.update(peersRef.current[peerEmail].signalId, {
          [myCandField]: JSON.stringify(localCands.current[peerEmail]),
        });
      } catch { /* ignore */ }
    };

    pc.onconnectionstatechange = () => {
      if (['failed', 'disconnected', 'closed'].includes(pc.connectionState)) {
        delete peersRef.current[peerEmail];
        setRemoteStreams(prev => {
          const next = { ...prev };
          delete next[peerEmail];
          return next;
        });
      }
    };

    if (iAmOfferer) {
      /* Create offer → write CallSignal */
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sig = await base44.entities.CallSignal.create({
        room_id:     pairId,
        caller_email: myEmail,
        callee_email: peerEmail,
        call_type:    callType,
        status:       'ringing',
        offer:        JSON.stringify(offer),
        answer:       '',
        caller_ice:   '[]',
        callee_ice:   '[]',
      });
      peersRef.current[peerEmail].signalId = sig.id;
    }
    /* Answerer side is handled inside the polling loop */
  }, [myEmail, groupRoomId, callType]);

  /* ── Main polling loop ────────────────────────────────────── */
  const startPolling = useCallback((gcId, stream) => {
    const poll = async () => {
      try {
        /* 1. Fetch current GroupCall participants */
        const gc = await base44.entities.GroupCall.filter(
          { room_id: groupRoomId, status: 'active' }, '-created_date', 1
        ).then(r => r[0]);

        if (!gc) { endCall(); return; }

        const parts = JSON.parse(gc.participants_json || '[]');
        setParticipants(parts);

        /* 2. Connect to any new participant */
        for (const peer of parts) {
          if (peer.email === myEmail) continue;
          if (!peersRef.current[peer.email]) {
            await connectToPeer(peer, stream);
          }
        }

        /* 3. For each peer, sync signals + ICE */
        for (const [peerEmail, peerState] of Object.entries(peersRef.current)) {
          const pairId = pairRoomId(groupRoomId, myEmail, peerEmail);
          const iAmOfferer = myEmail < peerEmail;

          let sigs = [];
          try {
            sigs = await base44.entities.CallSignal.filter({ room_id: pairId }, '-created_date', 1);
          } catch { continue; }

          const sig = sigs[0];
          if (!sig) continue;

          const pc = peerState.pc;

          if (!iAmOfferer && !peerState.signalId && sig.offer) {
            /* Answerer: apply offer + send answer */
            peerState.signalId = sig.id;
            if (!pc.remoteDescription) {
              await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.offer)));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await base44.entities.CallSignal.update(sig.id, {
                answer: JSON.stringify(answer),
                status: 'accepted',
              });
            }
          }

          /* Apply remote ICE candidates */
          const remoteCandField = iAmOfferer ? 'callee_ice' : 'caller_ice';
          if (sig[remoteCandField] && pc.remoteDescription) {
            const cands = JSON.parse(sig[remoteCandField] || '[]');
            const seen  = remoteCandsSeen.current[peerEmail] || 0;
            for (let i = seen; i < cands.length; i++) {
              try { await pc.addIceCandidate(new RTCIceCandidate(cands[i])); } catch { /* ok */ }
            }
            remoteCandsSeen.current[peerEmail] = cands.length;
          }

          /* Offerer: apply answer once */
          if (iAmOfferer && sig.answer && !pc.remoteDescription) {
            await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(sig.answer)));
          }
        }
      } catch { /* network error — keep polling */ }

      pollRef.current = setTimeout(poll, 1500);
    };

    poll();
  }, [myEmail, groupRoomId, connectToPeer]);

  /* ── End call ──────────────────────────────────────────────── */
  const endCall = useCallback(async () => {
    clearTimeout(pollRef.current);

    /* Remove myself from GroupCall participants */
    if (groupCallIdRef.current) {
      try {
        const gc = await base44.entities.GroupCall.filter(
          { room_id: groupRoomId, status: 'active' }, '-created_date', 1
        ).then(r => r[0]);
        if (gc) {
          const remaining = JSON.parse(gc.participants_json || '[]')
            .filter(p => p.email !== myEmail);
          if (remaining.length === 0) {
            await base44.entities.GroupCall.update(gc.id, { status: 'ended' });
          } else {
            await base44.entities.GroupCall.update(gc.id, { participants_json: JSON.stringify(remaining) });
          }
        }
      } catch { /* ok */ }
    }

    /* Close all peer connections */
    Object.values(peersRef.current).forEach(({ pc }) => { try { pc.close(); } catch { /* ok */ } });
    peersRef.current = {};

    /* Stop local tracks */
    stopRingRef.current?.();
    stopRingRef.current = null;
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    playHangup();
    setTimeout(onEndCall, 500); // let hangup sound finish
  }, [groupRoomId, myEmail, onEndCall]);

  /* ── Bootstrap ─────────────────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const constraints = callType === 'audio'
        ? { audio: true, video: false }
        : { audio: true, video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } } };

      let stream;
      try { stream = await navigator.mediaDevices.getUserMedia(constraints); }
      catch { try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
              catch { setStatus('failed'); return; } }

      if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }

      localStreamRef.current = stream;
      setLocalStream(stream);

      const gcId = await joinGroupCall(stream);
      if (cancelled) return;

      startPolling(gcId, stream);
    };

    run().catch(() => setStatus('failed'));

    return () => {
      cancelled = true;
      clearTimeout(pollRef.current);
      Object.values(peersRef.current).forEach(({ pc }) => { try { pc.close(); } catch { /* ok */ } });
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, []);

  /* ── Controls ──────────────────────────────────────────────── */
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
      const newStream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: next } });
      const newTrack  = newStream.getVideoTracks()[0];
      Object.values(peersRef.current).forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) sender.replaceTrack(newTrack);
      });
      localStreamRef.current?.getVideoTracks().forEach(t => t.stop());
      setLocalStream(prev => {
        const mixed = new MediaStream([...prev.getAudioTracks(), newTrack]);
        localStreamRef.current = mixed;
        return mixed;
      });
    } catch { /* ok */ }
    resetHideTimer();
  };

  /* ── Grid layout ────────────────────────────────────────────── */
  const totalTiles = 1 + Object.keys(remoteStreams).length;
  const gridClass = totalTiles <= 1 ? 'grid-cols-1'
    : totalTiles === 2               ? 'grid-cols-2'
    : totalTiles <= 4                ? 'grid-cols-2'
    : 'grid-cols-3';

  const tileSize = totalTiles <= 2 ? 'h-1/2' : totalTiles <= 4 ? '' : '';

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col"
      onClick={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ── Top bar ─────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 flex items-center justify-between px-4 pt-5 pb-3 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          zIndex: 10,
        }}
      >
        <div>
          <p className="text-white font-bold text-lg">{groupName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-gray-400 text-xs">{participants.length} participants</span>
            {status === 'joined' && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs">{formatDuration(elapsed)}</span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={() => { setShowBible(v => !v); resetHideTimer(); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showBible ? 'bg-blue-600 text-white' : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'}`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Bible</span>
        </button>
      </div>

      {/* ── Video grid ──────────────────────────────────────── */}
      <div className={`flex-1 grid ${gridClass} gap-1 p-1 pt-16 pb-28`}>
        {/* Local tile */}
        <VideoTile
          stream={localStream}
          name={myName}
          avatar={myAvatar}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          isLocal={true}
        />

        {/* Remote tiles */}
        {participants
          .filter(p => p.email !== myEmail)
          .map(peer => (
            <VideoTile
              key={peer.email}
              stream={remoteStreams[peer.email] || null}
              name={peer.name}
              avatar={peer.avatar}
              isMuted={false}
              isVideoOff={!remoteStreams[peer.email]?.getVideoTracks().length}
              isLocal={false}
            />
          ))}
      </div>

      {/* ── Bottom controls ──────────────────────────────────── */}
      <div
        className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-6 pb-10 pt-6 transition-opacity duration-300"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
          zIndex: 10,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Mute */}
        <div className="flex flex-col items-center gap-1.5">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-95 ${isMuted ? 'bg-red-600 hover:bg-red-500' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <span className="text-white/60 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
        </div>

        {/* End call */}
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
            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all active:scale-95 ${isVideoOff ? 'bg-red-600 hover:bg-red-500' : 'bg-white/20 backdrop-blur-sm hover:bg-white/30'}`}
            >
              {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
            </button>
            <span className="text-white/60 text-[10px]">{isVideoOff ? 'Start Cam' : 'Stop Cam'}</span>
          </div>
        )}

        {/* Flip camera */}
        {callType !== 'audio' && (
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={flipCamera}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white bg-white/20 backdrop-blur-sm hover:bg-white/30 active:scale-95 transition-all"
            >
              <FlipHorizontal className="w-6 h-6" />
            </button>
            <span className="text-white/60 text-[10px]">Flip</span>
          </div>
        )}
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

      {/* ── Failed state ─────────────────────────────────────── */}
      {status === 'failed' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/90">
          <p className="text-white text-xl font-bold mb-2">Failed to Join</p>
          <p className="text-gray-400 text-sm mb-8 text-center px-8">
            Could not access camera/microphone or connect to the call.
          </p>
          <button onClick={onEndCall} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-full font-semibold active:scale-95 transition-all">
            Close
          </button>
        </div>
      )}
    </div>
  );
}
