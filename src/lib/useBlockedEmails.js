/**
 * Shared hook: returns a Set of all emails blocked by OR blocking the current user.
 * Two-way block: if A blocks B, both sides are hidden from each other.
 */
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { base44 } from '@/api/base44Client';

export function useBlockedEmails(myEmail) {
    const { data: blocks = [] } = useQuery({
        queryKey: ['blocked_emails', myEmail],
        queryFn: () => base44.entities.Block.filter({
            '$or': [{ blocker_email: myEmail }, { blocked_email: myEmail }]
        }),
        enabled: !!myEmail,
        staleTime: 30_000,
    });

    return useMemo(() => {
        const set = new Set();
        blocks.forEach(b => {
            if (b.blocker_email === myEmail) set.add(b.blocked_email);
            else set.add(b.blocker_email);
        });
        return set;
    }, [blocks, myEmail]);
}