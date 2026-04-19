import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { X, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getThemeClass } from '@/components/theming';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

const EMOJIS = ['❤️', '😂', '😮', '😢', '🔥', '👏'];

export default function StoryViewer({ users, initialUser, storiesByUser, onClose }) {
    const [currentUserIndex, setCurrentUserIndex] = useState(() => users.findIndex(u => u.id === initialUser.id));
    const [storyIndex, setStoryIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [sentReaction, setSentReaction] = useState(null);
    const [autoScroll, setAutoScroll] = useState(true);
    const videoRef = useRef(null);

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    const reactionMutation = useMutation({
        mutationFn: async ({ storyId, emoji, storyCreatorEmail }) => {
            await base44.entities.Reaction.create({ story_id: storyId, emoji, reactor_email: me.email });
            // Notify the story creator (but not if they reacted to their own story)
            if (storyCreatorEmail && storyCreatorEmail !== me.email) {
                await base44.entities.Notification.create({
                    recipient_id: storyCreatorEmail,
                    content: `${me.full_name} reacted ${emoji} to your story`,
                    link: '/Feed',
                });
            }
        },
        onSuccess: (_, { emoji }) => {
            setSentReaction(emoji);
            setShowEmojiPicker(false);
            setTimeout(() => setSentReaction(null), 2000);
        }
    });

    const currentUser = useMemo(() => users[currentUserIndex], [users, currentUserIndex]);

    const userStories = useMemo(() => storiesByUser[currentUser?.email] || [], [storiesByUser, currentUser]);

    const currentStory = useMemo(() => {
        if (!currentUser) return null;
        return userStories[storyIndex];
    }, [currentUser, storyIndex, userStories]);

    const nextStory = useCallback(() => {
        setIsPaused(false);
        if (storyIndex < userStories.length - 1) {
            setStoryIndex(prev => prev + 1);
        } else if (currentUserIndex < users.length - 1) {
            setCurrentUserIndex(prev => prev + 1);
            setStoryIndex(0);
        } else {
            onClose();
        }
    }, [storyIndex, userStories.length, currentUserIndex, users.length, onClose]);

    const prevStory = useCallback(() => {
        setIsPaused(false);
        if (storyIndex > 0) {
            setStoryIndex(prev => prev - 1);
        } else if (currentUserIndex > 0) {
            setCurrentUserIndex(prev => prev - 1);
            // Go to the last story of the previous user
            const prevUser = users[currentUserIndex - 1];
            const prevUserStories = storiesByUser[prevUser?.email] || [];
            setStoryIndex(prevUserStories.length - 1);
        }
    }, [storyIndex, currentUserIndex, users, storiesByUser]);

    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    useEffect(() => {
        if (!userStories.length || !currentStory || isPaused || !autoScroll) return;

        const isVideo = currentStory.file_url && (currentStory.file_url.includes('.mp4') || currentStory.file_url.includes('.mov'));

        if (isVideo) {
            // For video stories, rely on the video's 'onEnded' event
            // Ensure video plays when story loads
            if (videoRef.current) {
                videoRef.current.currentTime = 0; // Reset video to start
                videoRef.current.play().catch(e => console.error("Error playing video:", e));
            }
            return; // No timer needed for videos
        }

        // For image/text stories, set a timer
        const timer = setTimeout(() => {
            nextStory();
        }, 5000); // 5 seconds per story

        return () => clearTimeout(timer);
    }, [storyIndex, currentUserIndex, users.length, userStories.length, onClose, currentStory, isPaused, autoScroll, nextStory]);

    // Reset reaction state when story changes
    useEffect(() => { setSentReaction(null); setShowEmojiPicker(false); }, [storyIndex, currentUserIndex]);

    if (!currentUser || !currentStory) return null;

    // Apply theme only if it's a text-only story (no file_url)
    const themeClass = currentStory.content && !currentStory.file_url ? getThemeClass(currentStory.theme) : '';

    const handleProgressClick = (e, index) => {
        e.stopPropagation();
        setStoryIndex(index);
        setIsPaused(false);
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center" onClick={handleClose}>
            <div className="absolute top-4 left-4 right-4 z-10">
                <div className="flex items-center gap-2 mb-1">
                    {userStories.map((_, index) => (
                        <div 
                            key={index} 
                            className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden cursor-pointer"
                            onClick={(e) => handleProgressClick(e, index)}
                        >
                            {index < storyIndex && <div className="h-full w-full bg-white rounded-full" />}
                            {index === storyIndex && (() => {
                                const isVideo = currentStory.file_url && (currentStory.file_url.includes('.mp4') || currentStory.file_url.includes('.mov'));
                                const shouldAnimate = !isPaused && !isVideo && autoScroll;
                                return (
                                    <div
                                        key={`${currentUserIndex}-${storyIndex}`}
                                        className="h-full bg-white rounded-full"
                                        style={shouldAnimate ? { animation: 'story-progress 5s linear forwards' } : { width: '0%' }}
                                    />
                                );
                            })()}
                        </div>
                    ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={currentUser.avatar_url} />
                            <AvatarFallback>{currentUser.full_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-white font-semibold">{currentUser.full_name}</span>
                        {currentStory.created_date && (
                            <span className="text-gray-300 text-sm">{formatDistanceToNow(new Date(currentStory.created_date), { addSuffix: true })}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button 
                            onClick={() => setAutoScroll(!autoScroll)} 
                            variant="ghost" 
                            size="sm"
                            className="text-white/80 hover:text-white hover:bg-white/10"
                            title={autoScroll ? "Pause auto-advance" : "Resume auto-advance"}
                        >
                            {autoScroll ? <Pause size={18} /> : <Play size={18} />}
                        </Button>
                        <button onClick={handleClose} className="text-white/80 hover:text-white">
                            <X size={24} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="relative w-full h-full flex items-center justify-center">
                <button
                    onClick={(e) => { e.stopPropagation(); prevStory(); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={storyIndex === 0 && currentUserIndex === 0}
                >
                    <ChevronLeft size={24} />
                </button>
                <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-lg overflow-hidden flex items-center justify-center" onClick={e => e.stopPropagation()}>
                    {currentStory.file_url ? (
                        <>
                            {(currentStory.file_url.includes('.mp4') || currentStory.file_url.includes('.mov')) ? (
                                <video 
                                    ref={videoRef} 
                                    src={currentStory.file_url} 
                                    className="w-full h-full object-contain" 
                                    autoPlay 
                                    muted // Mute by default for autoplay policy
                                    playsInline // For iOS autoplay
                                    onPlay={() => setIsPaused(false)}
                                    onPause={() => setIsPaused(true)}
                                    onEnded={nextStory} 
                                    onClick={() => {
                                        if (videoRef.current.paused) {
                                            videoRef.current.play();
                                        } else {
                                            videoRef.current.pause();
                                        }
                                    }}
                                />
                            ) : (
                                <img src={currentStory.file_url} alt="Story" className="w-full h-full object-contain" />
                            )}
                            {currentStory.content && (
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                                    <p className="text-white text-center text-lg font-semibold">{currentStory.content}</p>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center p-8 ${themeClass}`}>
                            <p className="text-center text-2xl font-bold whitespace-pre-wrap">{currentStory.content}</p>
                        </div>
                    )}
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); nextStory(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 z-20 text-white bg-black/30 p-2 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={storyIndex === userStories.length - 1 && currentUserIndex === users.length - 1}
                >
                    <ChevronRight size={24} />
                </button>

                {/* Reaction Button */}
                <div className="absolute bottom-6 right-4 z-20 flex flex-col items-end gap-2" onClick={e => e.stopPropagation()}>
                    {showEmojiPicker && (
                        <div className="flex gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2 mb-1">
                            {EMOJIS.map(emoji => (
                                <button
                                    key={emoji}
                                    className="text-2xl hover:scale-125 transition-transform"
                                    onClick={() => reactionMutation.mutate({ storyId: currentStory.id, emoji, storyCreatorEmail: currentUser.email })}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                    {sentReaction && (
                        <div className="text-4xl animate-bounce">{sentReaction}</div>
                    )}
                    <button
                        className="bg-black/50 backdrop-blur-sm text-white rounded-full w-11 h-11 flex items-center justify-center text-2xl hover:bg-black/70 transition-colors"
                        onClick={() => setShowEmojiPicker(p => !p)}
                    >
                        ❤️
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes story-progress {
                    from { width: 0%; }
                    to { width: 100%; }
                }
            `}</style>
        </div>
    );
}