import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils';

export default function CreateGroupPage({ me }) {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const createGroupMutation = useMutation({
        mutationFn: (newGroup) => base44.entities.Group.create(newGroup),
        onSuccess: () => {
            queryClient.invalidateQueries(['groups']);
            navigate(createPageUrl('Posts')); // Changed navigation target from 'Home' to 'Posts'
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !me) return;
        
        setIsUploading(true);
        let cover_photo_url = `https://source.unsplash.com/random/800x600?nature,water,sky,architecture,landscape&sig=${Date.now()}`;

        if (file) {
             try {
                const res = await base44.integrations.Core.UploadFile({ file });
                cover_photo_url = res.file_url;
            } catch (error) {
                console.error("File upload failed", error);
                alert("Cover photo upload failed. A random photo will be used.");
            }
        }
        setIsUploading(false);

        createGroupMutation.mutate({
            name,
            description,
            cover_photo_url,
            admins: [me.email],
            members: [me.email],
            type: 'group'
        });
    };

    const isLoading = isUploading || createGroupMutation.isLoading;

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0 flex items-start justify-center">
            <div className="w-full max-w-lg p-4 md:p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Group</CardTitle>
                    <CardDescription>Start a new community for your friends or team.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6 pr-6">
                        <div className="space-y-2">
                             <label htmlFor="group-name" className="block text-sm font-medium text-gray-700">Group Name</label>
                             <Input
                                id="group-name"
                                placeholder="Enter group name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                         <div className="space-y-2">
                             <label htmlFor="group-desc" className="block text-sm font-medium text-gray-700">Description</label>
                            <Textarea
                                id="group-desc"
                                placeholder="What is this group about?"
                                className="h-24"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                             <label htmlFor="group-cover" className="block text-sm font-medium text-gray-700">Cover Photo (Optional)</label>
                             <Input id="group-cover" type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} />
                             <p className="text-xs text-muted-foreground">If not provided, a random photo will be assigned.</p>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isLoading || !name.trim()}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Group
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            </div>
        </div>
    );
}