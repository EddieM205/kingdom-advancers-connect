import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { PhoneOff, Video, Phone } from 'lucide-react';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

const useIsMobile = () => {
    if (typeof window === 'undefined') return false;
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
};

const OutgoingContent = ({ recipient, isVideoCall, isGroupCall, groupName, participants, onCancel }) => (
    <div className="flex flex-col items-center justify-center w-full py-10 bg-gradient-to-b from-gray-900 via-gray-800 to-black rounded-t-3xl">
        {/* Top indicator */}
        <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full">
                {isVideoCall ? (
                    <Video className="w-4 h-4 text-blue-400" />
                ) : (
                    <Phone className="w-4 h-4 text-green-400" />
                )}
                <span className="text-sm text-white">{isVideoCall ? 'Video Call' : 'Voice Call'}</span>
            </div>
        </div>

        {/* Avatar */}
        <div className="relative mx-auto w-40 h-40 mb-8">
            <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-pulse"></div>
            <div className="absolute -inset-4 rounded-full border border-blue-500/30 animate-ping" style={{ animationDuration: '2s' }}></div>
            {isGroupCall ? (
                <div className="relative w-full h-full flex items-center justify-center">
                    <div className="relative">
                        {participants.slice(0, 3).map((p, idx) => (
                            <Avatar
                                key={p.id || idx}
                                className={`absolute w-20 h-20 border-4 border-gray-900 ${
                                    idx === 0 ? 'z-30 top-0 left-1/2 -translate-x-1/2' :
                                    idx === 1 ? 'z-20 top-12 left-0' :
                                    'z-10 top-12 right-0'
                                }`}
                            >
                                <AvatarImage src={p.avatar_url} />
                                <AvatarFallback className="bg-gray-700 text-white">
                                    {p.full_name?.charAt(0)}
                                </AvatarFallback>
                            </Avatar>
                        ))}
                    </div>
                </div>
            ) : (
                <Avatar className="relative w-full h-full border-4 border-blue-500/50">
                    <AvatarImage src={recipient?.avatar_url} className="object-cover" />
                    <AvatarFallback className="text-5xl bg-gray-700 text-white">
                        {recipient?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                </Avatar>
            )}
        </div>

        <h2 className="text-3xl font-bold text-white mb-2">
            {isGroupCall ? groupName : recipient?.full_name}
        </h2>

        <div className="flex items-center justify-center gap-1 text-gray-400 mb-2">
            <span>Calling</span>
            <span className="flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
            </span>
        </div>

        {isGroupCall && (
            <p className="text-sm text-gray-500 mb-6">
                {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </p>
        )}

        <div className="mt-8 flex flex-col items-center gap-3">
            <Button
                size="lg"
                className="rounded-full h-16 w-16 bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30"
                onClick={onCancel}
            >
                <PhoneOff className="w-7 h-7 text-white" />
            </Button>
            <span className="text-sm text-gray-400">Cancel</span>
        </div>
    </div>
);

export default function OutgoingCallModal({ recipient, isVideoCall = true, isGroupCall = false, groupName = "", participants = [], onCancel }) {
    const isMobile = useIsMobile();

    if (isMobile) {
        return (
            <Drawer open={true} onOpenChange={(open) => { if (!open) onCancel(); }}>
                <DrawerContent className="border-0 p-0">
                    <OutgoingContent
                        recipient={recipient}
                        isVideoCall={isVideoCall}
                        isGroupCall={isGroupCall}
                        groupName={groupName}
                        participants={participants}
                        onCancel={onCancel}
                    />
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-b from-gray-900 via-gray-800 to-black z-50 flex flex-col items-center justify-center p-4">
            <OutgoingContent
                recipient={recipient}
                isVideoCall={isVideoCall}
                isGroupCall={isGroupCall}
                groupName={groupName}
                participants={participants}
                onCancel={onCancel}
            />
        </div>
    );
}