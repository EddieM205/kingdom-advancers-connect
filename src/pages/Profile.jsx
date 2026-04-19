import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Camera, Grid3x3, Film, Settings, Link as LinkIcon, Bookmark, Trash2, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import FollowersFollowingModal from '@/components/profile/FollowersFollowingModal';

export default function Profile() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [modalTab, setModalTab] = useState(null);

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myPosts = [] } = useQuery({
    queryKey: ['my-posts', me?.email],
    queryFn: () => base44.entities.Post.filter({ created_by: me.email }, '-created_date', 30),
    enabled: !!me,
  });

  const { data: myReels = [] } = useQuery({
    queryKey: ['my-reels', me?.email],
    queryFn: () => base44.entities.Reel.filter({ created_by: me.email }, '-created_date', 30),
    enabled: !!me,
  });

  const { data: followers = [] } = useQuery({
    queryKey: ['followers', me?.email],
    queryFn: () => base44.entities.Follow.filter({ following_email: me.email, status: 'accepted' }),
    enabled: !!me,
  });

  const { data: following = [] } = useQuery({
    queryKey: ['following', me?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: me.email, status: 'accepted' }),
    enabled: !!me,
  });

  const { data: savedVerses = [] } = useQuery({
    queryKey: ['savedVerses', me?.email],
    queryFn: async () => {
      const result = await base44.entities.SavedVerse.list();
      return result;
    },
    enabled: !!me,
    staleTime: 0
  });

  useEffect(() => {
    if (me) {
      setUser(me);
    }
  }, [me]);

  const updateProfileMutation = useMutation({
    mutationFn: (updatedData) => base44.auth.updateMe(updatedData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setIsEditing(false);
    },
  });

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateProfileMutation.mutate({ ...user, avatar_url: file_url });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = () => {
    const { id, email, role, ...updateData } = user;
    updateProfileMutation.mutate(updateData);
  };

  const removeSavedVerseMutation = useMutation({
    mutationFn: (verseId) => base44.entities.SavedVerse.delete(verseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savedVerses'] });
    },
  });

  const handleGoToVerse = (reference) => {
    const match = reference.match(/^(.+?)\s(\d+):(\d+)$/);
    if (match) {
      const [, book, chapter] = match;
      const params = new URLSearchParams({
        book,
        chapter,
      });
      navigate(`/Bible?${params.toString()}`);
    }
  };

  if (meLoading || !user) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-black text-white pb-24 sm:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b border-white/10">
        <span className="text-base sm:text-lg font-semibold truncate min-w-0 mr-2">@{user.full_name?.toLowerCase().replace(/\s+/g, '_')}</span>
        <Link to="/Settings">
          <button className="p-2">
            <Settings className="w-5 h-5 text-white" />
          </button>
        </Link>
      </div>

      {/* Profile Info */}
      <div className="px-3 sm:px-4 pt-4 sm:pt-5 pb-3 sm:pb-4">
        {/* Avatar + Stats row */}
        <div className="flex items-center gap-3 sm:gap-6 mb-4">
          <div className="relative shrink-0">
            <div className="w-18 h-18 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full p-0.5 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600" style={{width: '4.5rem', height: '4.5rem'}}>
              <div className="w-full h-full rounded-full overflow-hidden bg-black">
                <Avatar className="w-full h-full rounded-full">
                  <AvatarImage src={user.avatar_url} className="object-cover" />
                  <AvatarFallback className="text-xl sm:text-2xl bg-gray-800 text-white rounded-full">
                    {user.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
            {!isEditing && (
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1 cursor-pointer border-2 border-black">
                {isUploading ? <Loader2 className="w-3 h-3 text-white animate-spin" /> : <Camera className="w-3 h-3 text-white" />}
              </label>
            )}
            <input id="avatar-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isUploading} />
          </div>

          <div className="flex-1 flex justify-around min-w-0">
            <div className="flex flex-col items-center px-1">
              <span className="text-sm sm:text-base font-bold">{myPosts.length}</span>
              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">posts</span>
            </div>
            <button onClick={() => setModalTab('followers')} className="flex flex-col items-center px-1 hover:opacity-70 transition-opacity">
              <span className="text-sm sm:text-base font-bold">{followers.length}</span>
              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">followers</span>
            </button>
            <button onClick={() => setModalTab('following')} className="flex flex-col items-center px-1 hover:opacity-70 transition-opacity">
              <span className="text-sm sm:text-base font-bold">{following.length}</span>
              <span className="text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1">following</span>
            </button>
          </div>
        </div>

        {/* Name & Bio */}
        {isEditing ? (
          <div className="space-y-3 mb-4">
            <Input
              value={user.full_name || ''}
              onChange={(e) => setUser({ ...user, full_name: e.target.value })}
              placeholder="Full name"
              className="bg-gray-900 border-gray-700 text-white"
            />
            <Textarea
              value={user.bio || ''}
              onChange={(e) => setUser({ ...user, bio: e.target.value })}
              placeholder="Bio"
              className="bg-gray-900 border-gray-700 text-white resize-none"
              rows={3}
            />
            <Input
              value={user.website || ''}
              onChange={(e) => setUser({ ...user, website: e.target.value })}
              placeholder="Website"
              className="bg-gray-900 border-gray-700 text-white"
            />
          </div>
        ) : (
          <div className="mb-4">
            <p className="font-semibold text-sm">{user.full_name}</p>
            {user.bio && <p className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap">{user.bio}</p>}
            {user.website && (
              <a href={user.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 flex items-center gap-1 mt-0.5">
                <LinkIcon className="w-3 h-3" /> {user.website}
              </a>
            )}
            <p className="text-xs text-gray-500 mt-1">Joined {format(new Date(user.created_date || Date.now()), 'MMMM yyyy')}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-gray-800 text-white border border-gray-700 min-h-[38px]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={updateProfileMutation.isPending}
                className="flex-1 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white disabled:opacity-50 min-h-[38px]"
              >
                {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Save'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 py-2 text-sm font-semibold rounded-lg bg-gray-800 text-white border border-gray-700 min-h-[38px]"
            >
              Edit profile
            </button>
          )}
        </div>
      </div>

      {/* Content Grid */}
      <div className="border-t border-white/10">
        <div className="flex">
          <button
            onClick={() => setActiveTab('posts')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition ${
              activeTab === 'posts' ? 'border-white text-white' : 'border-transparent text-gray-500'
            }`}
          >
            <Grid3x3 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('reels')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition ${
              activeTab === 'reels' ? 'border-white text-white' : 'border-transparent text-gray-500'
            }`}
          >
            <Film className="w-5 h-5" />
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 flex items-center justify-center py-3 border-b-2 transition ${
              activeTab === 'saved' ? 'border-white text-white' : 'border-transparent text-gray-500'
            }`}
          >
            <Bookmark className="w-5 h-5" />
          </button>
        </div>

        {activeTab === 'posts' ? (
          <>
            {myPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Grid3x3 className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No posts yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 px-1">
                {myPosts.map((item) => (
                  <div key={item.id} className="aspect-square relative bg-gray-900 overflow-hidden">
                    {item.file_url ? (
                      <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-xs text-gray-400 line-clamp-4 text-center">{item.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : activeTab === 'reels' ? (
          <>
            {myReels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Film className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No reels yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-0.5 px-1">
                {myReels.map((item) => (
                  <div key={item.id} className="aspect-square relative bg-gray-900 overflow-hidden">
                    {item.file_url ? (
                      <img src={item.file_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-2">
                        <p className="text-xs text-gray-400 line-clamp-4 text-center">{item.content}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {savedVerses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                <Bookmark className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">No saved verses yet</p>
              </div>
            ) : (
              <div className="space-y-2 p-3 sm:p-4">
                {savedVerses.map((verse) => (
                  <div key={verse.id} className="bg-gray-900 rounded-lg p-3 sm:p-4 space-y-2 border border-gray-800">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-400 mb-1">{verse.reference}</p>
                        <p className="text-sm text-gray-300 leading-relaxed line-clamp-3">{verse.text}</p>
                        <p className="text-xs text-gray-600 mt-2">{verse.version}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleGoToVerse(verse.reference)}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded bg-blue-600 hover:bg-blue-700 text-white transition"
                      >
                        <BookOpen className="w-3 h-3" />
                        Read
                      </button>
                      <button
                        onClick={() => removeSavedVerseMutation.mutate(verse.id)}
                        disabled={removeSavedVerseMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-1 py-2 text-xs font-semibold rounded bg-gray-800 hover:bg-gray-700 text-white transition disabled:opacity-50"
                      >
                        {removeSavedVerseMutation.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Trash2 className="w-3 h-3" />
                        )}
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalTab && me && (
        <FollowersFollowingModal
          isOpen={!!modalTab}
          onClose={() => setModalTab(null)}
          targetEmail={me.email}
          defaultTab={modalTab}
        />
      )}
    </div>
  );
}