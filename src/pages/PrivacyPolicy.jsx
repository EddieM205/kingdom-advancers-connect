import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Link to="/Profile">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground mb-8">Last updated: April 4, 2026</p>

      <div className="prose prose-slate max-w-none space-y-8 text-foreground">

        <section>
          <h2 className="text-xl font-semibold mb-2">1. Introduction</h2>
          <p className="text-muted-foreground">
            Welcome to <strong>Kingdom Advancers</strong>. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our app.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Account Information:</strong> Your name, email address, and profile photo when you register.</li>
            <li><strong>Profile Data:</strong> Bio, location, website, and phone number you choose to add.</li>
            <li><strong>Content:</strong> Posts, stories, comments, messages, and media files you share in the app.</li>
            <li><strong>Usage Data:</strong> Game scores, activity, badges, XP, and level progress.</li>
            <li><strong>Communications:</strong> Chat messages and direct messages sent within the app.</li>
            <li><strong>Live Stream Data:</strong> Stream titles and viewer activity when you broadcast or watch live.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li>To provide, operate, and maintain the Kingdom Advancers platform.</li>
            <li>To personalize your experience and show relevant content.</li>
            <li>To send you notifications about activity relevant to you.</li>
            <li>To power game features, leaderboards, and achievements.</li>
            <li>To improve app performance and fix bugs.</li>
            <li>To communicate important updates about the service.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">4. Sharing of Information</h2>
          <p className="text-muted-foreground">
            We do <strong>not</strong> sell or rent your personal data to third parties. Your information may be shared only in the following limited cases:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground mt-2">
            <li>With other users as part of normal app functionality (e.g., your posts, name, and avatar are visible to community members).</li>
            <li>With service providers who help us operate the platform (e.g., cloud hosting, file storage).</li>
            <li>If required by law or to protect the safety of users.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">5. Data Storage & Security</h2>
          <p className="text-muted-foreground">
            Your data is stored securely using industry-standard encryption and access controls. We take reasonable measures to protect your information from unauthorized access, loss, or misuse. However, no method of transmission over the internet is 100% secure.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">6. Your Rights</h2>
          <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
            <li><strong>Access:</strong> You can view and edit your profile information at any time in the app.</li>
            <li><strong>Deletion:</strong> You can permanently delete your account from the Settings page.</li>
            <li><strong>Data Portability:</strong> You may request a copy of your data by contacting us.</li>
            <li><strong>Opt-out:</strong> You can manage notification preferences in Settings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">7. Children's Privacy</h2>
          <p className="text-muted-foreground">
            Kingdom Advancers is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal data, please contact us so we can remove it.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">8. Changes to This Policy</h2>
          <p className="text-muted-foreground">
            We may update this Privacy Policy from time to time. We will notify you of significant changes through the app or via email. Continued use of the app after changes are posted constitutes your acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-2">9. Contact Us</h2>
          <p className="text-muted-foreground">
            If you have any questions or concerns about this Privacy Policy, please contact us at:
          </p>
          <p className="mt-2 font-medium">Kingdom Advancers Support</p>
          <p className="text-muted-foreground">Email: support@kingdomadvancers.app</p>
        </section>

      </div>
      </div>
    </div>
  );
}