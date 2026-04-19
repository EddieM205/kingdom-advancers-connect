import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Trash } from 'lucide-react';
import { format } from 'date-fns';

export default function StoryDataTab() {
    const queryClient = useQueryClient();
    const { data: stories, isLoading } = useQuery({ 
        queryKey: ['all_stories_admin'], 
        queryFn: () => base44.entities.Story.list('-created_date', 200) 
    });

    const deleteMutation = useMutation({
        mutationFn: (storyId) => base44.entities.Story.delete(storyId),
        onSuccess: () => queryClient.invalidateQueries(['all_stories_admin']),
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
                    {stories?.map(story => (
                        <TableRow key={story.id}>
                            <TableCell className="max-w-xs truncate">{story.content || 'Image/Video Story'}</TableCell>
                            <TableCell>{story.created_by}</TableCell>
                            <TableCell>{format(new Date(story.created_date), 'MMM d, yyyy')}</TableCell>
                            <TableCell>{story.visibility || 'public'}</TableCell>
                            <TableCell className="text-right">
                                <Button variant="destructive" size="icon" onClick={() => deleteMutation.mutate(story.id)} disabled={deleteMutation.isLoading}>
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