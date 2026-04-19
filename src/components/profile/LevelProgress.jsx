import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Star, Zap } from 'lucide-react';

// XP needed for each level
export const getXpForLevel = (level) => level * 100;
export const getLevelFromXp = (xp) => {
    let level = 1;
    let xpNeeded = 0;
    while (xp >= xpNeeded + getXpForLevel(level)) {
        xpNeeded += getXpForLevel(level);
        level++;
    }
    return { level, currentXp: xp - xpNeeded, xpForNext: getXpForLevel(level) };
};

export default function LevelProgress({ xp = 0, level = 1 }) {
    const { currentXp, xpForNext } = getLevelFromXp(xp);
    const progress = (currentXp / xpForNext) * 100;

    return (
        <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-white/20 rounded-full">
                            <Star className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm opacity-80">Level</p>
                            <p className="text-2xl font-bold">{level}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Zap className="w-5 h-5" />
                        <span className="font-semibold">{xp} XP</span>
                    </div>
                </div>
                <div className="space-y-1">
                    <Progress value={progress} className="h-2 bg-white/20" />
                    <p className="text-xs text-right opacity-80">{currentXp} / {xpForNext} XP to next level</p>
                </div>
            </CardContent>
        </Card>
    );
}