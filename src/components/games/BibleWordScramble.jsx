import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Shuffle, CheckCircle, XCircle, Timer, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const bibleWords = [
    { word: "SALVATION", hint: "Deliverance from sin and its consequences" },
    { word: "REDEMPTION", hint: "The action of saving or being saved from error" },
    { word: "FORGIVENESS", hint: "To pardon an offense or overlook an offense" },
    { word: "RIGHTEOUSNESS", hint: "Being morally right and justifiable" },
    { word: "RESURRECTION", hint: "Rising from the dead" },
    { word: "CRUCIFIXION", hint: "Death on a cross" },
    { word: "BETHLEHEM", hint: "City where Jesus was born" },
    { word: "JERUSALEM", hint: "Holy city, capital of Israel" },
    { word: "DISCIPLES", hint: "Followers of Jesus" },
    { word: "APOSTLE", hint: "A messenger sent with a mission" },
    { word: "PROPHECY", hint: "A prediction of the future" },
    { word: "COVENANT", hint: "A sacred agreement between God and people" },
    { word: "GOSPEL", hint: "The good news of Jesus Christ" },
    { word: "BLESSED", hint: "Made holy; consecrated" },
    { word: "FAITHFUL", hint: "Loyal and steadfast in belief" },
];

const scrambleWord = (word) => {
    const arr = word.split('');
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.join('');
};

export default function BibleWordScramble({ onComplete }) {
    const [currentRound, setCurrentRound] = useState(0);
    const [score, setScore] = useState(0);
    const [guess, setGuess] = useState('');
    const [scrambled, setScrambled] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [timeLeft, setTimeLeft] = useState(30);
    const [gameWords, setGameWords] = useState([]);

    const totalRounds = 10;

    useEffect(() => {
        const shuffled = [...bibleWords].sort(() => Math.random() - 0.5).slice(0, totalRounds);
        setGameWords(shuffled);
        setScrambled(scrambleWord(shuffled[0].word));
    }, []);

    useEffect(() => {
        if (timeLeft > 0 && !showFeedback && currentRound < totalRounds) {
            const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 && !showFeedback) {
            handleSubmit();
        }
    }, [timeLeft, showFeedback, currentRound]);

    const handleSubmit = () => {
        const correct = guess.toUpperCase() === gameWords[currentRound].word;
        setIsCorrect(correct);
        if (correct) setScore(s => s + 1);
        setShowFeedback(true);
    };

    const handleNext = () => {
        if (currentRound + 1 >= totalRounds) {
            onComplete(score + (isCorrect ? 1 : 0));
            return;
        }
        const nextRound = currentRound + 1;
        setCurrentRound(nextRound);
        setScrambled(scrambleWord(gameWords[nextRound].word));
        setGuess('');
        setShowFeedback(false);
        setTimeLeft(30);
    };

    const reshuffleWord = () => {
        setScrambled(scrambleWord(gameWords[currentRound].word));
    };

    if (gameWords.length === 0) return null;

    const currentWord = gameWords[currentRound];

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Shuffle className="w-5 h-5 text-purple-500" />
                        Word Scramble
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm">
                        <Timer className="w-4 h-4" />
                        <span className={timeLeft <= 10 ? 'text-red-500 font-bold' : ''}>{timeLeft}s</span>
                    </div>
                </div>
                <Progress value={((currentRound + 1) / totalRounds) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Round {currentRound + 1} of {totalRounds} | Score: {score}</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentRound}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="text-center space-y-4"
                    >
                        <div className="flex justify-center gap-2 flex-wrap">
                            {scrambled.split('').map((letter, i) => (
                                <motion.span
                                    key={i}
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="w-10 h-10 md:w-12 md:h-12 bg-primary text-primary-foreground rounded-lg flex items-center justify-center text-xl font-bold"
                                >
                                    {letter}
                                </motion.span>
                            ))}
                        </div>
                        <Button variant="ghost" size="sm" onClick={reshuffleWord} disabled={showFeedback}>
                            <RotateCcw className="w-4 h-4 mr-1" /> Reshuffle
                        </Button>
                        <p className="text-muted-foreground italic">Hint: {currentWord.hint}</p>
                    </motion.div>
                </AnimatePresence>

                {!showFeedback ? (
                    <div className="flex gap-2">
                        <Input
                            value={guess}
                            onChange={(e) => setGuess(e.target.value.toUpperCase())}
                            placeholder="Type your answer..."
                            className="text-lg uppercase tracking-wider"
                            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                        />
                        <Button onClick={handleSubmit} disabled={!guess}>Submit</Button>
                    </div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-lg text-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                        {isCorrect ? (
                            <p className="flex items-center justify-center gap-2 font-semibold">
                                <CheckCircle className="w-5 h-5" /> Correct!
                            </p>
                        ) : (
                            <div>
                                <p className="flex items-center justify-center gap-2 font-semibold">
                                    <XCircle className="w-5 h-5" /> The answer was: {currentWord.word}
                                </p>
                            </div>
                        )}
                    </motion.div>
                )}
            </CardContent>
            <CardFooter>
                {showFeedback && (
                    <Button onClick={handleNext} className="w-full">
                        {currentRound + 1 >= totalRounds ? 'See Results' : 'Next Word'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}