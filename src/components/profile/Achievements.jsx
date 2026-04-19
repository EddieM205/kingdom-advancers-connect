import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { badgeConfig } from '@/components/badges/BadgeDisplay';
import { Lock } from 'lucide-react';

const achievementProgress = {
    social_butterfly: { current: (friends) => friends, target: 5, label: 'friends' },
    chatterbox: { current: (msgs) => msgs, target: 50, label: 'messages' },
    video_star: { current: (calls) => calls, target: 10, label: 'video calls' },
    story_teller: { current: (stories) => stories, target: 5, label: 'stories' },
    top_contributor: { current: (level) => level, target: 10, label: 'level' },
};

export default function Achievements({ earnedBadges = [], stats = {} }) {
    const allBadges = Object.entries(badgeConfig);

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle>Achievements</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {allBadges.map(([badgeId, badge]) => {
                        const isEarned = earnedBadges.includes(badgeId);
                        const progressInfo = achievementProgress[badgeId];
                        const currentValue = progressInfo ? (stats[badgeId] || 0) : 0;
                        const progress = progressInfo ? Math.min((currentValue / progressInfo.target) * 100, 100) : 0;

                        return (
                            <div 
                                key={badgeId} 
                                className={`flex items-center gap-3 p-3 rounded-lg border ${
                                    isEarned ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' : 'opacity-60'
                                }`}
                            >
                                <div className={`p-2 rounded-full ${isEarned ? badge.color : 'bg-gray-100 text-gray-400'}`}>
                                    {isEarned ? <badge.Icon className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{badge.title}</p>
                                    <p className="text-xs text-muted-foreground">{badge.description}</p>
                                    {!isEarned && progressInfo && (
                                        <div className="mt-2">
                                            <Progress value={progress} className="h-1" />
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {currentValue} / {progressInfo.target} {progressInfo.label}
                                            </p>
                                        </div>
                                    )}
                                </div>
                                {isEarned && (
                                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                                        Earned!
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}