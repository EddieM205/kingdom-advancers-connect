import { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useBlockedEmails } from '@/lib/useBlockedEmails';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MessageSquare, Users, FileText, Radio, Sparkles, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SmartSearch({ me }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const blockedSet = useBlockedEmails(me?.email);
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      if (searchTerm) setIsOpen(true);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: users = [], isLoading: usersLoading } = useQuery({
    queryKey: ['search_users', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(user =>
        user.id !== me?.id &&
        !blockedSet.has(user.email) &&
        (user.full_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
         user.email?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()))
      ).slice(0, 5);
    },
    enabled: !!me && !!debouncedSearchTerm,
  });

  const { data: groups = [], isLoading: groupsLoading } = useQuery({
    queryKey: ['search_groups', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const allGroups = await base44.entities.Group.list();
      return allGroups.filter(group =>
        group.name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        group.description?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ).slice(0, 3);
    },
    enabled: !!me && !!debouncedSearchTerm,
  });

  const { data: myFollows = [] } = useQuery({
    queryKey: ['my_follows', me?.email],
    queryFn: () => base44.entities.Follow.filter({ follower_email: me.email, status: 'accepted' }),
    enabled: !!me,
    staleTime: 60_000,
  });
  const followingSet = useMemo(() => new Set(myFollows.map(f => f.following_email)), [myFollows]);

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['search_posts', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const [allPosts, allUsers] = await Promise.all([
        base44.entities.Post.list('-created_date', 100),
        base44.entities.User.list(),
      ]);
      const privateEmails = new Set(allUsers.filter(u => u.is_private).map(u => u.email));
      return allPosts.filter(post => {
        if (!post.content?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())) return false;
        if (post.created_by === me.email) return true;
        if (privateEmails.has(post.created_by) && !followingSet.has(post.created_by)) return false;
        return true;
      }).slice(0, 3);
    },
    enabled: !!me && !!debouncedSearchTerm,
  });

  const { data: livestreams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['search_livestreams', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm) return [];
      const allStreams = await base44.entities.LiveStream.list('-created_date', 50);
      return allStreams.filter(stream =>
        stream.title?.toLowerCase().includes(debouncedSearchTerm.toLowerCase()) ||
        stream.host_name?.toLowerCase().includes(debouncedSearchTerm.toLowerCase())
      ).slice(0, 2);
    },
    enabled: !!me && !!debouncedSearchTerm,
  });

  const createDmMutation = useMutation({
    mutationFn: async (otherUser) => {
      const userEmails = [me.email, otherUser.email].sort();
      const existingGroups = await base44.entities.Group.filter({
        type: 'dm',
        members: { '$all': userEmails }
      });
      if (existingGroups.length > 0) return existingGroups[0];
      return await base44.entities.Group.create({
        name: `DM with ${otherUser.full_name}`,
        description: `Direct message between ${me.full_name} and ${otherUser.full_name}`,
        type: 'dm',
        admins: [me.email, otherUser.email],
        members: [me.email, otherUser.email],
        dm_status: 'pending',
        dm_initiator: me.email,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setSearchTerm('');
      setIsOpen(false);
    }
  });

  const isLoading = usersLoading || groupsLoading || postsLoading || streamsLoading;
  const hasResults = users.length > 0 || groups.length > 0 || posts.length > 0 || livestreams.length > 0;

  const handleNavigate = (path) => {
    setIsOpen(false);
    setSearchTerm('');
    navigate(path);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-300 z-10 pointer-events-none" />
      <Input
        placeholder="Search..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onFocus={() => searchTerm && setIsOpen(true)}
        className="pl-9 bg-white/10 text-white placeholder:text-gray-300 border-0 h-9 text-xs placeholder:text-xs focus-visible:ring-1 focus-visible:ring-white/50 focus-visible:ring-offset-0"
      />
      {searchTerm && <Sparkles className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50 pointer-events-none" />}

      {isOpen && searchTerm && (
        <div className="absolute top-full mt-1 left-0 w-[min(360px,calc(100vw-2rem))] z-50 bg-white border border-gray-200 rounded-md shadow-lg max-h-[60vh] sm:max-h-[500px] overflow-y-auto text-gray-900">
          {isLoading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : !hasResults ? (
            <div className="p-6 text-center">
              <p className="text-sm text-gray-500">No results found for "{debouncedSearchTerm}"</p>
            </div>
          ) : (
            <>
              {/* People */}
              {users.length > 0 && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">People</p>
                  <div className="space-y-1">
                    {users.map(user => {
                      const isFollowing = followingSet.has(user.email);
                      return (
                        <div
                          key={user.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors group cursor-pointer"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleNavigate(`/CreatorProfile?email=${user.email}`)}
                        >
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            <div className="relative flex-shrink-0">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback>{user.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              {user.is_private && (
                                <span className="absolute -bottom-0.5 -right-0.5 bg-gray-700 text-white rounded-full p-0.5">
                                  <Lock className="w-2.5 h-2.5" />
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="text-sm font-medium truncate text-gray-900">{user.full_name}</p>
                                {user.is_private && <span className="text-xs text-gray-400 shrink-0">· Private</span>}
                              </div>
                              <p className="text-xs text-gray-500 truncate font-mono">@{user.handle || user.full_name?.toLowerCase().replace(/\s+/g, '_')}</p>
                            </div>
                          </div>
                          <div
                            className="flex items-center gap-1 shrink-0 ml-2"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isFollowing ? (
                              <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">Following</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => createDmMutation.mutate(user)}
                                disabled={createDmMutation.isPending}
                                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                              >
                                {createDmMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MessageSquare className="w-3.5 h-3.5" />}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Groups */}
              {groups.length > 0 && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Groups</p>
                  <div className="space-y-2">
                    {groups.map(group => (
                      <button
                        key={group.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleNavigate(`/Chat?groupId=${group.id}`)}
                        className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={group.cover_photo_url} className="object-cover" />
                          <AvatarFallback>{group.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate text-gray-900">{group.name}</p>
                          <p className="text-xs text-gray-500 truncate">{group.description}</p>
                        </div>
                        <Badge variant="outline" className="flex-shrink-0 text-xs">
                          <Users className="w-3 h-3 mr-1" />
                          {group.members?.length || 0}
                        </Badge>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Posts */}
              {posts.length > 0 && (
                <div className="border-b border-gray-100 px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Posts</p>
                  <div className="space-y-2">
                    {posts.map(post => (
                      <button
                        key={post.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleNavigate(`/Posts?postId=${post.id}`)}
                        className="w-full flex items-start space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 mt-1 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm line-clamp-2 text-gray-900">{post.content?.substring(0, 60)}...</p>
                          <p className="text-xs text-gray-500 mt-1">by {post.created_by}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Streams */}
              {livestreams.length > 0 && (
                <div className="px-4 py-3">
                  <p className="text-xs font-semibold text-gray-400 mb-2 uppercase">Live Streams</p>
                  <div className="space-y-2">
                    {livestreams.map(stream => (
                      <button
                        key={stream.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleNavigate(`/LiveStreams?streamId=${stream.id}`)}
                        className="w-full flex items-center space-x-2 p-2 rounded-md hover:bg-gray-100 transition-colors text-left"
                      >
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarImage src={stream.host_avatar} />
                          <AvatarFallback>{stream.host_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate text-gray-900">{stream.title}</p>
                            {stream.status === 'live' && (
                              <Badge variant="destructive" className="text-xs flex-shrink-0">
                                <Radio className="w-2 h-2 mr-1" /> Live
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{stream.host_name}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}