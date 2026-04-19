import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Zap, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const speedQuestions = [
    { question: "How many days did God take to create the world?", answer: "6", options: ["5", "6", "7", "8"] },
    { question: "What was the first plague of Egypt?", answer: "Blood", options: ["Frogs", "Blood", "Darkness", "Locusts"] },
    { question: "How many apostles did Jesus choose?", answer: "12", options: ["10", "11", "12", "13"] },
    { question: "What was Peter's original name?", answer: "Simon", options: ["Saul", "Simon", "Stephen", "Samuel"] },
    { question: "Where was Jesus born?", answer: "Bethlehem", options: ["Jerusalem", "Nazareth", "Bethlehem", "Galilee"] },
    { question: "How many loaves fed the 5000?", answer: "5", options: ["3", "5", "7", "12"] },
    { question: "Who baptized Jesus?", answer: "John the Baptist", options: ["Peter", "John the Baptist", "James", "Paul"] },
    { question: "What animal spoke to Balaam?", answer: "Donkey", options: ["Horse", "Donkey", "Serpent", "Lion"] },
    { question: "How many books in the Bible?", answer: "66", options: ["39", "52", "66", "73"] },
    { question: "Who was swallowed by a great fish?", answer: "Jonah", options: ["Jonah", "Daniel", "David", "Job"] },
    { question: "How many brothers did Joseph have?", answer: "11", options: ["7", "10", "11", "12"] },
    { question: "What river was Jesus baptized in?", answer: "Jordan", options: ["Nile", "Jordan", "Euphrates", "Tigris"] },
    { question: "Who denied Jesus three times?", answer: "Peter", options: ["James", "John", "Peter", "Thomas"] },
    { question: "How many days was Jesus in the tomb?", answer: "3", options: ["1", "2", "3", "7"] },
    { question: "What instrument did David play?", answer: "Harp", options: ["Flute", "Harp", "Trumpet", "Drum"] },
    { question: "Who built the ark?", answer: "Noah", options: ["Abraham", "Moses", "Noah", "David"] },
    { question: "What garden did Jesus pray in?", answer: "Gethsemane", options: ["Eden", "Gethsemane", "Olive", "Paradise"] },
    { question: "How many fruits of the Spirit?", answer: "9", options: ["7", "9", "10", "12"] },
    { question: "Who was the strongest man in the Bible?", answer: "Samson", options: ["David", "Goliath", "Samson", "Joshua"] },
    { question: "What fell on the 7th march around Jericho?", answer: "The walls", options: ["Rain", "Fire", "The walls", "Manna"] },
];

export default function BibleSpeedRound({ onComplete }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [timeLeft, setTimeLeft] = useState(60);
    const [gameOver, setGameOver] = useState(false);
    const [feedback, setFeedback] = useState(null);
    const [gameQuestions, setGameQuestions] = useState([]);

    useEffect(() => {
        setGameQuestions([...speedQuestions].sort(() => Math.random() - 0.5));
    }, []);

    useEffect(() => {
        if (timeLeft > 0 && !gameOver) {
            const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
            return () => clearTimeout(timer);
        } else if (timeLeft === 0) {
            setGameOver(true);
            onComplete(score);
        }
    }, [timeLeft, gameOver]);

    if (gameQuestions.length === 0) return null;

    const handleAnswer = (answer) => {
        const isCorrect = answer === gameQuestions[currentQuestion].answer;
        setFeedback(isCorrect ? 'correct' : 'wrong');
        
        if (isCorrect) {
            setScore(s => s + 1);
        }

        setTimeout(() => {
            setFeedback(null);
            if (currentQuestion + 1 < gameQuestions.length) {
                setCurrentQuestion(c => c + 1);
            } else {
                setGameOver(true);
                onComplete(score + (isCorrect ? 1 : 0));
            }
        }, 300);
    };

    const question = gameQuestions[currentQuestion];

    return (
        <Card className={`max-w-2xl mx-auto transition-all ${
            feedback === 'correct' ? 'ring-4 ring-green-400' : 
            feedback === 'wrong' ? 'ring-4 ring-red-400' : ''
        }`}>
            <CardHeader>
                <div className="flex justify-between items-center mb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-500" />
                        Speed Round
                    </CardTitle>
                    <div className="flex items-center gap-4">
                        <span className="text-xl font-bold">{score}</span>
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                            timeLeft <= 10 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                        }`}>
                            <Clock className="w-4 h-4" />
                            <span className="font-bold">{timeLeft}s</span>
                        </div>
                    </div>
                </div>
                <Progress value={(timeLeft / 60) * 100} className="h-2" />
            </CardHeader>
            <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentQuestion}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.2 }}
                        className="text-center"
                    >
                        <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
                        <div className="grid grid-cols-2 gap-3">
                            {question.options.map((option) => (
                                <Button
                                    key={option}
                                    variant="outline"
                                    className="h-14 text-lg font-medium hover:bg-primary hover:text-primary-foreground transition-all"
                                    onClick={() => handleAnswer(option)}
                                >
                                    {option}
                                </Button>
                            ))}
                        </div>
                    </motion.div>
                </AnimatePresence>
            </CardContent>
        </Card>
    );
}