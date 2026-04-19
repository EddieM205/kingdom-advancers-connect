import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

function useNetworkStatus() {
    const [status, setStatus] = useState('good');

    useEffect(() => {
        const update = () => {
            if (!navigator.onLine) { setStatus('offline'); return; }
            const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (conn) {
                const down = conn.downlink;
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

const CONFIG = {
    good:    { label: 'Stable',  dot: 'bg-green-500',  icon: Wifi,          text: 'text-green-400',  pulse: true },
    fair:    { label: 'Fair',    dot: 'bg-yellow-500', icon: Wifi,          text: 'text-yellow-400', pulse: false },
    poor:    { label: 'Poor',    dot: 'bg-red-500',    icon: AlertTriangle, text: 'text-red-400',    pulse: false },
    offline: { label: 'Offline', dot: 'bg-gray-500',   icon: WifiOff,       text: 'text-gray-400',   pulse: false },
};

export default function CallNetworkStatus() {
    const status = useNetworkStatus();
    const cfg = CONFIG[status];
    const Icon = cfg.icon;

    return (
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm text-xs font-medium ${cfg.text}`}>
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${cfg.pulse ? 'animate-pulse' : ''}`} />
            <Icon className="w-3 h-3" />
            <span>{cfg.label}</span>
        </div>
    );
}