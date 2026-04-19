import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { createPageUrl } from '@/utils';

const gameTypes = [
    { id: 'quiz', name: 'Bible Quiz', description: 'Answer questions about the Bible' },
    { id: 'word_scramble', name: 'Word Scramble', description: 'Unscramble biblical words' },
    { id: 'verse_match', name: 'Verse Match', description: 'Match verses with references' },
    { id: 'character_guess', name: 'Who Am I?', description: 'Guess the Bible character' },
    { id: 'speed_round', name: 'Speed Round', description: 'Quick-fire questions' },
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

export default function GroupChallengeDialog({ open, onOpenChange, me, group }) {
    const queryClient = useQueryClient();
    const [selectedMembers, setSelectedMembers] = useState([]);
    const [selectedGame, setSelectedGame] = useState('quiz');
    const [selectedTopic, setSelectedTopic] = useState('');

    const { data: users } = useQuery({
        queryKey: ['users'],
        queryFn: () => base44.entities.User.list(),
        initialData: []
    });

    const groupMembers = useMemo(() => {
        if (!group || !me) return [];
        return users.filter(u => group.members?.includes(u.email) && u.email !== me.email);
    }, [group, users, me]);

    const toggleMember = (email) => {
        setSelectedMembers(prev => 
            prev.includes(email) 
                ? prev.filter(e => e !== email)
                : [...prev, email]
        );
    };

    const selectAll = () => {
        setSelectedMembers(groupMembers.map(m => m.email));
    };

    const challengeMutation = useMutation({
        mutationFn: async (data) => {
            // Create challenge for each selected member
            const promises = selectedMembers.map(memberEmail => 
                base44.entities.GameChallenge.create({
                    challenger_email: me.email,
                    opponent_email: memberEmail,
                    game_type: selectedGame,
                    topic: selectedTopic || gameTypes.find(g => g.id === selectedGame)?.name,
                    group_id: group.id
                })
            );
            await Promise.all(promises);

            // Send notifications
            const notifPromises = selectedMembers.map(memberEmail =>
                base44.entities.Notification.create({
                    recipient_id: memberEmail,
                    content: `${me.full_name} challenged the group "${group.name}" to ${gameTypes.find(g => g.id === selectedGame)?.name}!`,
                    link: createPageUrl('Games')
                })
            );
            await Promise.all(notifPromises);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['challenges']);
            onOpenChange(false);
            setSelectedMembers([]);
            setSelectedGame('quiz');
            setSelectedTopic('');
        }
    });

    const handleChallenge = () => {
        if (selectedMembers.length === 0) return;
        challengeMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="w-5 h-5 text-blue-500" />
                        Challenge Group Members
                    </DialogTitle>
                    <DialogDescription>
                        Challenge members of "{group?.name}" to a game
                    </DialogDescription>
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
                                        <div className="flex flex-col">
                                            <span>{game.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="text-sm font-medium">Challenge Members</label>
                            <Button variant="ghost" size="sm" onClick={selectAll}>
                                Select All
                            </Button>
                        </div>
                        <ScrollArea className="h-48 border rounded-lg p-2">
                            <div className="space-y-2">
                                {groupMembers.map(member => (
                                    <div
                                        key={member.id}
                                        onClick={() => toggleMember(member.email)}
                                        className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                            selectedMembers.includes(member.email)
                                                ? 'bg-primary/10'
                                                : 'hover:bg-accent'
                                        }`}
                                    >
                                        <Checkbox 
                                            checked={selectedMembers.includes(member.email)}
                                            onChange={() => {}}
                                        />
                                        <Avatar className="w-8 h-8">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback>{member.full_name?.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm font-medium">{member.full_name}</span>
                                    </div>
                                ))}
                                {groupMembers.length === 0 && (
                                    <p className="text-sm text-muted-foreground text-center py-4">
                                        No other members in this group
                                    </p>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button 
                        onClick={handleChallenge} 
                        disabled={selectedMembers.length === 0 || (selectedGame === 'quiz' && !selectedTopic) || challengeMutation.isLoading}
                    >
                        {challengeMutation.isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Challenge {selectedMembers.length} Member{selectedMembers.length !== 1 ? 's' : ''}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}