import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Send, Heart } from 'lucide-react';

export default function LiveChat({ streamId, me }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const scrollRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['live-chat', streamId],
    queryFn: async () => {
      try {
        return await base44.entities.Message.filter(
          { group_id: streamId },
          '-created_date',
          50
        );
      } catch {
        return [];
      }
    },
    refetchInterval: 2000,
  });

  const sendMessageMutation = useMutation({
    mutationFn: (content) =>
      base44.entities.Message.create({
        content,
        group_id: streamId,
      }),
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
    },
  });

  const sendLikeMutation = useMutation({
    mutationFn: () =>
      base44.entities.Message.create({
        content: '❤️',
        group_id: streamId,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Live Chat</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 p-3 overflow-y-auto">
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="text-xs bg-secondary/30 rounded p-2 break-words"
            >
              <span className="font-semibold">{msg.created_by}</span>
              <span className="text-muted-foreground ml-1">{msg.content}</span>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          <Input
            placeholder="Say something..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            className="text-sm h-8"
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!message.trim()}
            className="h-8 w-8"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => sendLikeMutation.mutate()}
          className="w-full text-xs"
        >
          <Heart className="w-3 h-3 mr-1" />
          Like
        </Button>
      </div>
    </div>
  );
}