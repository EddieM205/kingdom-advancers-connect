import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users } from 'lucide-react';
import { scorePeopleYouMayKnow } from '@/lib/feedRanking';
import FollowButton from '@/components/profile/FollowButton';
import { Link } from 'react-router-dom';
import { useBlockedEmails } from '@/lib/useBlockedEmails';

export default function PeopleYouMayKnow({ me }) {
    const { data: myFollows = [] } = useQuery({
        queryKey: ['my_follows', me?.email],
        queryFn: () => base44.entities.Follow.filter({ follower_email: me.email }),
        enabled: !!me,
    });

    const { data: allFollows = [] } = useQuery({
        queryKey: ['all_follows_discovery'],
        queryFn: () => base44.entities.Follow.list(),
        enabled: !!me,
    });

    const { data: myInterests = [] } = useQuery({
        queryKey: ['user_interests', me?.email],
        queryFn: () => base44.entities.Interest.filter({ user_email: me.email }),
        enabled: !!me,
    });

    const { data: allUsers = [], isLoading } = useQuery({
        queryKey: ['users_discovery'],
        queryFn: () => base44.entities.User.list(),
        enabled: !!me,
    });

    const blockedSet = useBlockedEmails(me?.email);

    const suggestions = useMemo(() => {
        if (!me || !allUsers.length) return [];
        const myFollowingEmails = myFollows.map(f => f.following_email);
        const nonBlockedUsers = allUsers.filter(u => !blockedSet.has(u.email));
        return scorePeopleYouMayKnow(me.email, myFollowingEmails, allFollows, myInterests, nonBlockedUsers).slice(0, 10);
    }, [me, myFollows, allFollows, myInterests, allUsers, blockedSet]);

    if (isLoading) return <div className="flex justify-center py-8"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>;

    if (!suggestions.length) return (
        <div className="text-center py-10 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No suggestions yet. Engage with more content!</p>
        </div>
    );

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {suggestions.map(user => (
                <div key={user.id} className="flex flex-col items-center text-center bg-card border border-border rounded-xl p-4 gap-3">
                    <Link to={`/CreatorProfile?email=${user.email}`}>
                        <Avatar className="w-14 h-14 hover:opacity-80 transition-opacity">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="text-lg font-semibold">{user.full_name?.charAt(0) || 'U'}</AvatarFallback>
                        </Avatar>
                    </Link>
                    <div className="min-w-0 w-full">
                        <Link to={`/CreatorProfile?email=${user.email}`}>
                            <p className="font-semibold text-sm truncate hover:underline">{user.full_name}</p>
                        </Link>
                        {user._mutualCount > 0 && (
                            <p className="text-xs text-muted-foreground">{user._mutualCount} mutual connection{user._mutualCount > 1 ? 's' : ''}</p>
                        )}
                    </div>
                    <FollowButton targetEmail={user.email} me={me} />
                </div>
            ))}
        </div>
    );
}