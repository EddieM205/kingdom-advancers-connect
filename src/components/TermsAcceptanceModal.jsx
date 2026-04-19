import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const TERMS_ACCEPTED_KEY = 'ka_terms_accepted_v1';

export function useTermsAccepted() {
  const [accepted, setAccepted] = useState(() => {
    return localStorage.getItem(TERMS_ACCEPTED_KEY) === 'true';
  });

  const accept = () => {
    localStorage.setItem(TERMS_ACCEPTED_KEY, 'true');
    setAccepted(true);
  };

  return { accepted, accept };
}

export default function TermsAcceptanceModal({ onAccept }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="bg-background rounded-2xl shadow-2xl max-w-sm w-full p-6 flex flex-col gap-5">
        <div className="flex flex-col items-center gap-2 text-center">
          <Shield className="w-12 h-12 text-primary" />
          <h2 className="text-xl font-bold">Welcome to Kingdom Advancers</h2>
          <p className="text-sm text-muted-foreground">
            Before you continue, please read and agree to our community standards.
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground space-y-2 max-h-48 overflow-y-auto">
          <p className="font-semibold text-foreground">By using this app you agree that:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>You will treat all members with love and respect.</li>
            <li>You will not post objectionable, hateful, or abusive content.</li>
            <li>You will not harass, bully, or intimidate other users.</li>
            <li>Content that violates our guidelines will be removed and the user ejected.</li>
            <li>You can flag any content or block any user that violates these standards.</li>
          </ul>
          <p className="pt-1">
            Read our full{' '}
            <Link to="/CommunityGuidelines" className="text-primary underline" target="_blank">
              Community Guidelines
            </Link>{' '}
            and{' '}
            <Link to="/PrivacyPolicy" className="text-primary underline" target="_blank">
              Privacy Policy
            </Link>.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={e => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary flex-shrink-0"
          />
          <span className="text-sm">
            I have read and agree to the Community Guidelines and Terms of Use. I understand there is
            zero tolerance for objectionable content or abusive behavior.
          </span>
        </label>

        <Button
          className="w-full"
          disabled={!checked}
          onClick={onAccept}
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Continue to Kingdom Advancers
        </Button>
      </div>
    </div>
  );
}
