import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Swords, Zap, Shuffle, BookOpen, User, Clock } from 'lucide-react';
import { createPageUrl } from '@/utils';

const gameTypes = [
    { id: 'quiz', name: 'Bible Quiz', icon: Zap },
    { id: 'word_scramble', name: 'Word Scramble', icon: Shuffle },
    { id: 'verse_match', name: 'Verse Match', icon: BookOpen },
    { id: 'character_guess', name: 'Who Am I?', icon: User },
    { id: 'speed_round', name: 'Speed Round', icon: Clock },
];

const quizTopics = [
    "The Life of Jesus",
    "Old Testament Prophets",
    "The Book of Genesis",
    "Women of the Bible",
    "Miracles of Jesus",
    "The Apostle Paul",
    "The Book of Revelation",
    "Kings of Israel",
    "Parables of Jesus",
    "The Exodus"
];

export default function ChallengeFriendDialog({ open, onOpenChange, me }) {
    const queryClient = useQueryClient();
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [selectedGame, setSelectedGame] = useState('quiz');
    const [selectedTopic, setSelectedTopic] = useState('');

    const { data: friendships } = useQuery({
        queryKey: ['friendships'],
        queryFn: () => base44.entities.Friend.filter({ status: 'accepted' }),
        initialData: []
    });

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: []
    });

    const friendEmails = React.useMemo(() => {
        if (!me) return [];
        return friendships
            .filter(f => f.requester_email === me.email || f.recipient_email === me.email)
            .map(f => f.requester_email === me.email ? f.recipient_email : f.requester_email);
    }, [me, friendships]);

    const friends = users.filter(u => friendEmails.includes(u.email));

    const challengeMutation = useMutation({
        mutationFn: (data) => base44.entities.GameChallenge.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['challenges']);
            const gameName = gameTypes.find(g => g.id === selectedGame)?.name || 'a game';
            base44.entities.Notification.create({
                recipient_id: selectedFriend.email,
                content: `${me.full_name} challenged you to ${gameName}!`,
                link: createPageUrl('Games')
            });
            onOpenChange(false);
            setSelectedFriend(null);
            setSelectedGame('quiz');
            setSelectedTopic('');
        }
    });

    const handleChallenge = () => {
        if (!selectedFriend) return;
        if (selectedGame === 'quiz' && !selectedTopic) return;
        challengeMutation.mutate({
            challenger_email: me.email,
            opponent_email: selectedFriend.email,
            topic: selectedGame === 'quiz' ? selectedTopic : gameTypes.find(g => g.id === selectedGame)?.name,
            game_type: selectedGame
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Swords className="w-5 h-5 text-orange-500" />
                        Challenge a Friend
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div>
                        <label className="text-sm font-medium mb-2 block">Select Game</label>
                        <Select value={selectedGame} onValueChange={setSelectedGame}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {gameTypes.map(game => (
                                    <SelectItem key={game.id} value={game.id}>
                                        <div className="flex items-center gap-2">
                                            <game.icon className="w-4 h-4" />
                                            {game.name}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-2 block">Select Friend</label>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                            {friends.map(friend => (
                                <div
                                    key={friend.id}
                                    onClick={() => setSelectedFriend(friend)}
                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                                        selectedFriend?.id === friend.id 
                                            ? 'border-primary bg-primary/10' 
                                            : 'border-transparent hover:bg-accent'
                                    }`}
                                >
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={friend.avatar_url} />
                                        <AvatarFallback>{friend.full_name?.charAt(0)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm font-medium truncate">{friend.full_name}</span>
                                </div>
                            ))}
                        </div>
                        {friends.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">Add some friends first!</p>
                        )}
                    </div>
                    {selectedGame === 'quiz' && (
                        <div>
                            <label className="text-sm font-medium mb-2 block">Quiz Topic</label>
                            <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a topic" />
                                </SelectTrigger>
                                <SelectContent>
                                    {quizTopics.map(topic => (
                                        <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleChallenge} 
                        disabled={!selectedFriend || (selectedGame === 'quiz' && !selectedTopic) || challengeMutation.isLoading}
                    >
                        {challengeMutation.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Send Challenge
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}