import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function StreamChat({ streamId, me, isHost }) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['live-chat', streamId],
    queryFn: () => base44.entities.LiveChat.filter({ stream_id: streamId }, 'created_date', 50),
    refetchInterval: 1000
  });

  const sendMutation = useMutation({
    mutationFn: async (content) => {
      return await base44.entities.LiveChat.create({
        stream_id: streamId,
        content,
        user_name: me?.full_name,
        user_avatar: me?.avatar_url
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
      setMessage('');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (chatId) => base44.entities.LiveChat.delete(chatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['live-chat', streamId] });
    }
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (message.trim()) {
      sendMutation.mutate(message.trim());
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden pointer-events-auto">
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-64">
        {messages.length === 0 ?
        <p className="text-gray-400 text-xs text-center">No messages yet</p> :

        messages.map((msg) =>
        <div
          key={msg.id}
          className="text-xs text-white group flex justify-between items-start gap-2 hover:bg-white/5 p-2 rounded">
          
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-red-400">{msg.user_name}</span>
                <p className="text-gray-200 break-words text-xs">{msg.content}</p>
              </div>
              {isHost &&
          <button
            onClick={() => deleteMutation.mutate(msg.id)}
            className="opacity-0 group-hover:opacity-100 text-red-400 text-xs hover:text-red-300">
            
                  ✕
                </button>
          }
            </div>
        )
        }
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="mt-2 py-2 flex gap-2 border-t border-white/10">
        <Input
          type="text"
          placeholder="Add a comment..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={200}
          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 text-sm h-8" />
        
        <Button
          type="submit"
          disabled={sendMutation.isPending || !message.trim()}
          size="sm"
          className="bg-red-600 hover:bg-red-700 h-8 px-2">
          
          {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>
    </div>);

}