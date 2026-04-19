import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Medal, Award, Loader2 } from 'lucide-react';

export default function Leaderboard({ currentUserEmail }) {
    const { data: users, isLoading } = useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => base44.entities.User.list(),
    });

    const sortedUsers = React.useMemo(() => {
        if (!users) return [];
        return [...users]
            .filter(u => u.xp > 0 || u.level > 1)
            .sort((a, b) => (b.xp || 0) - (a.xp || 0))
            .slice(0, 10);
    }, [users]);

    const getRankIcon = (rank) => {
        if (rank === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (rank === 1) return <Medal className="w-5 h-5 text-gray-400" />;
        if (rank === 2) return <Award className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-muted-foreground">#{rank + 1}</span>;
    };

    const getRankBg = (rank) => {
        if (rank === 0) return 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200';
        if (rank === 1) return 'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200';
        if (rank === 2) return 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200';
        return '';
    };

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-yellow-500" />
                    Leaderboard
                </CardTitle>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center py-4"><Loader2 className="animate-spin" /></div>
                ) : sortedUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No rankings yet</p>
                ) : (
                    <div className="space-y-2">
                        {sortedUsers.map((user, idx) => (
                            <div 
                                key={user.id} 
                                className={`flex items-center gap-3 p-2 rounded-lg border transition-colors ${getRankBg(idx)} ${
                                    user.email === currentUserEmail ? 'ring-2 ring-primary' : ''
                                }`}
                            >
                                <div className="w-8 flex justify-center">
                                    {getRankIcon(idx)}
                                </div>
                                <Avatar className="w-8 h-8">
                                    <AvatarImage src={user.avatar_url} />
                                    <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">
                                        {user.full_name}
                                        {user.email === currentUserEmail && <span className="text-xs text-muted-foreground ml-1">(You)</span>}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Level {user.level || 1}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-sm">{user.xp || 0}</p>
                                    <p className="text-xs text-muted-foreground">XP</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}