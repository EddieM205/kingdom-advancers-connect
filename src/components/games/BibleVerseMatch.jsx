import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Timer } from 'lucide-react';
import { motion } from 'framer-motion';

const versePairs = [
    { verse: "For God so loved the world...", reference: "John 3:16" },
    { verse: "I can do all things through Christ...", reference: "Philippians 4:13" },
    { verse: "The Lord is my shepherd...", reference: "Psalm 23:1" },
    { verse: "Trust in the Lord with all your heart...", reference: "Proverbs 3:5" },
    { verse: "Be strong and courageous...", reference: "Joshua 1:9" },
    { verse: "Love is patient, love is kind...", reference: "1 Corinthians 13:4" },
    { verse: "In the beginning God created...", reference: "Genesis 1:1" },
    { verse: "The fruit of the Spirit is love...", reference: "Galatians 5:22" },
    { verse: "Fear not, for I am with you...", reference: "Isaiah 41:10" },
    { verse: "Seek first the kingdom of God...", reference: "Matthew 6:33" },
    { verse: "I am the way, the truth, and the life...", reference: "John 14:6" },
    { verse: "Come to me, all who are weary...", reference: "Matthew 11:28" },
    { verse: "The fear of the Lord is the beginning...", reference: "Proverbs 9:10" },
    { verse: "Create in me a clean heart...", reference: "Psalm 51:10" },
    { verse: "But those who hope in the Lord...", reference: "Isaiah 40:31" },
];

export default function BibleVerseMatch({ onComplete }) {
    const [score, setScore] = useState(0);
    const [selectedVerse, setSelectedVerse] = useState(null);
    const [selectedRef, setSelectedRef] = useState(null);
    const [matched, setMatched] = useState([]);
    const [wrong, setWrong] = useState({ verse: null, ref: null });
    const [timeLeft, setTimeLeft] = useState(120);
    const [gameOver, setGameOver] = useState(false);

    const gamePairs = useMemo(() => {
        return [...versePairs].sort(() => Math.random() - 0.5).slice(0, 8);
    }, []);

    const shuffledVerses = useMemo(() => [...gamePairs].sort(() => Math.random() - 0.5), [gamePairs]);
    const shuffledRefs = useMemo(() => [...gamePairs].sort(() => Math.random() - 0.5), [gamePairs]);

    useEffect(() => {
        if (timeLeft > 0 && !gameOver && matched.length < gamePairs.length) {
            const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0 || matched.length === gamePairs.length) {
            setGameOver(true);
            onComplete(score);
        }
    }, [timeLeft, gameOver, matched.length]);

    useEffect(() => {
        if (selectedVerse && selectedRef) {
            const pair = gamePairs.find(p => p.verse === selectedVerse);
            if (pair && pair.reference === selectedRef) {
                setMatched(prev => [...prev, selectedVerse]);
                setScore(s => s + 1);
            } else {
                setWrong({ verse: selectedVerse, ref: selectedRef });
                setTimeout(() => setWrong({ verse: null, ref: null }), 800);
            }
            setTimeout(() => {
                setSelectedVerse(null);
                setSelectedRef(null);
            }, 500);
        }
    }, [selectedVerse, selectedRef]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <Card className="max-w-4xl mx-auto">
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <CardTitle className="flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-blue-500" />
                        Verse Match
                    </CardTitle>
                    <div className="flex items-center gap-4 text-sm">
                        <span>Matched: {matched.length}/{gamePairs.length}</span>
                        <div className="flex items-center gap-1">
                            <Timer className="w-4 h-4" />
                            <span className={timeLeft <= 30 ? 'text-red-500 font-bold' : ''}>{formatTime(timeLeft)}</span>
                        </div>
                    </div>
                </div>
                <Progress value={(matched.length / gamePairs.length) * 100} className="h-2" />
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4 text-center">Match each verse with its correct reference</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">Verses</h3>
                        {shuffledVerses.map((pair, i) => (
                            <motion.button
                                key={pair.verse}
                                onClick={() => !matched.includes(pair.verse) && setSelectedVerse(pair.verse)}
                                disabled={matched.includes(pair.verse)}
                                className={`w-full p-3 text-left rounded-lg border transition-all text-sm ${
                                    matched.includes(pair.verse)
                                        ? 'bg-green-100 border-green-300 opacity-50'
                                        : selectedVerse === pair.verse
                                        ? 'bg-primary/10 border-primary'
                                        : wrong.verse === pair.verse
                                        ? 'bg-red-100 border-red-300 animate-shake'
                                        : 'hover:bg-accent'
                                }`}
                                whileTap={{ scale: 0.98 }}
                            >
                                {pair.verse}
                            </motion.button>
                        ))}
                    </div>
                    <div className="space-y-2">
                        <h3 className="font-semibold text-sm text-muted-foreground mb-2">References</h3>
                        {shuffledRefs.map((pair, i) => (
                            <motion.button
                                key={pair.reference}
                                onClick={() => !matched.includes(pair.verse) && setSelectedRef(pair.reference)}
                                disabled={matched.includes(pair.verse)}
                                className={`w-full p-3 text-center rounded-lg border transition-all font-medium ${
                                    matched.includes(pair.verse)
                                        ? 'bg-green-100 border-green-300 opacity-50'
                                        : selectedRef === pair.reference
                                        ? 'bg-primary/10 border-primary'
                                        : wrong.ref === pair.reference
                                        ? 'bg-red-100 border-red-300 animate-shake'
                                        : 'hover:bg-accent'
                                }`}
                                whileTap={{ scale: 0.98 }}
                            >
                                {pair.reference}
                            </motion.button>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}