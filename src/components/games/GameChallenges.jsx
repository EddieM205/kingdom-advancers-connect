import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Swords, Trophy, Clock, Check, X, Loader2, Zap, Shuffle, BookOpen, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const gameTypeLabels = {
    quiz: { label: 'Bible Quiz', icon: Zap, color: 'bg-yellow-100 text-yellow-800' },
    word_scramble: { label: 'Word Scramble', icon: Shuffle, color: 'bg-purple-100 text-purple-800' },
    verse_match: { label: 'Verse Match', icon: BookOpen, color: 'bg-blue-100 text-blue-800' },
    character_guess: { label: 'Who Am I?', icon: User, color: 'bg-green-100 text-green-800' },
    speed_round: { label: 'Speed Round', icon: Clock, color: 'bg-red-100 text-red-800' },
};

export default function GameChallenges({ me, onAcceptChallenge }) {
    const queryClient = useQueryClient();

    const { data: challenges, isLoading } = useQuery({
        queryKey: ['challenges', me?.email],
        queryFn: async () => {
            const sent = await base44.entities.GameChallenge.filter({ challenger_email: me.email });
            const received = await base44.entities.GameChallenge.filter({ opponent_email: me.email });
            return [...sent, ...received];
        },
        enabled: !!me,
        initialData: []
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: []
    });

    const userMap = React.useMemo(() => users.reduce((acc, u) => { acc[u.email] = u; return acc; }, {}), [users]);

    const respondMutation = useMutation({
        mutationFn: ({ id, status }) => base44.entities.GameChallenge.update(id, { status }),
        onSuccess: (_, { status }) => {
            queryClient.invalidateQueries(['challenges']);
            if (status === 'active') {
                // Trigger quiz start for accepted challenge
            }
        }
    });

    const pendingReceived = challenges.filter(c => c.status === 'pending' && c.opponent_email === me?.email);
    const pendingSent = challenges.filter(c => c.status === 'pending' && c.challenger_email === me?.email);
    const completed = challenges.filter(c => c.status === 'completed').slice(0, 5);

    if (isLoading) return <Loader2 className="animate-spin mx-auto" />;

    return (
        <div className="space-y-6">
            {pendingReceived.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Swords className="w-5 h-5 text-orange-500" />
                            Incoming Challenges ({pendingReceived.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {pendingReceived.map(challenge => {
                            const challenger = userMap[challenge.challenger_email];
                            return (
                                <div key={challenge.id} className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 border border-orange-200">
                                    <Avatar>
                                        <AvatarImage src={challenger?.avatar_url} />
                                        <AvatarFallback>{challenger?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">{challenger?.full_name} challenges you!</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={gameTypeLabels[challenge.game_type]?.color || 'bg-gray-100'}>
                                                {gameTypeLabels[challenge.game_type]?.label || 'Quiz'}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">{challenge.topic}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button 
                                            size="sm" 
                                            onClick={() => {
                                                respondMutation.mutate({ id: challenge.id, status: 'active' });
                                                onAcceptChallenge(challenge);
                                            }}
                                        >
                                            <Check className="w-4 h-4 mr-1" /> Accept
                                        </Button>
                                        <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={() => respondMutation.mutate({ id: challenge.id, status: 'completed' })}
                                        >
                                            <X className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {pendingSent.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Clock className="w-5 h-5 text-blue-500" />
                            Pending Challenges ({pendingSent.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {pendingSent.map(challenge => {
                            const opponent = userMap[challenge.opponent_email];
                            return (
                                <div key={challenge.id} className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 border border-blue-200">
                                    <Avatar>
                                        <AvatarImage src={opponent?.avatar_url} />
                                        <AvatarFallback>{opponent?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">Waiting for {opponent?.full_name}</p>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge className={gameTypeLabels[challenge.game_type]?.color || 'bg-gray-100'}>
                                                {gameTypeLabels[challenge.game_type]?.label || 'Quiz'}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">{challenge.topic}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(challenge.created_date), { addSuffix: true })}
                                    </span>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {completed.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            Recent Results
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {completed.map(challenge => {
                            const opponent = challenge.challenger_email === me?.email 
                                ? userMap[challenge.opponent_email] 
                                : userMap[challenge.challenger_email];
                            const myScore = challenge.challenger_email === me?.email ? challenge.challenger_score : challenge.opponent_score;
                            const theirScore = challenge.challenger_email === me?.email ? challenge.opponent_score : challenge.challenger_score;
                            const won = challenge.winner_email === me?.email;

                            return (
                                <div key={challenge.id} className={`flex items-center gap-3 p-3 rounded-lg border ${won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <Avatar>
                                        <AvatarImage src={opponent?.avatar_url} />
                                        <AvatarFallback>{opponent?.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1">
                                        <p className="font-medium">vs {opponent?.full_name}</p>
                                        <p className="text-sm text-muted-foreground">{challenge.topic}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold">{myScore} - {theirScore}</p>
                                        <span className={`text-xs font-medium ${won ? 'text-green-600' : 'text-red-600'}`}>
                                            {won ? 'Victory!' : 'Defeat'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}