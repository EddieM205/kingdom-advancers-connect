import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, Loader2, Send } from 'lucide-react';

export default function CreateVersePostDialog({ verse, book, chapter, version, onClose }) {
  const [caption, setCaption] = useState('');
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: (postData) => base44.entities.Post.create(postData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      onClose();
    },
  });

  const handlePost = () => {
    createPostMutation.mutate({
      content: `${book} ${chapter}:${verse.number}\n\n"${verse.text}"${caption ? '\n\n' + caption : ''}`,
      visibility: 'public',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-[#1c1c1e] rounded-t-2xl p-5 pb-8 max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold text-base">Post Verse</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Verse preview */}
        <div className="bg-[#2c2c2e] rounded-xl p-4 mb-4 border-l-4 border-amber-400">
          <p className="text-amber-400 text-xs font-semibold mb-2 uppercase tracking-wide">
            {book} {chapter}:{verse.number} · {version}
          </p>
          <p className="text-white text-sm leading-relaxed italic">"{verse.text}"</p>
        </div>

        {/* Caption */}
        <textarea
          placeholder="Add your thoughts..."
          value={caption}
          onChange={e => setCaption(e.target.value)}
          rows={3}
          className="w-full bg-[#2c2c2e] border border-white/10 rounded-xl text-white placeholder-gray-500 text-sm p-3 resize-none focus:outline-none focus:border-amber-400/50 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#2c2c2e] text-gray-300 font-medium text-sm hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            onClick={handlePost}
            disabled={createPostMutation.isPending}
            className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {createPostMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Share
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
