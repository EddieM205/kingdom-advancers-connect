import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, UploadCloud, Check, Globe, Users } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { postThemes } from '@/components/theming';

const ThemeSelector = ({ selectedTheme, onSelectTheme }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
        <div className="flex flex-wrap gap-2">
            {postThemes.map(theme => (
                <div key={theme.id} onClick={() => onSelectTheme(theme.id)}
                    className={`h-8 w-8 rounded-full cursor-pointer flex items-center justify-center ${theme.class} border-2 ${selectedTheme === theme.id ? 'border-primary' : 'border-transparent'}`}>
                    {selectedTheme === theme.id && <Check className={`h-4 w-4 ${['default', 'scripture', 'dawn'].includes(theme.id) ? 'text-primary' : 'text-white'}`} />}
                </div>
            ))}
        </div>
    </div>
);

export default function CreateStoryPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    
    const [content, setContent] = useState('');
    const [file, setFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [theme, setTheme] = useState('default');
    const [visibility, setVisibility] = useState('public');

    useEffect(() => {
        if (!file) {
            setPreviewUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const createStoryMutation = useMutation({
        mutationFn: (newStory) => base44.entities.Story.create(newStory),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['all_active_stories'] });
            navigate(createPageUrl('Feed'));
        }
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!content.trim() && !file) {
            alert("Please add some content or upload a file.");
            return;
        }

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const storyData = { 
            content, 
            theme, 
            visibility,
            expires_at: expiresAt
        };

        if (file) {
            try {
                const res = await base44.integrations.Core.UploadFile({ file });
                storyData.file_url = res.file_url;
            } catch (error) {
                console.error("File upload failed", error);
                alert("File upload failed. Please try again.");
                return;
            }
        }

        createStoryMutation.mutate(storyData);
    };

    const isSubmitDisabled = createStoryMutation.isPending || (!content.trim() && !file);

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Story</CardTitle>
                    <CardDescription>Share an image, video, or some text. Your story will disappear after 24 hours.</CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <label htmlFor="story-file" className="block text-sm font-medium text-gray-700">Media (Image/Video)</label>
                            <Input id="story-file" type="file" accept="image/*,video/*" onChange={(e) => setFile(e.target.files[0])} />
                            
                            {previewUrl && (
                                <div className="mt-4 w-full aspect-video bg-black rounded-lg flex items-center justify-center overflow-hidden">
                                    {file.type.startsWith('image/') ? (
                                        <img src={previewUrl} alt="Preview" className="max-h-full max-w-full object-contain" />
                                    ) : (
                                        <video src={previewUrl} controls className="max-h-full max-w-full" />
                                    )}
                                </div>
                            )}

                            {!previewUrl && (
                                <div className="mt-4 w-full aspect-video bg-secondary rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                                    <UploadCloud className="w-10 h-10 mb-2"/>
                                    <p>Upload a file to see a preview</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="story-content" className="block text-sm font-medium text-gray-700">Content</label>
                            <Textarea
                                id="story-content"
                                placeholder="Add a caption or share what's on your mind..."
                                value={content}
                                onChange={e => setContent(e.target.value)}
                                className="h-24"
                            />
                        </div>

                        <ThemeSelector selectedTheme={theme} onSelectTheme={setTheme} />

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Visibility</label>
                            <Select onValueChange={setVisibility} value={visibility}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select visibility" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="public">
                                        <div className="flex items-center"><Globe className="w-4 h-4 mr-2" /> Public</div>
                                    </SelectItem>
                                    <SelectItem value="friends">
                                        <div className="flex items-center"><Users className="w-4 h-4 mr-2" /> Friends Only</div>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                    <CardFooter>
                         <Button type="submit" disabled={isSubmitDisabled}>
                            {createStoryMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Share Story
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            </div>
        </div>
    );
}