import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { extractHashtags } from '@/utils/hashtags';
import PostItem from '@/components/posts/PostItem';
import PeopleYouMayKnow from '@/components/discover/PeopleYouMayKnow';
import { Loader2, Compass, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DiscoverPage() {
    const [searchParams] = useSearchParams();
    const selectedTag = `#${searchParams.get('tag') || ''}`.toLowerCase();
    const defaultTab = selectedTag && selectedTag !== '#' ? 'posts' : 'people';

    const { data: me } = useQuery({
        queryKey: ['me'],
        queryFn: () => base44.auth.me(),
    });

    const { data: allPosts = [], isLoading } = useQuery({
        queryKey: ['all_posts_discover'],
        queryFn: () => base44.entities.Post.list('-created_date'),
    });

    const { data: users = [] } = useQuery({
        queryKey: ['users_discover'],
        queryFn: () => base44.entities.User.list(),
    });

    const filteredPosts = useMemo(() => {
        if (!selectedTag || selectedTag === '#') return allPosts;
        return allPosts.filter(post => extractHashtags(post.content).includes(selectedTag));
    }, [allPosts, selectedTag]);

    const userMap = useMemo(() => {
        const map = {};
        users.forEach(user => { map[user.email] = user; });
        return map;
    }, [users]);

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-4xl">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Compass className="w-7 h-7" />
                        {selectedTag && selectedTag !== '#' ? `Discover ${selectedTag}` : 'Discover'}
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">Find people and content tailored to you</p>
                </div>

                <Tabs defaultValue={defaultTab}>
                    <TabsList className="mb-6 grid grid-cols-2 w-full max-w-xs">
                        <TabsTrigger value="people"><Users className="w-4 h-4 mr-1.5" />People</TabsTrigger>
                        <TabsTrigger value="posts"><Compass className="w-4 h-4 mr-1.5" />Posts</TabsTrigger>
                    </TabsList>

                    <TabsContent value="people">
                        <h2 className="text-lg font-semibold mb-4">People You May Know</h2>
                        <PeopleYouMayKnow me={me} />
                    </TabsContent>

                    <TabsContent value="posts">
                        {selectedTag && selectedTag !== '#' && (
                            <p className="text-muted-foreground mb-4">{filteredPosts.length} posts tagged <span className="font-semibold text-foreground">{selectedTag}</span></p>
                        )}
                        {isLoading ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : filteredPosts.length === 0 ? (
                            <div className="text-center py-12">
                                <p className="text-muted-foreground">No posts found {selectedTag && selectedTag !== '#' ? `with ${selectedTag}` : ''}</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredPosts.map(post => (
                                    <PostItem key={post.id} post={post} currentUserId={me?.email} author={userMap[post.created_by]} me={me} />
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}