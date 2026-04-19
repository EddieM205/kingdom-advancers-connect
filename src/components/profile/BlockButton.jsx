import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { UserX, UserCheck } from 'lucide-react';

export default function BlockButton({ targetEmail, me }) {
    const queryClient = useQueryClient();

    const { data: blockRecord, isLoading } = useQuery({
        queryKey: ['block_status', me?.email, targetEmail],
        queryFn: async () => {
            const blocks = await base44.entities.Block.filter({ blocker_email: me.email, blocked_email: targetEmail });
            return blocks[0] ?? null;
        },
        enabled: !!me?.email && !!targetEmail,
    });

    const blockMutation = useMutation({
        mutationFn: async () => {
            // Create block record
            await base44.entities.Block.create({ blocker_email: me.email, blocked_email: targetEmail });

            // Remove all follow relationships (both directions)
            const [followsAB, followsBA] = await Promise.all([
                base44.entities.Follow.filter({ follower_email: me.email, following_email: targetEmail }),
                base44.entities.Follow.filter({ follower_email: targetEmail, following_email: me.email }),
            ]);
            await Promise.all([...followsAB, ...followsBA].map(f => base44.entities.Follow.delete(f.id)));

            // Remove any DM groups (contacts) between the two users
            const dms = await base44.entities.Group.filter({ type: 'dm' });
            const sharedDms = dms.filter(g => g.members?.includes(me.email) && g.members?.includes(targetEmail));
            await Promise.all(sharedDms.map(g => base44.entities.Group.delete(g.id)));

            // Notify admin of block action for moderation review
            await base44.entities.Notification.create({
                recipient_id: 'admin',
                is_read: false,
                content: `BLOCK: ${me.full_name || me.email} blocked ${targetEmail}. Review for potential policy violation.`,
                link: '/AdminDashboard',
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['block_status'] });
            queryClient.invalidateQueries({ queryKey: ['blocked_emails'] });
            queryClient.invalidateQueries({ queryKey: ['my_follows'] });
            queryClient.invalidateQueries({ queryKey: ['dm_groups'] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['feed_posts_visible'] });
        },
    });

    const unblockMutation = useMutation({
        mutationFn: () => base44.entities.Block.delete(blockRecord.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['block_status'] });
            queryClient.invalidateQueries({ queryKey: ['blocked_emails'] });
            queryClient.invalidateQueries({ queryKey: ['feed_posts_visible'] });
        },
    });

    if (isLoading || !me || me.email === targetEmail) return null;

    const isBlocked = !!blockRecord;
    const isPending = blockMutation.isPending || unblockMutation.isPending;

    return (
        <Button
            variant={isBlocked ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => isBlocked ? unblockMutation.mutate() : blockMutation.mutate()}
            disabled={isPending}
            className={isBlocked ? 'text-red-500 border-red-500 hover:bg-red-50' : 'text-muted-foreground'}
        >
            {isBlocked ? <><UserCheck className="w-4 h-4 mr-2" />Unblock</> : <><UserX className="w-4 h-4 mr-2" />Block</>}
        </Button>
    );
}