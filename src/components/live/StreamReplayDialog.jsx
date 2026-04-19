import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Heart, MessageCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import ClipButton from './ClipButton';

// A single floating emoji that animates upward
function FloatingEmoji({ emoji, id, onDone }) {
    const left = 10 + Math.random() * 80;
    const duration = 2500 + Math.random() * 1500;
    const size = 24 + Math.floor(Math.random() * 20);

    useEffect(() => {
        const t = setTimeout(onDone, duration + 200);
        return () => clearTimeout(t);
    }, []);

    return (
        <span
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

// Format seconds into M:SS or H:MM:SS
function formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

export default function StreamReplayDialog({ stream, open, onClose }) {
    const videoRef = useRef(null);
    const [currentTime, setCurrentTime] = useState(0);
    const [particles, setParticles] = useState([]);
    const firedReactionIds = useRef(new Set());
    const firedCommentIds = useRef(new Set());
    const [liveComments, setLiveComments] = useState([]); // comments that have "appeared" so far

    const groupKey = `live_${stream?.id}`;
    const REACTION_GROUP = `reaction_${stream?.id}`;
    const streamStart = stream?.stream_start_time ? new Date(stream.stream_start_time).getTime() : null;

    // Fetch all live chat messages
    const { data: allMessages = [] } = useQuery({
        queryKey: ['replay-chat', stream?.id],
        queryFn: () => base44.entities.Message.filter({ group_id: groupKey }, 'created_date', 200),
        enabled: open && !!stream?.id,
    });

    // Fetch all reactions from the live
    const { data: allReactions = [] } = useQuery({
        queryKey: ['replay-reactions', stream?.id],
        queryFn: () => base44.entities.Reaction.filter({ story_id: REACTION_GROUP }, 'created_date', 500),
        enabled: open && !!stream?.id,
    });

    const chatMessages = allMessages.filter(m => m.content !== '__like__');
    const likeCount = allMessages.filter(m => m.content === '__like__').length;

    // For each message/reaction, compute how many seconds into the stream it was sent
    const getOffsetSeconds = (isoDate) => {
        if (!streamStart) return null;
        return (new Date(isoDate).getTime() - streamStart) / 1000;
    };

    // Track video time
    const handleTimeUpdate = useCallback(() => {
        if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
    }, []);

    // Reset on open
    useEffect(() => {
        if (open) {
            firedReactionIds.current = new Set();
            firedCommentIds.current = new Set();
            setParticles([]);
            setLiveComments([]);
            setCurrentTime(0);
        }
    }, [open, stream?.id]);

    // Fire reactions & comments as video plays
    useEffect(() => {
        if (!streamStart) return;

        // Fire reactions
        allReactions.forEach(r => {
            if (firedReactionIds.current.has(r.id)) return;
            const offset = getOffsetSeconds(r.created_date);
            if (offset !== null && currentTime >= offset) {
                firedReactionIds.current.add(r.id);
                const particleId = r.id + '_' + Date.now();
                setParticles(prev => [...prev, { id: particleId, emoji: r.emoji }]);
            }
        });

        // Reveal comments as time passes
        chatMessages.forEach(msg => {
            if (firedCommentIds.current.has(msg.id)) return;
            const offset = getOffsetSeconds(msg.created_date);
            if (offset !== null && currentTime >= offset) {
                firedCommentIds.current.add(msg.id);
                setLiveComments(prev => [...prev, msg]);
            }
        });
    }, [currentTime, allReactions, chatMessages, streamStart]);

    const removeParticle = useCallback((id) => {
        setParticles(prev => prev.filter(p => p.id !== id));
    }, []);

    if (!stream) return null;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl p-0 overflow-hidden bg-black border-gray-800 max-h-[90vh]">
                <style>{`
                    @keyframes floatUp {
                        0%   { transform: translateY(0) scale(1);   opacity: 1; }
                        60%  { opacity: 1; }
                        100% { transform: translateY(-280px) scale(1.4); opacity: 0; }
                    }
                `}</style>

                {/* Stream header */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-900 border-b border-gray-800">
                    <Avatar className="w-8 h-8">
                        <AvatarImage src={stream.host_avatar} />
                        <AvatarFallback>{stream.host_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{stream.title}</p>
                        <p className="text-gray-400 text-xs">{stream.host_name} · {stream.updated_date && formatDistanceToNow(new Date(stream.updated_date), { addSuffix: true })}</p>
                    </div>
                    <Badge className="bg-red-600 text-white text-xs">● Replay</Badge>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><Heart className="w-3 h-3 text-red-400" />{likeCount}</span>
                        <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{chatMessages.length}</span>
                        <ClipButton videoRef={videoRef} stream={stream} />
                    </div>
                </div>

                <div className="flex flex-col md:flex-row" style={{ maxHeight: 'calc(90vh - 60px)' }}>
                    {/* Video + floating reactions */}
                    <div className="relative flex-1 bg-black min-h-[220px]">
                        <video
                            ref={videoRef}
                            src={stream.video_url}
                            controls
                            autoPlay
                            onTimeUpdate={handleTimeUpdate}
                            className="w-full h-full max-h-[50vh] md:max-h-full object-contain"
                        />
                        {/* Floating reactions overlay */}
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                            {particles.map(p => (
                                <FloatingEmoji
                                    key={p.id}
                                    id={p.id}
                                    emoji={p.emoji}
                                    onDone={() => removeParticle(p.id)}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Right panel: live-style feed + full comments */}
                    <div className="md:w-72 flex-shrink-0 bg-gray-950 flex flex-col border-t md:border-t-0 md:border-l border-gray-800" style={{ maxHeight: '50vh', minHeight: '200px' }}>
                        <Tabs defaultValue="live" className="flex flex-col h-full">
                            <TabsList className="mx-3 mt-2 mb-0 bg-gray-800 flex-shrink-0">
                                <TabsTrigger value="live" className="text-xs flex-1">Live Feed</TabsTrigger>
                                <TabsTrigger value="all" className="text-xs flex-1">All Comments</TabsTrigger>
                            </TabsList>

                            {/* Live feed — comments appear as you watch */}
                            <TabsContent value="live" className="flex-1 overflow-y-auto p-3 space-y-2 mt-2">
                                {liveComments.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center pt-4">Comments will appear as you watch...</p>
                                ) : (
                                    liveComments.map(msg => {
                                        const offset = getOffsetSeconds(msg.created_date);
                                        return (
                                            <div key={msg.id} className="flex gap-2">
                                                <Avatar className="w-6 h-6 flex-shrink-0">
                                                    <AvatarFallback className="text-xs bg-gray-700 text-white">
                                                        {msg.created_by?.charAt(0)?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <span className="text-xs text-gray-400 mr-1">{msg.created_by?.split('@')[0]}</span>
                                                    <span className="text-sm text-white">{msg.content}</span>
                                                    {offset !== null && (
                                                        <p className="text-xs text-gray-600 flex items-center gap-0.5 mt-0.5">
                                                            <Clock className="w-2.5 h-2.5" /> at {formatTime(offset)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </TabsContent>

                            {/* All comments — full list regardless of playback */}
                            <TabsContent value="all" className="flex-1 overflow-y-auto p-3 space-y-2 mt-2">
                                {chatMessages.length === 0 ? (
                                    <p className="text-gray-500 text-xs text-center pt-4">No comments from this live</p>
                                ) : (
                                    chatMessages.map(msg => {
                                        const offset = getOffsetSeconds(msg.created_date);
                                        return (
                                            <div key={msg.id} className="flex gap-2">
                                                <Avatar className="w-6 h-6 flex-shrink-0">
                                                    <AvatarFallback className="text-xs bg-gray-700 text-white">
                                                        {msg.created_by?.charAt(0)?.toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <span className="text-xs text-gray-400 mr-1">{msg.created_by?.split('@')[0]}</span>
                                                    <span className="text-sm text-white">{msg.content}</span>
                                                    {offset !== null && (
                                                        <p className="text-xs text-gray-600 flex items-center gap-0.5 mt-0.5">
                                                            <Clock className="w-2.5 h-2.5" /> at {formatTime(offset)}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}