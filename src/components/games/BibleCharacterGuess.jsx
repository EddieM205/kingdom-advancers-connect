import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { User, CheckCircle, XCircle, Lightbulb, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const characters = [
    { name: "Moses", clues: ["Led the Israelites out of Egypt", "Received the Ten Commandments", "Parted the Red Sea", "Had a staff that turned into a snake"] },
    { name: "David", clues: ["Was a shepherd boy", "Killed a giant with a sling", "Became king of Israel", "Wrote many Psalms"] },
    { name: "Noah", clues: ["Built a large wooden structure", "Collected animals in pairs", "Survived a great flood", "Sent out a dove"] },
    { name: "Abraham", clues: ["Father of many nations", "Nearly sacrificed his son", "Left his homeland for a promised land", "His wife was Sarah"] },
    { name: "Joseph", clues: ["Had a coat of many colors", "Was sold by his brothers", "Interpreted dreams in Egypt", "Became second in command to Pharaoh"] },
    { name: "Samson", clues: ["Had supernatural strength", "His power was in his hair", "Fought against the Philistines", "Was betrayed by Delilah"] },
    { name: "Daniel", clues: ["Was thrown into a lions' den", "Served in a foreign king's court", "Interpreted dreams and visions", "His friends survived a fiery furnace"] },
    { name: "Esther", clues: ["Was a Jewish queen", "Saved her people from destruction", "Her cousin was Mordecai", "Approached the king without being summoned"] },
    { name: "Ruth", clues: ["Was a Moabite woman", "Showed great loyalty to her mother-in-law", "Gathered grain in fields", "Became an ancestor of David"] },
    { name: "Peter", clues: ["Was a fisherman", "Walked on water briefly", "Denied Jesus three times", "Became a leader of the early church"] },
    { name: "Paul", clues: ["Was formerly called Saul", "Persecuted Christians before converting", "Wrote many letters in the New Testament", "Was shipwrecked multiple times"] },
    { name: "Mary Magdalene", clues: ["Was healed by Jesus", "Witnessed the crucifixion", "First to see the risen Christ", "Went to anoint Jesus' body"] },
];

export default function BibleCharacterGuess({ onComplete }) {
    const [currentRound, setCurrentRound] = useState(0);
    const [score, setScore] = useState(0);
    const [cluesShown, setCluesShown] = useState(1);
    const [guess, setGuess] = useState('');
    const [showFeedback, setShowFeedback] = useState(false);
    const [isCorrect, setIsCorrect] = useState(false);
    const [gameCharacters, setGameCharacters] = useState([]);

    const totalRounds = 8;
    const maxPoints = 4;

    useEffect(() => {
        const shuffled = [...characters].sort(() => Math.random() - 0.5).slice(0, totalRounds);
        setGameCharacters(shuffled);
    }, []);

    const currentCharacter = gameCharacters[currentRound] || null;

    const options = useMemo(() => {
        if (!currentCharacter) return [];
        const others = characters
            .filter(c => c.name !== currentCharacter.name)
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);
        return [...others.map(c => c.name), currentCharacter.name].sort(() => Math.random() - 0.5);
    }, [currentRound, currentCharacter]);

    if (gameCharacters.length === 0 || !currentCharacter) return null;

    const handleGuess = (selectedName) => {
        const correct = selectedName === currentCharacter.name;
        setIsCorrect(correct);
        if (correct) {
            const points = maxPoints - cluesShown + 1;
            setScore(s => s + points);
        }
        setShowFeedback(true);
    };

    const handleRevealClue = () => {
        if (cluesShown < 4) {
            setCluesShown(c => c + 1);
        }
    };

    const handleNext = () => {
        if (currentRound + 1 >= totalRounds) {
            onComplete(score);
            return;
        }
        setCurrentRound(r => r + 1);
        setCluesShown(1);
        setShowFeedback(false);
        setGuess('');
    };

    return (
        <Card className="max-w-2xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-green-500" />
                        Who Am I?
                    </CardTitle>
                    <span className="text-sm text-muted-foreground">
                        Points available: {maxPoints - cluesShown + 1}
                    </span>
                </div>
                <Progress value={((currentRound + 1) / totalRounds) * 100} className="h-2" />
                <p className="text-sm text-muted-foreground mt-2">Round {currentRound + 1} of {totalRounds} | Score: {score}</p>
            </CardHeader>
            <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentRound}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="space-y-4"
                    >
                        <div className="bg-secondary rounded-lg p-4 space-y-2">
                            <h3 className="font-semibold flex items-center gap-2">
                                <Lightbulb className="w-4 h-4 text-yellow-500" />
                                Clues:
                            </h3>
                            {currentCharacter.clues.slice(0, cluesShown).map((clue, i) => (
                                <motion.p
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm pl-6"
                                >
                                    • {clue}
                                </motion.p>
                            ))}
                            {!showFeedback && cluesShown < 4 && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={handleRevealClue}
                                    className="mt-2"
                                >
                                    <HelpCircle className="w-4 h-4 mr-1" />
                                    Reveal Another Clue (-1 point)
                                </Button>
                            )}
                        </div>

                        {!showFeedback && (
                            <div className="grid grid-cols-2 gap-3">
                                {options.map((name) => (
                                    <Button
                                        key={name}
                                        variant="outline"
                                        className="h-auto py-3"
                                        onClick={() => handleGuess(name)}
                                    >
                                        {name}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>

                {showFeedback && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`p-4 rounded-lg text-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                        {isCorrect ? (
                            <p className="flex items-center justify-center gap-2 font-semibold">
                                <CheckCircle className="w-5 h-5" /> Correct! It was {currentCharacter.name}!
                            </p>
                        ) : (
                            <p className="flex items-center justify-center gap-2 font-semibold">
                                <XCircle className="w-5 h-5" /> The answer was {currentCharacter.name}
                            </p>
                        )}
                    </motion.div>
                )}
            </CardContent>
            <CardFooter>
                {showFeedback && (
                    <Button onClick={handleNext} className="w-full">
                        {currentRound + 1 >= totalRounds ? 'See Results' : 'Next Character'}
                    </Button>
                )}
            </CardFooter>
        </Card>
    );
}