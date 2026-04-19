import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Trash } from 'lucide-react';
import { format } from 'date-fns';

export default function PostDataTab() {
    const queryClient = useQueryClient();
    const { data: posts, isLoading } = useQuery({ queryKey: ['all_posts_admin'], queryFn: () => base44.entities.Post.list('-created_date', 200) });

    const deleteMutation = useMutation({
        mutationFn: (postId) => base44.entities.Post.delete(postId),
        onSuccess: () => queryClient.invalidateQueries(['all_posts_admin']),
    });

    if (isLoading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="mt-4 border rounded-lg">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Content</TableHead>
                        <TableHead>Author</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Privacy</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {posts?.map(post => (
                        <TableRow key={post.id}>
                            <TableCell className="max-w-xs truncate">{post.content}</TableCell>
                            <TableCell>{post.created_by}</TableCell>
                            <TableCell>{format(new Date(post.created_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{post.privacy || 'public'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(post.id)} disabled={deleteMutation.isLoading}>
                                    <Trash className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}