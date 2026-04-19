import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserPlus, UserCheck, Clock, Loader2 } from 'lucide-react';
import { notifyFollowing } from '@/lib/notifications';

// dark=true: white button style (for overlays on dark backgrounds like reels)
export default function FollowButton({ targetEmail, me, dark = false }) {
    const queryClient = useQueryClient();

    const { data: follows = [], isLoading } = useQuery({
        queryKey: ['follows', me?.email, targetEmail],
        queryFn: () => base44.entities.Follow.filter({ follower_email: me.email, following_email: targetEmail }),
        enabled: !!me?.email && !!targetEmail,
    });

    const isFollowing = follows.some(f => f.status === 'accepted');
    const isPendingRequest = !isFollowing && follows.some(f => f.status === 'pending');

    const followMutation = useMutation({
        mutationFn: async () => {
            await base44.entities.Follow.create({
                follower_email: me.email,
                following_email: targetEmail,
            });
            await notifyFollowing({ follower: me, targetEmail });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follows', me?.email, targetEmail] }),
    });

    const unfollowMutation = useMutation({
        mutationFn: () => base44.entities.Follow.delete(follows[0].id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['follows', me?.email, targetEmail] }),
    });

    if (!me || me.email === targetEmail) return null;

    const isPending = followMutation.isPending || unfollowMutation.isPending || isLoading;

    if (dark) {
        return (
            <button
                onClick={() => (isFollowing || isPendingRequest) ? unfollowMutation.mutate() : followMutation.mutate()}
                disabled={isPending}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                    isFollowing || isPendingRequest
                        ? 'bg-white/20 text-white border border-white/40 hover:bg-white/30'
                        : 'bg-white text-black hover:bg-white/90'
                }`}
            >
                {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> :
                 isFollowing ? <><UserCheck className="w-3 h-3" /> Following</> :
                 isPendingRequest ? <><Clock className="w-3 h-3" /> Requested</> :
                 <><UserPlus className="w-3 h-3" /> Follow</>}
            </button>
        );
    }

    return (
        <Button
            size="sm"
            variant={(isFollowing || isPendingRequest) ? 'outline' : 'default'}
            onClick={() => (isFollowing || isPendingRequest) ? unfollowMutation.mutate() : followMutation.mutate()}
            disabled={isPending}
            className="flex items-center gap-1.5"
        >
            {isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : isFollowing ? (
                <><UserCheck className="w-3.5 h-3.5" /> Following</>
            ) : isPendingRequest ? (
                <><Clock className="w-3.5 h-3.5" /> Requested</>
            ) : (
                <><UserPlus className="w-3.5 h-3.5" /> Follow</>
            )}
        </Button>
    );
}