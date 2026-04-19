import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, FlipHorizontal,
  BookOpen, Share2, Monitor, Loader2, Wifi, WifiOff, MoreHorizontal, X
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import BiblePanel from '@/components/bible/BiblePanel';
import VerseSharePanel from './VerseSharePanel';
import SharedVerseOverlay from './SharedVerseOverlay';
import { useVerseSharing } from '@/hooks/useVerseSharing';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const JAAS_APP_ID = import.meta.env.VITE_JAAS_APP_ID;
const JAAS_KEY_ID = import.meta.env.VITE_JAAS_KEY_ID;
const JAAS_PRIVATE_KEY_RAW = import.meta.env.VITE_JAAS_PRIVATE_KEY;

async function generateJaaSJwt(user) {
  const pem = JAAS_PRIVATE_KEY_RAW?.replace(/\\n/g, '\n');
  if (!JAAS_APP_ID || !pem) return null;
  const pemBody = pem.replace(/-----BEGIN PRIVATE KEY-----/, '').replace(/-----END PRIVATE KEY-----/, '').replace(/\s/g, '');
  const binary = atob(pemBody);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const key = await crypto.subtle.importKey('pkcs8', bytes.buffer, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const now = Math.floor(Date.now() / 1000);
  const b64url = (o) => {
    const s = typeof o === 'string' ? o : JSON.stringify(o);
    let bin = '';
    new TextEncoder().encode(s).forEach(b => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };
  const header = { alg: 'RS256', kid: JAAS_KEY_ID || JAAS_APP_ID, typ: 'JWT' };
  const payload = {
    iss: 'chat', aud: 'jitsi', sub: JAAS_APP_ID, room: '*',
    iat: now, exp: now + 7200,
    context: {
      features: { recording: false, livestreaming: false, transcription: false, 'outbound-call': false },
      user: { moderator: 'true', name: user.name, email: user.email, avatar: user.avatar, id: user.id },
    },
  };
  const sigInput = `${b64url(header)}.${b64url(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(sigInput));
  return `${sigInput}.${btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')}`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// A single round control button
function ControlBtn({ onClick, icon: Icon, label, active, danger, disabled, large }) {
  const base = large
    ? 'w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0'
    : 'w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 flex-shrink-0';
  const color = danger
    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-900/40'
    : active
    ? 'bg-white/20 text-white backdrop-blur-sm hover:bg-white/30'
    : 'bg-black/50 text-white backdrop-blur-sm hover:bg-black/70';
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${color} ${disabled ? 'opacity-40 pointer-events-none' : ''}`}
      title={label}
    >
      <Icon className={large ? 'w-7 h-7' : 'w-5 h-5'} />
    </button>
  );
}

export default function JitsiCallView({
  roomName,
  displayName,
  avatarUrl,
  onEndCall,
  isGroupCall = false,
  groupId = null,
  audioOnly = false,
}) {
  const containerRef = useRef(null);
  const apiRef = useRef(null);
  const hideTimer = useRef(null);

  const [jwtToken, setJwtToken] = useState(undefined); // undefined = loading
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(audioOnly);
  const [showControls, setShowControls] = useState(true);
  const [showBible, setShowBible] = useState(false);
  const [showVerseModal, setShowVerseModal] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [connected, setConnected] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const verseShare = useVerseSharing();

  // Network status
  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => { window.removeEventListener('online', up); window.removeEventListener('offline', down); };
  }, []);

  // Call timer — starts once connected
  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [connected]);

  // Auto-hide controls after 4s of inactivity (mobile-friendly)
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowControls(false), 4000);
  }, []);

  useEffect(() => {
    resetHideTimer();
    return () => clearTimeout(hideTimer.current);
  }, []);

  // Generate JWT
  useEffect(() => {
    if (!me) return;
    generateJaaSJwt({ name: me.full_name, email: me.email, avatar: me.avatar_url, id: me.id || me.email })
      .then(t => setJwtToken(t ?? null))
      .catch(() => setJwtToken(null));
  }, [me?.email]);

  // Mount Jitsi once JWT is resolved
  useEffect(() => {
    if (jwtToken === undefined) return;

    const domain = JAAS_APP_ID ? '8x8.vc' : 'meet.jit.si';
    const jitsiRoom = JAAS_APP_ID ? `${JAAS_APP_ID}/${roomName}` : roomName;

    const loadAndInit = async () => {
      await new Promise(resolve => {
        const existing = document.querySelector('script[src*="external_api.js"]');
        if (existing && !existing.src.includes(domain)) { existing.remove(); delete window.JitsiMeetExternalAPI; }
        if (window.JitsiMeetExternalAPI) { resolve(); return; }
        const s = document.createElement('script');
        s.src = `https://${domain}/external_api.js`;
        s.onload = resolve;
        document.head.appendChild(s);
      });

      if (!containerRef.current) return;

      const opts = {
        roomName: jitsiRoom,
        parentNode: containerRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: displayName || 'User', avatarUrl: avatarUrl || '' },
        configOverwrite: {
          startWithAudioMuted: false,
          startWithVideoMuted: audioOnly,
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          disableDeepLinking: true,
          enableWelcomePage: false,
          toolbarConfig: { alwaysVisible: false, initialTimeout: 0, timeout: 0 },
          notifications: [],
          hideConferenceSubject: true,
          disableRemoteMute: true,
          p2p: { enabled: true, preferH264: true },
        },
        interfaceConfigOverwrite: {
          TOOLBAR_BUTTONS: [],                    // No Jitsi toolbar
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          JITSI_WATERMARK_LINK: '',
          HIDE_INVITE_MORE_HEADER: true,
          DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
          SHOW_CHROME_EXTENSION_BANNER: false,
          SHOW_PROMOTIONAL_CLOSE_PAGE: false,
          MOBILE_APP_PROMO: false,
          DEFAULT_BACKGROUND: '#000000',
          RECENT_LIST_ENABLED: false,
        },
      };
      if (jwtToken) opts.jwt = jwtToken;

      apiRef.current = new window.JitsiMeetExternalAPI(domain, opts);

      const autoJoin = setTimeout(() => {
        try { apiRef.current?.executeCommand('joinConference'); } catch (_) {}
      }, 800);

      apiRef.current.addEventListener('videoConferenceJoined', () => {
        clearTimeout(autoJoin);
        setConnected(true);
        resetHideTimer();
      });

      apiRef.current.addEventListener('readyToClose', onEndCall);
      apiRef.current.addEventListener('videoConferenceLeft', onEndCall);
    };

    loadAndInit().catch(console.error);

    return () => {
      try { apiRef.current?.dispose(); } catch (_) {}
      apiRef.current = null;
    };
  }, [roomName, jwtToken]);

  const toggleMute = () => {
    try { apiRef.current?.executeCommand('toggleAudio'); } catch (_) {}
    setIsMuted(v => !v);
    resetHideTimer();
  };

  const toggleVideo = () => {
    try { apiRef.current?.executeCommand('toggleVideo'); } catch (_) {}
    setIsVideoOff(v => !v);
    resetHideTimer();
  };

  const flipCamera = () => {
    try { apiRef.current?.executeCommand('toggleCamera'); } catch (_) {}
    resetHideTimer();
  };

  const toggleScreenShare = () => {
    try { apiRef.current?.executeCommand('toggleShareScreen'); } catch (_) {}
    resetHideTimer();
  };

  const handleShareVerse = (verse) => {
    verseShare.shareVerse(verse);
    setShowVerseModal(false);
  };

  // Loading state while JWT resolves
  if (jwtToken === undefined) {
    return (
      <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <Avatar className="w-20 h-20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-gray-700 text-2xl text-white">{displayName?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
        </div>
        <p className="text-white font-semibold text-lg">{displayName}</p>
        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          Connecting…
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black z-50 overflow-hidden"
      onClick={resetHideTimer}
      onTouchStart={resetHideTimer}
    >
      {/* ─── Jitsi video engine (full screen, no UI) ─── */}
      <div ref={containerRef} className="absolute inset-0" style={{ zIndex: 1 }} />

      {/* Audio-only backdrop — shown when camera is off or audio-only */}
      {(audioOnly || isVideoOff) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[2] bg-gradient-to-br from-gray-900 to-black pointer-events-none">
          <Avatar className="w-28 h-28 mb-4 ring-4 ring-white/20">
            <AvatarImage src={avatarUrl} />
            <AvatarFallback className="bg-gray-700 text-4xl text-white">{displayName?.charAt(0) || '?'}</AvatarFallback>
          </Avatar>
          <p className="text-white font-semibold text-xl">{displayName}</p>
          {connected ? (
            <p className="text-gray-400 text-sm mt-1">{formatDuration(elapsed)}</p>
          ) : (
            <p className="text-gray-400 text-sm mt-1 animate-pulse">Connecting…</p>
          )}
          {audioOnly && (
            <div className="mt-3 flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5">
              <Mic className="w-4 h-4 text-white/60" />
              <span className="text-white/70 text-xs">Voice call</span>
            </div>
          )}
        </div>
      )}

      {/* ─── TOP BAR ─── */}
      <div
        className="absolute top-0 inset-x-0 flex items-center justify-between px-4 pt-safe pb-3 transition-opacity duration-300"
        style={{
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        <div className="flex flex-col">
          <p className="text-white font-semibold text-base leading-tight">{roomName?.split('-').slice(1).join(' ') || 'Call'}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {connected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-green-400 text-xs">{formatDuration(elapsed)}</span>
              </>
            ) : (
              <span className="text-gray-400 text-xs animate-pulse">Connecting…</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {online ? (
            <Wifi className="w-4 h-4 text-green-400" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-400" />
          )}
          {/* Bible toggle */}
          <button
            onClick={() => { setShowBible(v => !v); resetHideTimer(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showBible ? 'bg-blue-600 text-white' : 'bg-white/15 text-white backdrop-blur-sm hover:bg-white/25'}`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Bible</span>
          </button>
          {/* Verse share */}
          <button
            onClick={() => { setShowVerseModal(true); resetHideTimer(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/15 text-white text-xs font-medium backdrop-blur-sm hover:bg-white/25 transition-all"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Verse</span>
          </button>
        </div>
      </div>

      {/* ─── BOTTOM CONTROL BAR ─── */}
      <div
        className="absolute bottom-0 inset-x-0 flex flex-col items-center pb-8 pt-4 px-6 transition-opacity duration-300"
        style={{
          zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)',
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
        }}
      >
        {/* Main controls row */}
        <div className="flex items-center justify-center gap-4 sm:gap-6">
          {/* Mic */}
          <div className="flex flex-col items-center gap-1">
            <ControlBtn
              onClick={toggleMute}
              icon={isMuted ? MicOff : Mic}
              label={isMuted ? 'Unmute' : 'Mute'}
              active={!isMuted}
            />
            <span className="text-white/60 text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
          </div>

          {/* Camera (hide for audio-only) */}
          {!audioOnly && (
            <div className="flex flex-col items-center gap-1">
              <ControlBtn
                onClick={toggleVideo}
                icon={isVideoOff ? VideoOff : Video}
                label={isVideoOff ? 'Start Video' : 'Stop Video'}
                active={!isVideoOff}
              />
              <span className="text-white/60 text-[10px]">{isVideoOff ? 'Start Cam' : 'Stop Cam'}</span>
            </div>
          )}

          {/* End Call — center, larger, red */}
          <div className="flex flex-col items-center gap-1">
            <ControlBtn onClick={onEndCall} icon={PhoneOff} label="End Call" danger large />
            <span className="text-white/60 text-[10px]">End</span>
          </div>

          {/* Flip camera (mobile hint) */}
          {!audioOnly && (
            <div className="flex flex-col items-center gap-1">
              <ControlBtn onClick={flipCamera} icon={FlipHorizontal} label="Flip Camera" />
              <span className="text-white/60 text-[10px]">Flip</span>
            </div>
          )}

          {/* Screen share */}
          <div className="flex flex-col items-center gap-1">
            <ControlBtn onClick={toggleScreenShare} icon={Monitor} label="Screen Share" />
            <span className="text-white/60 text-[10px]">Share</span>
          </div>
        </div>
      </div>

      {/* ─── BIBLE PANEL (right slide-in) ─── */}
      {showBible && (
        <div
          className="absolute top-0 right-0 h-full w-72 sm:w-80 bg-gray-900/95 backdrop-blur-md border-l border-white/10 flex flex-col"
          style={{ zIndex: 20 }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white font-semibold text-sm">Bible</span>
            <button onClick={() => setShowBible(false)} className="text-gray-400 hover:text-white p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <BiblePanel onClose={() => setShowBible(false)} onShareScreen={toggleScreenShare} />
          </div>
        </div>
      )}

      {/* ─── VERSE SHARE MODAL ─── */}
      {showVerseModal && (
        <VerseSharePanel
          verse={{ reference: '', text: '' }}
          onClose={() => setShowVerseModal(false)}
          onShare={handleShareVerse}
        />
      )}

      {/* ─── SHARED VERSE OVERLAY ─── */}
      {verseShare.sharedVerse && (
        <SharedVerseOverlay
          verse={verseShare.sharedVerse}
          onDismiss={() => verseShare.clearSharedVerse()}
        />
      )}
    </div>
  );
}
