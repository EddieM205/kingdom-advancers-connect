import React from 'react';
import { Star, Zap, Users, MessageSquare, Video, BookOpen, Trophy, Heart, Award, Flame } from 'lucide-react';

export const badgeConfig = {
    first_quiz: {
        Icon: Star,
        title: 'Quiz Starter',
        description: 'Completed your first Bible quiz',
        color: 'bg-yellow-100 text-yellow-600',
    },
    perfect_score: {
        Icon: Trophy,
        title: 'Perfect Score',
        description: 'Got 100% on a quiz',
        color: 'bg-amber-100 text-amber-600',
    },
    quiz_master: {
        Icon: Zap,
        title: 'Quiz Master',
        description: 'Completed 10 quizzes',
        color: 'bg-purple-100 text-purple-600',
    },
    social_butterfly: {
        Icon: Users,
        title: 'Social Butterfly',
        description: 'Made 5 friends',
        color: 'bg-blue-100 text-blue-600',
    },
    chatterbox: {
        Icon: MessageSquare,
        title: 'Chatterbox',
        description: 'Sent 50 messages',
        color: 'bg-green-100 text-green-600',
    },
    video_star: {
        Icon: Video,
        title: 'Video Star',
        description: 'Made 10 video calls',
        color: 'bg-pink-100 text-pink-600',
    },
    story_teller: {
        Icon: BookOpen,
        title: 'Story Teller',
        description: 'Posted 5 stories',
        color: 'bg-indigo-100 text-indigo-600',
    },
    top_contributor: {
        Icon: Award,
        title: 'Top Contributor',
        description: 'Reached level 10',
        color: 'bg-orange-100 text-orange-600',
    },
    beloved: {
        Icon: Heart,
        title: 'Beloved',
        description: 'Received 20 likes',
        color: 'bg-rose-100 text-rose-600',
    },
    on_fire: {
        Icon: Flame,
        title: 'On Fire',
        description: '7-day activity streak',
        color: 'bg-red-100 text-red-600',
    },
};

export default function BadgeDisplay({ badgeId, size = 'md' }) {
    const badge = badgeConfig[badgeId];
    if (!badge) return null;

    const { Icon, title, description, color } = badge;
    const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    const padding = size === 'sm' ? 'p-2' : 'p-3';

    return (
        <div className="flex flex-col items-center gap-1 group relative">
            <div className={`${padding} rounded-full ${color} transition-transform group-hover:scale-110`}>
                <Icon className={iconSize} />
            </div>
            {size !== 'sm' && (
                <span className="text-xs font-medium text-center">{title}</span>
            )}
            {/* Tooltip on hover */}
            <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 max-w-[140px] text-center shadow-lg">
                    <p className="font-semibold">{title}</p>
                    <p className="text-gray-300 mt-0.5">{description}</p>
                </div>
                <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
            </div>
        </div>
    );
}