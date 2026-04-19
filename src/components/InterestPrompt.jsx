import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ThumbsUp, ThumbsDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Shows once per content item per session after user interacts with it
export default function InterestPrompt({ contentId, contentType, creatorEmail, themes = [], keywords = [], me }) {
  const [visible, setVisible] = useState(false);
  const [answered, setAnswered] = useState(false);

  useEffect(() => {
    const key = `interest_prompted_${contentId}`;
    if (!sessionStorage.getItem(key)) {
      // Small delay so it doesn't pop up instantly
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [contentId]);

  const feedbackMutation = useMutation({
    mutationFn: (isInterested) =>
      base44.entities.Interest.create({
        user_email: me.email,
        content_id: contentId,
        content_type: contentType,
        is_interested: isInterested,
        content_creator_email: creatorEmail,
        themes,
        keywords,
      }),
    onSuccess: () => {
      sessionStorage.setItem(`interest_prompted_${contentId}`, '1');
      setAnswered(true);
      setTimeout(() => setVisible(false), 1800);
    },
  });

  const dismiss = () => {
    sessionStorage.setItem(`interest_prompted_${contentId}`, '1');
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-between gap-2 px-3 py-2 mt-2 rounded-xl bg-muted/80 border border-border text-sm"
        >
          {answered ? (
            <span className="text-xs text-green-600 font-medium w-full text-center">✓ Got it! We'll tune your feed.</span>
          ) : (
            <>
              <span className="text-xs text-muted-foreground">See more like this?</span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => feedbackMutation.mutate(true)}
                  disabled={feedbackMutation.isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-green-100 hover:text-green-700 transition-colors"
                >
                  <ThumbsUp className="w-3.5 h-3.5" /> Yes
                </button>
                <button
                  onClick={() => feedbackMutation.mutate(false)}
                  disabled={feedbackMutation.isPending}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium hover:bg-red-100 hover:text-red-600 transition-colors"
                >
                  <ThumbsDown className="w-3.5 h-3.5" /> No
                </button>
                <button onClick={dismiss} className="ml-1 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}