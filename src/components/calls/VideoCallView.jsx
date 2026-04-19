import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Mic, MicOff, Video, VideoOff, PhoneOff, 
    Monitor, MessageSquare, Users,
    Volume2, Maximize2, Minimize2, Hand, Settings,
    X, Send, ChevronDown
} from 'lucide-react';
import CallNetworkStatus from './CallNetworkStatus';

export default function VideoCallView({ 
    participants = [], 
    currentUser,
    isGroupCall = false,
    callName = "Video Call",
    onEndCall 
}) {
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOn, setIsVideoOn] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [activeParticipant, setActiveParticipant] = useState(participants[0] || null);
    const [callDuration, setCallDuration] = useState(0);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [handRaised, setHandRaised] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showSettings, setShowSettings] = useState(false);
    const [audioDevice, setAudioDevice] = useState('Default Mic');
    const [videoDevice, setVideoDevice] = useState('Default Camera');

    // Call timer
    useEffect(() => {
        const timer = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const formatDuration = (seconds) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getParticipantColor = (index) => {
        const colors = [
            'bg-gradient-to-br from-blue-600 to-indigo-800',
            'bg-gradient-to-br from-purple-600 to-pink-700',
            'bg-gradient-to-br from-green-600 to-teal-700',
            'bg-gradient-to-br from-orange-500 to-red-600',
            'bg-gradient-to-br from-cyan-500 to-blue-600',
            'bg-gradient-to-br from-rose-500 to-purple-600',
        ];
        return colors[index % colors.length];
    };

    const sendChatMessage = () => {
        if (!newMessage.trim()) return;
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            sender: currentUser?.full_name || 'You',
            content: newMessage,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setNewMessage('');
    };

    const ParticipantTile = ({ participant, index, isLarge = false, isSelf = false }) => (
        <div 
            className={`relative rounded-2xl overflow-hidden ${getParticipantColor(index)} ${isLarge ? 'w-full h-full' : 'aspect-video'} flex items-center justify-center cursor-pointer transition-transform hover:scale-[1.02]`}
            onClick={() => !isLarge && setActiveParticipant(participant)}
        >
            <div className="absolute inset-0 flex items-center justify-center">
                {(!isVideoOn && isSelf) || (!participant?.isVideoOn && !isSelf) ? (
                    <Avatar className={`${isLarge ? 'h-32 w-32' : 'h-16 w-16'}`}>
                        <AvatarImage src={participant?.avatar_url} />
                        <AvatarFallback className="text-3xl bg-white/20 text-white">
                            {participant?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                    </Avatar>
                ) : (
                    <div className="text-white/30 text-sm">Video Feed</div>
                )}
            </div>

            {/* Hand raised indicator */}
            {((isSelf && handRaised) || participant?.handRaised) && (
                <div className="absolute top-3 right-3 p-2 bg-yellow-500 rounded-full animate-bounce">
                    <Hand className="w-4 h-4 text-white" />
                </div>
            )}

            {/* Screen sharing indicator */}
            {((isSelf && isScreenSharing) || participant?.isScreenSharing) && (
                <div className="absolute top-3 left-3 px-2 py-1 bg-blue-500 rounded-full flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-white" />
                    <span className="text-xs text-white">Sharing</span>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-medium truncate">
                            {isSelf ? 'You' : participant?.full_name}
                        </span>
                        {participant?.isSpeaking && (
                            <div className="flex items-center gap-0.5">
                                <div className="w-1 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                <div className="w-1 h-4 bg-green-400 rounded-full animate-pulse delay-75"></div>
                                <div className="w-1 h-2 bg-green-400 rounded-full animate-pulse delay-150"></div>
                            </div>
                        )}
                    </div>
                    {(isSelf ? isMuted : participant?.isMuted) && (
                        <MicOff className="w-4 h-4 text-red-400" />
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className={`fixed inset-0 bg-gray-900 z-50 flex ${isFullscreen ? '' : 'md:inset-4 md:rounded-2xl md:shadow-2xl'}`}>
            {/* Main call area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-black/30">
                    <div className="flex items-center gap-3">
                        {isGroupCall && <Users className="w-5 h-5 text-white" />}
                        <div>
                            <h2 className="text-white font-semibold">{callName}</h2>
                            <p className="text-white/60 text-sm">
                                <span className="text-green-400">●</span> {formatDuration(callDuration)} • {participants.length + 1} participants
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <CallNetworkStatus />
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setShowParticipants(!showParticipants)}>
                            <Users className="w-5 h-5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={() => setIsFullscreen(!isFullscreen)}>
                            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                        </Button>
                        <div className="relative">
                            <Button variant="ghost" size="icon" className={`text-white hover:bg-white/10 ${showSettings ? 'bg-white/20' : ''}`} onClick={() => setShowSettings(v => !v)}>
                                <Settings className="w-5 h-5" />
                            </Button>
                            {showSettings && (
                                <div className="absolute right-0 top-10 w-64 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
                                        <span className="text-white font-semibold text-sm">Call Settings</span>
                                        <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Microphone</label>
                                            <select
                                                value={audioDevice}
                                                onChange={e => setAudioDevice(e.target.value)}
                                                className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none"
                                            >
                                                <option>Default Mic</option>
                                                <option>Built-in Microphone</option>
                                                <option>Headset Microphone</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-xs uppercase tracking-wide mb-1.5 block">Camera</label>
                                            <select
                                                value={videoDevice}
                                                onChange={e => setVideoDevice(e.target.value)}
                                                className="w-full bg-gray-700 text-white text-sm rounded-lg px-3 py-2 border border-gray-600 focus:outline-none"
                                            >
                                                <option>Default Camera</option>
                                                <option>Built-in Camera</option>
                                                <option>External Webcam</option>
                                            </select>
                                        </div>
                                        <div className="pt-1 border-t border-gray-700">
                                            <p className="text-gray-400 text-xs mb-1">Network</p>
                                            <CallNetworkStatus />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main video area */}
                <div className="flex-1 p-4 overflow-hidden">
                    {isGroupCall ? (
                        <div className={`h-full grid gap-2 ${
                            participants.length <= 1 ? 'grid-cols-1' :
                            participants.length <= 4 ? 'grid-cols-2' :
                            participants.length <= 9 ? 'grid-cols-3' :
                            'grid-cols-4'
                        }`}>
                            <ParticipantTile participant={currentUser} index={0} isSelf={true} />
                            {participants.map((p, idx) => (
                                <ParticipantTile key={p.id || idx} participant={p} index={idx + 1} />
                            ))}
                        </div>
                    ) : (
                        <div className="relative h-full">
                            <ParticipantTile participant={activeParticipant || participants[0]} index={1} isLarge={true} />
                            <div className="absolute bottom-4 right-4 w-32 md:w-48 rounded-xl overflow-hidden shadow-lg border-2 border-white/20">
                                <ParticipantTile participant={currentUser} index={0} isSelf={true} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom controls */}
                <div className="p-6 bg-black/30">
                    <div className="flex items-center justify-center gap-3 md:gap-4">
                        <Button 
                            variant="ghost" size="lg"
                            className={`rounded-full h-14 w-14 ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                            onClick={() => setIsMuted(!isMuted)}
                        >
                            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                        </Button>

                        <Button 
                            variant="ghost" size="lg"
                            className={`rounded-full h-14 w-14 ${!isVideoOn ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                            onClick={() => setIsVideoOn(!isVideoOn)}
                        >
                            {isVideoOn ? <Video className="w-6 h-6 text-white" /> : <VideoOff className="w-6 h-6 text-white" />}
                        </Button>

                        <Button 
                            variant="ghost" size="lg"
                            className={`rounded-full h-14 w-14 hidden md:flex ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                            onClick={() => setIsScreenSharing(!isScreenSharing)}
                        >
                            <Monitor className="w-6 h-6 text-white" />
                        </Button>

                        <Button 
                            variant="ghost" size="lg"
                            className={`rounded-full h-14 w-14 ${handRaised ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-white/10 hover:bg-white/20'}`}
                            onClick={() => setHandRaised(!handRaised)}
                        >
                            <Hand className="w-6 h-6 text-white" />
                        </Button>

                        <Button 
                            variant="ghost" size="lg"
                            className="rounded-full h-14 w-14 bg-red-500 hover:bg-red-600"
                            onClick={onEndCall}
                        >
                            <PhoneOff className="w-6 h-6 text-white" />
                        </Button>

                        <Button 
                            variant="ghost" size="lg"
                            className={`rounded-full h-14 w-14 hidden md:flex ${showChat ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/10 hover:bg-white/20'}`}
                            onClick={() => setShowChat(!showChat)}
                        >
                            <MessageSquare className="w-6 h-6 text-white" />
                        </Button>

                        <Button variant="ghost" size="lg" className="rounded-full h-14 w-14 bg-white/10 hover:bg-white/20">
                            <Volume2 className="w-6 h-6 text-white" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Chat sidebar */}
            {showChat && (
                <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-white font-semibold">In-call Chat</h3>
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowChat(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className="text-sm">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-white font-medium">{msg.sender}</span>
                                        <span className="text-gray-500 text-xs">{msg.time}</span>
                                    </div>
                                    <p className="text-gray-300">{msg.content}</p>
                                </div>
                            ))}
                            {chatMessages.length === 0 && (
                                <p className="text-gray-500 text-center text-sm">No messages yet</p>
                            )}
                        </div>
                    </ScrollArea>
                    <div className="p-4 border-t border-gray-700">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Type a message..."
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
                                className="bg-gray-700 border-gray-600 text-white"
                            />
                            <Button size="icon" onClick={sendChatMessage}>
                                <Send className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participants sidebar */}
            {showParticipants && (
                <div className="w-72 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                        <h3 className="text-white font-semibold">Participants ({participants.length + 1})</h3>
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => setShowParticipants(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                            {/* Current user */}
                            <div className="flex items-center gap-3 p-2 rounded-lg bg-gray-700/50">
                                <Avatar className="w-10 h-10">
                                    <AvatarImage src={currentUser?.avatar_url} />
                                    <AvatarFallback>{currentUser?.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{currentUser?.full_name} (You)</p>
                                </div>
                                <div className="flex gap-1">
                                    {isMuted && <MicOff className="w-4 h-4 text-red-400" />}
                                    {!isVideoOn && <VideoOff className="w-4 h-4 text-red-400" />}
                                </div>
                            </div>
                            {/* Other participants */}
                            {participants.map((p, idx) => (
                                <div key={p.id || idx} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700/50">
                                    <Avatar className="w-10 h-10">
                                        <AvatarImage src={p.avatar_url} />
                                        <AvatarFallback>{p.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-medium truncate">{p.full_name}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}
        </div>
    );
}