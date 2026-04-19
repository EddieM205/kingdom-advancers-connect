import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function InterestFeedback({ contentId, contentType, creatorEmail, themes = [], keywords = [], me }) {
  const queryClient = useQueryClient();
  const [hasResponded, setHasResponded] = React.useState(false);

  const feedbackMutation = useMutation({
    mutationFn: async (isInterested) => {
      await base44.entities.Interest.create({
        user_email: me.email,
        content_id: contentId,
        content_type: contentType,
        is_interested: isInterested,
        content_creator_email: creatorEmail,
        themes,
        keywords
      });
    },
    onSuccess: () => {
      setHasResponded(true);
      queryClient.invalidateQueries(['user_interests']);
      setTimeout(() => setHasResponded(false), 3000);
    }
  });

  if (hasResponded) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-500/20 border border-green-500/50 rounded-lg text-sm text-green-400">
        <span>✓ Thanks for your feedback!</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
      <span className="text-xs text-muted-foreground">Interested?</span>
      <div className="flex gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-green-500/20 hover:text-green-500"
          onClick={() => feedbackMutation.mutate(true)}
          disabled={feedbackMutation.isPending}
          title="Yes, show me more like this"
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0 hover:bg-red-500/20 hover:text-red-500"
          onClick={() => feedbackMutation.mutate(false)}
          disabled={feedbackMutation.isPending}
          title="Not interested"
        >
          <ThumbsDown className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}