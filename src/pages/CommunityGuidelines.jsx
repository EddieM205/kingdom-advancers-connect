import React from 'react';
import { Shield, Flag, Users, Heart, AlertTriangle, CheckCircle } from 'lucide-react';

export default function CommunityGuidelines() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-primary" />
        <h1 className="text-2xl font-bold">Community Guidelines</h1>
      </div>

      <p className="text-muted-foreground mb-8">
        Kingdom Advancers Connect is a Christian community platform. We are committed to maintaining
        a safe, respectful, and uplifting environment for all members.
      </p>

      {[
        {
          icon: Heart,
          title: 'Love & Respect',
          color: 'text-red-500',
          items: [
            'Treat all members with kindness and respect.',
            'No hate speech, discrimination, or harassment based on race, gender, religion, or background.',
            'Disagree graciously — you can debate ideas without attacking people.',
          ],
        },
        {
          icon: CheckCircle,
          title: 'Acceptable Content',
          color: 'text-green-500',
          items: [
            'Uplifting posts, testimonies, and Bible discussions.',
            'Prayer requests and encouragement.',
            'Christian events, music, and educational content.',
            'Wholesome group conversations and calls.',
          ],
        },
        {
          icon: AlertTriangle,
          title: 'Prohibited Content',
          color: 'text-orange-500',
          items: [
            'Nudity, sexual content, or graphic violence.',
            'Spam, scams, or misleading information.',
            'Bullying, threats, or personal attacks.',
            'Content that promotes illegal activity.',
            'Impersonating other users or public figures.',
          ],
        },
        {
          icon: Flag,
          title: 'Reporting & Moderation',
          color: 'text-blue-500',
          items: [
            'Use the "Report" option on any post or profile to flag inappropriate content.',
            'Our moderation team reviews all reports promptly.',
            'Accounts that repeatedly violate these guidelines will be suspended or removed.',
            'False reporting may result in account review.',
          ],
        },
        {
          icon: Users,
          title: 'Group Calls & Live Streams',
          color: 'text-purple-500',
          items: [
            'Keep video calls and live streams family-friendly.',
            'Do not record or redistribute others\' calls without consent.',
            'Hosts are responsible for moderating their live streams.',
          ],
        },
      ].map(({ icon: Icon, title, color, items }) => (
        <div key={title} className="mb-6 p-4 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 mb-3">
            <Icon className={`w-5 h-5 ${color}`} />
            <h2 className="font-semibold text-base">{title}</h2>
          </div>
          <ul className="space-y-2">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-muted-foreground flex-shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ))}

      <p className="text-xs text-muted-foreground text-center mt-6">
        By using Kingdom Advancers Connect, you agree to follow these community guidelines.
        <br />Last updated: April 2026
      </p>
    </div>
  );
}
