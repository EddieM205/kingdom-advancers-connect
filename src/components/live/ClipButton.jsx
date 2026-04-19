import React, { useState, useRef } from 'react';
import { Scissors, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

const CLIP_DURATION = 30; // seconds

export default function ClipButton({ videoRef, stream }) {
    const [mode, setMode] = useState('idle'); // 'idle' | 'selecting' | 'clipping' | 'done' | 'error'
    const [clipStart, setClipStart] = useState(null);
    const [message, setMessage] = useState('');

    const handleStartSelect = () => {
        if (!videoRef.current) return;
        const start = videoRef.current.currentTime;
        setClipStart(start);
        setMode('selecting');
        setMessage(`Clip starts at ${formatTime(start)} — confirm to save 30s from here`);
    };

    const handleConfirm = async () => {
        setMode('clipping');
        setMessage('Saving clip...');

        try {
            // We use FFmpeg-style approach via canvas + MediaRecorder from the video element
            const video = videoRef.current;
            if (!video) throw new Error('No video');

            const canvas = document.createElement('canvas');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 360;
            const ctx = canvas.getContext('2d');

            const stream = canvas.captureStream(24);
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' });
            const chunks = [];
            recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };

            // Seek to start
            video.currentTime = clipStart;
            await new Promise(r => { video.onseeked = r; });
            video.play();

            recorder.start();

            // Draw frames for CLIP_DURATION seconds
            let elapsed = 0;
            const fps = 24;
            const frameInterval = 1000 / fps;
            const maxFrames = CLIP_DURATION * fps;
            let frameCount = 0;

            await new Promise((resolve) => {
                const draw = () => {
                    if (frameCount >= maxFrames || video.ended) {
                        resolve();
                        return;
                    }
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    frameCount++;
                    setTimeout(draw, frameInterval);
                };
                draw();
            });

            video.pause();
            recorder.stop();

            await new Promise(r => { recorder.onstop = r; });

            const blob = new Blob(chunks, { type: 'video/webm' });
            const file = new File([blob], `clip_${Date.now()}.webm`, { type: 'video/webm' });
            const { file_url } = await base44.integrations.Core.UploadFile({ file });

            // Save as a Reel
            await base44.entities.Reel.create({
                video_url: file_url,
                caption: `📎 Clipped from "${stream?.title || 'Live Replay'}" at ${formatTime(clipStart)}`,
                visibility: 'public',
            });

            setMode('done');
            setMessage('Clip saved as a Reel! ✅');
            setTimeout(() => { setMode('idle'); setMessage(''); }, 3000);
        } catch (err) {
            setMode('error');
            setMessage('Failed to save clip.');
            setTimeout(() => { setMode('idle'); setMessage(''); }, 3000);
        }
    };

    const handleCancel = () => {
        setMode('idle');
        setClipStart(null);
        setMessage('');
    };

    return (
        <div className="flex items-center gap-2">
            {mode === 'idle' && (
                <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleStartSelect}
                    className="text-white bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-xs px-3 py-1.5 h-auto rounded-full"
                    title="Clip 30s from current position"
                >
                    <Scissors className="w-3.5 h-3.5" />
                    Clip
                </Button>
            )}

            {mode === 'selecting' && (
                <div className="flex items-center gap-1.5">
                    <span className="text-yellow-300 text-xs">{message}</span>
                    <button
                        onClick={handleConfirm}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-medium"
                    >
                        <Check className="w-3 h-3" /> Save
                    </button>
                    <button
                        onClick={handleCancel}
                        className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-700 hover:bg-gray-600 text-white text-xs"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {mode === 'clipping' && (
                <span className="text-blue-300 text-xs flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> {message}
                </span>
            )}

            {(mode === 'done' || mode === 'error') && (
                <span className={`text-xs ${mode === 'done' ? 'text-green-400' : 'text-red-400'}`}>
                    {message}
                </span>
            )}
        </div>
    );
}

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
}