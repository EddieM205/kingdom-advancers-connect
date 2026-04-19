import { useState, useEffect } from 'react';
import { Settings, Wifi, WifiOff, AlertTriangle, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const PRESETS = [
    { label: '1080p HD', width: 1920, height: 1080, bitrate: 2500000, fps: 30 },
    { label: '720p',     width: 1280, height: 720,  bitrate: 1500000, fps: 30 },
    { label: '480p',     width: 854,  height: 480,  bitrate: 800000,  fps: 24 },
    { label: '360p Low', width: 640,  height: 360,  bitrate: 400000,  fps: 20 },
];

function useNetworkStatus() {
    const [status, setStatus] = useState('good'); // 'good' | 'fair' | 'poor' | 'offline'

    useEffect(() => {
        const update = () => {
            if (!navigator.onLine) { setStatus('offline'); return; }
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn) {
                const down = conn.downlink; // Mbps
                if (down === 0) setStatus('offline');
                else if (down < 0.5) setStatus('poor');
                else if (down < 2) setStatus('fair');
                else setStatus('good');
            } else {
                setStatus(navigator.onLine ? 'good' : 'offline');
            }
        };

        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        conn?.addEventListener('change', update);

        const interval = setInterval(update, 5000);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
            conn?.removeEventListener('change', update);
            clearInterval(interval);
        };
    }, []);

    return status;
}

const statusConfig = {
    good:    { label: 'Stable',   color: 'bg-green-500',  icon: Wifi,          text: 'text-green-400' },
    fair:    { label: 'Fair',     color: 'bg-yellow-500', icon: Wifi,          text: 'text-yellow-400' },
    poor:    { label: 'Poor',     color: 'bg-red-500',    icon: AlertTriangle, text: 'text-red-400' },
    offline: { label: 'Offline',  color: 'bg-gray-500',   icon: WifiOff,       text: 'text-gray-400' },
};

export default function BroadcastSettings({ streamRef, onPresetChange }) {
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState(PRESETS[1]); // default 720p
    const networkStatus = useNetworkStatus();
    const cfg = statusConfig[networkStatus];
    const NetIcon = cfg.icon;

    const applyPreset = async (preset) => {
        setSelected(preset);
        setOpen(false);

        // Re-apply constraints to the existing stream if available
        const stream = streamRef?.current;
        if (stream) {
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                try {
                    await videoTrack.applyConstraints({
                        width: { ideal: preset.width },
                        height: { ideal: preset.height },
                        frameRate: { ideal: preset.fps },
                    });
                } catch (_) { /* browser may not support all constraints */ }
            }
        }

        onPresetChange?.(preset);
    };

    return (
        <div className="absolute left-1/2 -translate-x-1/2 z-30 flex items-center gap-2" style={{ top: 'max(3rem, calc(env(safe-area-inset-top) + 2.5rem))' }}>
            {/* Network status pill */}
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-medium ${cfg.text}`}>
                <span className={`w-2 h-2 rounded-full ${cfg.color} ${networkStatus === 'good' ? 'animate-pulse' : ''}`} />
                <NetIcon className="w-3 h-3" />
                <span>{cfg.label}</span>
            </div>

            {/* Settings button */}
            <button
                onClick={() => setOpen(v => !v)}
                className="flex items-center justify-center w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 transition-colors"
                title="Stream settings"
            >
                <Settings className="w-4 h-4" />
            </button>

            {/* Settings panel */}
            {open && (
                <div className="absolute top-10 right-0 w-56 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
                        <span className="text-white text-sm font-semibold">Stream Quality</span>
                        <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="p-2 space-y-1">
                        {PRESETS.map(preset => (
                            <button
                                key={preset.label}
                                onClick={() => applyPreset(preset)}
                                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                    selected.label === preset.label
                                        ? 'bg-red-600 text-white'
                                        : 'text-gray-300 hover:bg-gray-800'
                                }`}
                            >
                                <span className="font-medium">{preset.label}</span>
                                <span className="text-xs opacity-70">{(preset.bitrate / 1000000).toFixed(1)} Mbps</span>
                            </button>
                        ))}
                    </div>
                    <div className="px-3 py-2 border-t border-gray-800 flex items-center justify-between">
                        <span className="text-xs text-gray-400">Connection</span>
                        <Badge className={`text-xs text-white ${cfg.color}`}>{cfg.label}</Badge>
                    </div>
                </div>
            )}
        </div>
    );
}