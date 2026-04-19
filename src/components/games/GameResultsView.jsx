import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Award, Trophy, Star, Sparkles, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import { badgeConfig } from '../badges/BadgeDisplay';

const getScoreMessage = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage === 100) return { text: "Perfect Score!", emoji: "🎉" };
    if (percentage >= 80) return { text: "Excellent!", emoji: "🌟" };
    if (percentage >= 60) return { text: "Good Job!", emoji: "👍" };
    if (percentage >= 40) return { text: "Keep Practicing!", emoji: "💪" };
    return { text: "Don't Give Up!", emoji: "📖" };
};

export default function GameResultsView({ gameType, score, maxScore, me, onPlayAgain, onGoHome }) {
    const queryClient = useQueryClient();
    const [newBadges, setNewBadges] = React.useState([]);

    const updateProfileMutation = useMutation({
        mutationFn: (updatedData) => base44.auth.updateMe(updatedData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });

    React.useEffect(() => {
        if (me) {
            const existingBadges = me.badges_earned || [];
            const earnedBadges = [];

            // Bible Novice: Played first game
            if (!existingBadges.includes('bible_novice')) {
                earnedBadges.push('bible_novice');
            }
            // Bible Scholar: Scored 80% or higher
            if ((score / maxScore) >= 0.8 && !existingBadges.includes('bible_scholar')) {
                earnedBadges.push('bible_scholar');
            }
            // Quiz Master: Perfect score
            if (score === maxScore && !existingBadges.includes('quiz_master')) {
                earnedBadges.push('quiz_master');
            }

            if (earnedBadges.length > 0) {
                setNewBadges(earnedBadges);
                // Add XP for playing
                const xpGained = Math.round(score * 10 + (score === maxScore ? 50 : 0));
                updateProfileMutation.mutate({ 
                    badges_earned: [...existingBadges, ...earnedBadges],
                    xp: (me.xp || 0) + xpGained
                });
            } else {
                // Just add XP
                const xpGained = Math.round(score * 10);
                updateProfileMutation.mutate({ 
                    xp: (me.xp || 0) + xpGained
                });
            }
        }
    }, []);

    const scoreMessage = getScoreMessage(score, maxScore);
    const percentage = Math.round((score / maxScore) * 100);

    return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center items-center min-h-[60vh]">
            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", duration: 0.5 }}
                className="w-full max-w-md"
            >
                <Card className="text-center overflow-hidden">
                    <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 py-8">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2, type: "spring" }}
                        >
                            {percentage === 100 ? (
                                <Trophy className="w-20 h-20 mx-auto text-yellow-500" />
                            ) : percentage >= 60 ? (
                                <Award className="w-20 h-20 mx-auto text-primary" />
                            ) : (
                                <Star className="w-20 h-20 mx-auto text-gray-400" />
                            )}
                        </motion.div>
                    </div>
                    <CardHeader>
                        <CardTitle className="text-3xl">
                            {scoreMessage.emoji} {scoreMessage.text}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <p className="text-5xl font-bold text-primary">{score}</p>
                            <p className="text-muted-foreground">out of {maxScore} points</p>
                            <div className="flex justify-center gap-1 mt-2">
                                {[...Array(maxScore)].map((_, i) => (
                                    <motion.div
                                        key={i}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + i * 0.05 }}
                                        className={`w-3 h-3 rounded-full ${
                                            i < score ? 'bg-primary' : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        </div>

                        {newBadges.length > 0 && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.8 }}
                                className="pt-4 border-t"
                            >
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <Sparkles className="w-5 h-5 text-yellow-500" />
                                    <h4 className="font-semibold">New Badges Earned!</h4>
                                </div>
                                <div className="flex flex-wrap justify-center gap-4">
                                    {newBadges.map(badgeId => {
                                        const badge = badgeConfig[badgeId];
                                        if (!badge) return null;
                                        return (
                                            <motion.div
                                                key={badgeId}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 1, type: "spring" }}
                                                className="flex flex-col items-center"
                                            >
                                                <div className={`w-14 h-14 rounded-full flex items-center justify-center ${badge.color}`}>
                                                    <badge.Icon className="w-8 h-8" />
                                                </div>
                                                <p className="text-sm mt-1 font-medium">{badge.title}</p>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        <p className="text-sm text-muted-foreground">
                            +{Math.round(score * 10 + (score === maxScore ? 50 : 0))} XP earned!
                        </p>
                    </CardContent>
                    <CardFooter className="flex gap-3">
                        <Button variant="outline" onClick={onGoHome} className="flex-1">
                            <Home className="w-4 h-4 mr-2" />
                            Games Menu
                        </Button>
                        <Button onClick={onPlayAgain} className="flex-1">
                            Play Again
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}