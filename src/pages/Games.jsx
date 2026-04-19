import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Zap, Swords, Gamepad2, Shuffle, BookOpen, User, Clock, Users, Trophy } from 'lucide-react';
import QuizView from '../components/games/QuizView';
import GameChallenges from '../components/games/GameChallenges';
import ChallengeFriendDialog from '../components/games/ChallengeFriendDialog';
import GroupChallengeDialog from '../components/games/GroupChallengeDialog';
import BibleWordScramble from '../components/games/BibleWordScramble';
import BibleVerseMatch from '../components/games/BibleVerseMatch';
import BibleCharacterGuess from '../components/games/BibleCharacterGuess';
import BibleSpeedRound from '../components/games/BibleSpeedRound';
import GameResultsView from '../components/games/GameResultsView';

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

const gameTypes = [
    { id: 'quiz', name: 'Bible Quiz', description: 'Answer 10 questions about the Bible', icon: Zap, color: 'text-yellow-500', maxScore: 10 },
    { id: 'word_scramble', name: 'Word Scramble', description: 'Unscramble biblical words before time runs out', icon: Shuffle, color: 'text-purple-500', maxScore: 10 },
    { id: 'verse_match', name: 'Verse Match', description: 'Match famous verses with their references', icon: BookOpen, color: 'text-blue-500', maxScore: 8 },
    { id: 'character_guess', name: 'Who Am I?', description: 'Guess Bible characters from clues', icon: User, color: 'text-green-500', maxScore: 32 },
    { id: 'speed_round', name: 'Speed Round', description: 'Quick-fire questions - 60 seconds!', icon: Clock, color: 'text-red-500', maxScore: 20 },
];

export default function GamesPage({ groups }) {
    const [selectedGame, setSelectedGame] = useState(null);
    const [selectedTopic, setSelectedTopic] = useState('');
    const [activeGame, setActiveGame] = useState(null);
    const [quizData, setQuizData] = useState(null);
    const [showChallengeDialog, setShowChallengeDialog] = useState(false);
    const [showGroupChallengeDialog, setShowGroupChallengeDialog] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState(null);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [gameResult, setGameResult] = useState(null);

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

    const userGroups = groups?.filter(g => g.type === 'group' && g.members?.includes(me?.email)) || [];

    const generateQuizMutation = useMutation({
        mutationFn: (topic) => {
            const prompt = `Generate a 10-question multiple-choice Bible quiz on the topic of "${topic}". The questions should be challenging but not obscure. For each question, provide four options, indicate the correct answer, and provide a brief explanation for the correct answer, including a Bible verse reference if applicable. Format the entire output as a single JSON object with a key "questions" which is an array of question objects. Each question object should have the following keys: "question" (string), "options" (an array of 4 strings), "correct_answer" (the string of the correct option), and "explanation" (string).`;
            
            return base44.integrations.Core.InvokeLLM({
                prompt: prompt,
                response_json_schema: {
                    type: "object",
                    properties: {
                        questions: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    question: { type: "string" },
                                    options: { type: "array", "minItems": 4, "maxItems": 4, items: { type: "string" } },
                                    correct_answer: { type: "string" },
                                    explanation: { type: "string" }
                                },
                                required: ["question", "options", "correct_answer", "explanation"]
                            }
                        }
                    },
                    required: ["questions"]
                }
            });
        },
        onSuccess: (data) => {
            setQuizData(data.questions);
            setActiveGame('quiz');
        }
    });

    const handleStartGame = (gameId) => {
        if (gameId === 'quiz') {
            if (!selectedTopic) return;
            generateQuizMutation.mutate(selectedTopic);
        } else {
            setActiveGame(gameId);
        }
    };

    const handleGameComplete = (score) => {
        const gameInfo = gameTypes.find(g => g.id === activeGame);
        setGameResult({ gameType: activeGame, score, maxScore: gameInfo?.maxScore || 10 });
    };

    const handlePlayAgain = () => {
        setGameResult(null);
        if (activeGame === 'quiz') {
            generateQuizMutation.mutate(selectedTopic);
        }
        // For other games, they reset themselves
    };

    const handleGoHome = () => {
        setActiveGame(null);
        setGameResult(null);
        setQuizData(null);
        setSelectedGame(null);
        setSelectedTopic('');
    };

    const handleAcceptChallenge = (challenge) => {
        setActiveChallenge(challenge);
        setSelectedTopic(challenge.topic);
        if (challenge.game_type === 'quiz') {
            generateQuizMutation.mutate(challenge.topic);
        } else {
            setActiveGame(challenge.game_type);
        }
    };

    const openGroupChallenge = (group) => {
        setSelectedGroup(group);
        setShowGroupChallengeDialog(true);
    };

    if (generateQuizMutation.isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg text-muted-foreground">Generating your quiz...</p>
            </div>
        );
    }

    // Show game result
    if (gameResult) {
        return (
            <GameResultsView
                gameType={gameResult.gameType}
                score={gameResult.score}
                maxScore={gameResult.maxScore}
                me={me}
                onPlayAgain={handlePlayAgain}
                onGoHome={handleGoHome}
            />
        );
    }

    // Show active game
    if (activeGame === 'quiz' && quizData) {
        return <QuizView quizQuestions={quizData} topic={selectedTopic} onPlayAgain={handleGoHome} challenge={activeChallenge} />;
    }

    if (activeGame === 'word_scramble') {
        return (
            <div className="w-full min-h-screen pb-20 sm:pb-0">
                <div className="container mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8">
                    <BibleWordScramble onComplete={handleGameComplete} />
                </div>
            </div>
        );
    }

    if (activeGame === 'verse_match') {
        return (
            <div className="w-full min-h-screen pb-20 sm:pb-0">
                <div className="container mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8">
                    <BibleVerseMatch onComplete={handleGameComplete} />
                </div>
            </div>
        );
    }

    if (activeGame === 'character_guess') {
        return (
            <div className="w-full min-h-screen pb-20 sm:pb-0">
                <div className="container mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8">
                    <BibleCharacterGuess onComplete={handleGameComplete} />
                </div>
            </div>
        );
    }

    if (activeGame === 'speed_round') {
        return (
            <div className="w-full min-h-screen pb-20 sm:pb-0">
                <div className="container mx-auto px-3 sm:px-4 md:px-8 py-4 md:py-8">
                    <BibleSpeedRound onComplete={handleGameComplete} />
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto max-w-7xl px-3 sm:px-4 md:px-8 py-4 md:py-8">
                <div className="flex items-center justify-between mb-4 sm:mb-6 flex-col sm:flex-row gap-2">
                    <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                    <Gamepad2 className="w-6 h-6 sm:w-8 sm:h-8" />
                    Games
                </h1>
                    <Button onClick={() => setShowChallengeDialog(true)} className="text-xs sm:text-sm">
                        <Swords className="w-4 h-4 mr-2" /> Challenge Friend
                    </Button>
                </div>
            </div>

            <div className="space-y-6">
                <Tabs defaultValue="play" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="play"><Zap className="w-4 h-4 mr-1" /> Solo Play</TabsTrigger>
                    <TabsTrigger value="groups"><Users className="w-4 h-4 mr-1" /> Group Games</TabsTrigger>
                    <TabsTrigger value="challenges"><Swords className="w-4 h-4 mr-1" /> Challenges</TabsTrigger>
                </TabsList>

                <TabsContent value="play">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {gameTypes.map(game => (
                            <Card 
                                key={game.id} 
                                className={`cursor-pointer transition-all hover:shadow-lg ${selectedGame === game.id ? 'ring-2 ring-primary' : ''}`}
                                onClick={() => setSelectedGame(game.id)}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <game.icon className={`w-6 h-6 ${game.color}`} />
                                        {game.name}
                                    </CardTitle>
                                    <CardDescription>{game.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {selectedGame === game.id && (
                                        <div className="space-y-4">
                                            {game.id === 'quiz' && (
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
                                            )}
                                            <Button 
                                                className="w-full" 
                                                onClick={() => handleStartGame(game.id)}
                                                disabled={game.id === 'quiz' && !selectedTopic}
                                            >
                                                Start Game
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                <TabsContent value="groups">
                    <div className="space-y-4">
                        <p className="text-muted-foreground">Challenge members of your groups to compete!</p>
                        {userGroups.length === 0 ? (
                            <Card>
                                <CardContent className="py-8 text-center">
                                    <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                    <p className="text-muted-foreground">You're not in any groups yet.</p>
                                    <p className="text-sm text-muted-foreground">Join or create a group to challenge members!</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {userGroups.map(group => (
                                    <Card key={group.id} className="hover:shadow-lg transition-shadow">
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-3">
                                                <Users className="w-5 h-5 text-blue-500" />
                                                {group.name}
                                            </CardTitle>
                                            <CardDescription>
                                                {group.members?.length || 0} members
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <Button 
                                                className="w-full" 
                                                variant="outline"
                                                onClick={() => openGroupChallenge(group)}
                                            >
                                                <Trophy className="w-4 h-4 mr-2" />
                                                Challenge Group
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="challenges">
                    <GameChallenges me={me} onAcceptChallenge={handleAcceptChallenge} />
                </TabsContent>
                </Tabs>
            </div>

            <ChallengeFriendDialog open={showChallengeDialog} onOpenChange={setShowChallengeDialog} me={me} />
            <GroupChallengeDialog 
                open={showGroupChallengeDialog} 
                onOpenChange={setShowGroupChallengeDialog} 
                me={me} 
                group={selectedGroup}
            />
        </div>
    );
}