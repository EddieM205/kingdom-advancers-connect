import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Award, Target } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { badgeConfig } from '../badges/BadgeDisplay';

export default function QuizView({ quizQuestions, topic, onPlayAgain }) {
    const queryClient = useQueryClient();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [score, setScore] = useState(0);
    const [showFeedback, setShowFeedback] = useState(false);
    const [newlyEarnedBadges, setNewlyEarnedBadges] = useState([]);

    const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
    const updateProfileMutation = useMutation({
        mutationFn: (updatedData) => base44.auth.updateMe(updatedData),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['me'] });
        },
    });

    const currentQuestion = quizQuestions[currentQuestionIndex];
    const isQuizOver = currentQuestionIndex >= quizQuestions.length;

    useEffect(() => {
        if (isQuizOver && me) {
            const existingBadges = me.badges_earned || [];
            const earnedBadges = [];

            // Bible Novice: Played first game
            if (!existingBadges.includes('bible_novice')) {
                earnedBadges.push('bible_novice');
            }
            // Bible Scholar: Scored 80% or higher
            if (score / quizQuestions.length >= 0.8 && !existingBadges.includes('bible_scholar')) {
                earnedBadges.push('bible_scholar');
            }
            // Quiz Master: Perfect score
            if (score === quizQuestions.length && !existingBadges.includes('quiz_master')) {
                earnedBadges.push('quiz_master');
            }

            if (earnedBadges.length > 0) {
                setNewlyEarnedBadges(earnedBadges);
                updateProfileMutation.mutate({ badges_earned: [...existingBadges, ...earnedBadges] });
            }
        }
    }, [isQuizOver, me, score, quizQuestions.length, updateProfileMutation]);

    const handleAnswerSelect = (option) => {
        if (showFeedback) return;
        setSelectedAnswer(option);
        setShowFeedback(true);
        if (option === currentQuestion.correct_answer) {
            setScore(s => s + 1);
        }
    };

    const handleNextQuestion = () => {
        setShowFeedback(false);
        setSelectedAnswer(null);
        setCurrentQuestionIndex(i => i + 1);
    };

    const getButtonClass = (option) => {
        if (!showFeedback) return "justify-start text-left h-auto";
        if (option === currentQuestion.correct_answer) return "justify-start text-left h-auto bg-green-500 hover:bg-green-600 border-green-600";
        if (option === selectedAnswer) return "justify-start text-left h-auto bg-red-500 hover:bg-red-600 border-red-600";
        return "justify-start text-left h-auto";
    };

    if (isQuizOver) {
        return (
            <div className="container mx-auto p-4 md:p-8 flex justify-center items-center h-full">
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Card className="max-w-2xl w-full text-center">
                        <CardHeader>
                            <Award className="w-16 h-16 mx-auto text-yellow-500" />
                            <CardTitle className="text-3xl">Quiz Complete!</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-lg">You completed the quiz on <strong>{topic}</strong>.</p>
                            <p className="text-4xl font-bold">Your Score: {score} / {quizQuestions.length}</p>
                             {newlyEarnedBadges.length > 0 && (
                                <div className="pt-4 mt-4 border-t">
                                    <h4 className="font-semibold text-lg mb-2">New Badges Earned!</h4>
                                    <div className="flex flex-wrap justify-center gap-4">
                                        {newlyEarnedBadges.map(badgeId => {
                                            const badge = badgeConfig[badgeId];
                                            if (!badge) return null; // Fallback if badgeId not in config
                                            return (
                                                <div key={badgeId} className="flex flex-col items-center">
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${badge.color}`}>
                                                        <badge.Icon className="w-7 h-7" />
                                                    </div>
                                                    <p className="text-sm mt-1">{badge.title}</p>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button onClick={onPlayAgain} className="w-full">Play Again</Button>
                        </CardFooter>
                    </Card>
                </motion.div>
            </div>
        );
    }
    
    return (
        <div className="container mx-auto p-4 md:p-8 flex justify-center items-center h-full">
            <Card className="max-w-4xl w-full">
                <CardHeader>
                    <Progress value={((currentQuestionIndex + 1) / quizQuestions.length) * 100} className="mb-4" />
                    <CardTitle className="flex items-center gap-3">
                        <Target className="w-6 h-6"/>
                        {topic}
                    </CardTitle>
                    <p className="text-muted-foreground">Question {currentQuestionIndex + 1} of {quizQuestions.length}</p>
                </CardHeader>
                <CardContent className="space-y-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentQuestionIndex}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            <h2 className="text-xl md:text-2xl font-semibold mb-6">{currentQuestion.question}</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {currentQuestion.options.map((option, i) => (
                                    <Button
                                        key={i}
                                        variant="outline"
                                        className={getButtonClass(option)}
                                        onClick={() => handleAnswerSelect(option)}
                                        disabled={showFeedback}
                                    >
                                        <span className="whitespace-normal">{option}</span>
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    </AnimatePresence>
                    <AnimatePresence>
                    {showFeedback && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="p-4 mt-6 rounded-lg bg-secondary"
                        >
                            {selectedAnswer === currentQuestion.correct_answer ? (
                                <p className="flex items-center gap-2 font-semibold text-green-600"><CheckCircle className="w-5 h-5"/> Correct!</p>
                            ) : (
                                <p className="flex items-center gap-2 font-semibold text-red-600"><XCircle className="w-5 h-5"/> Incorrect.</p>
                            )}
                            <p className="mt-2 text-muted-foreground">{currentQuestion.explanation}</p>
                        </motion.div>
                    )}
                    </AnimatePresence>
                </CardContent>
                <CardFooter>
                    {showFeedback && (
                         <Button onClick={handleNextQuestion} className="w-full">
                           {currentQuestionIndex === quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}