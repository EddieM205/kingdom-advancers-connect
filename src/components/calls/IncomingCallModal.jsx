import React, { useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Phone, PhoneOff, Video, Users } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ringIncoming1on1, ringIncomingGroup } from '@/lib/callSounds';

const useIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const CallContent = ({ caller, isVideoCall, isGroupCall, groupName, onAccept, onDecline }) => (
    <div className="bg-gradient-to-b from-gray-800 to-gray-900 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl border border-white/10">
        {/* Animated rings */}
        <div className="relative mx-auto w-32 h-32 mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-green-500/30 animate-ping"></div>
            <div className="absolute inset-2 rounded-full border-4 border-green-500/40 animate-ping delay-150"></div>
            <div className="absolute inset-4 rounded-full border-4 border-green-500/50 animate-ping delay-300"></div>
            <Avatar className="relative w-full h-full border-4 border-green-500">
                <AvatarImage src={caller?.avatar_url} className="object-cover" />
                <AvatarFallback className="text-4xl bg-gray-700 text-white">
                    {isGroupCall ? <Users className="w-12 h-12" /> : caller?.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
            </Avatar>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">
            {isGroupCall ? groupName : caller?.full_name}
        </h2>
        <p className="text-gray-400 mb-2">
            {isVideoCall ? 'Incoming video call...' : 'Incoming voice call...'}
        </p>
        {isGroupCall && (
            <p className="text-sm text-gray-500 mb-4">{caller?.full_name} is calling</p>
        )}

        <div className="flex items-center justify-center gap-2 mb-8">
            {isVideoCall ? (
                <Video className="w-5 h-5 text-blue-400" />
            ) : (
                <Phone className="w-5 h-5 text-green-400" />
            )}
            <span className="text-sm text-gray-400">{isVideoCall ? 'Video Call' : 'Voice Call'}</span>
        </div>

        <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center gap-2">
                <Button
                    size="lg"
                    className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                    onClick={onDecline}
                >
                    <PhoneOff className="w-7 h-7 text-white" />
                </Button>
                <span className="text-sm text-gray-400">Decline</span>
            </div>
            <div className="flex flex-col items-center gap-2">
                <Button
                    size="lg"
                    className="rounded-full h-16 w-16 bg-green-500 hover:bg-green-600 shadow-lg shadow-green-500/30"
                    onClick={onAccept}
                >
                    {isVideoCall ? (
                        <Video className="w-7 h-7 text-white" />
                    ) : (
                        <Phone className="w-7 h-7 text-white" />
                    )}
                </Button>
                <span className="text-sm text-gray-400">Accept</span>
            </div>
        </div>
    </div>
);

export default function IncomingCallModal({ caller, isVideoCall = true, isGroupCall = false, groupName = "", onAccept, onDecline }) {
    const isMobile = useIsMobile();

    // Ring tone — melodic marimba for 1-on-1, double-pulse vibrato for group
    useEffect(() => {
        const stop = isGroupCall ? ringIncomingGroup() : ringIncoming1on1();
        return stop;
    }, [isGroupCall]);

    // Vibration
    useEffect(() => {
        if (!navigator.vibrate) return;
        const pattern = [400, 200, 400, 1000];
        const loop = setInterval(() => navigator.vibrate(pattern), 2000);
        navigator.vibrate(pattern);
        return () => { clearInterval(loop); navigator.vibrate(0); };
    }, []);

    if (isMobile) {
        return (
            <Drawer open={true} onOpenChange={(open) => { if (!open) onDecline(); }}>
                <DrawerContent className="bg-transparent border-0 pb-8 px-4">
                    <CallContent
                        caller={caller}
                        isVideoCall={isVideoCall}
                        isGroupCall={isGroupCall}
                        groupName={groupName}
                        onAccept={onAccept}
                        onDecline={onDecline}
                    />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <CallContent
                caller={caller}
                isVideoCall={isVideoCall}
                isGroupCall={isGroupCall}
                groupName={groupName}
                onAccept={onAccept}
                onDecline={onDecline}
            />
        </div>
    );
}