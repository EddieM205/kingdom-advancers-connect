import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Globe, Users, X, Check, Video } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { postThemes } from '@/components/theming';
import { Input } from '@/components/ui/input';

const ThemeSelector = ({ selectedTheme, onSelectTheme }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
        <div className="flex flex-wrap gap-2">
            {postThemes.map(theme => (
                <div key={theme.id} onClick={() => onSelectTheme(theme.id)}
                    className={`h-8 w-8 rounded-full cursor-pointer flex items-center justify-center ${theme.class} border-2 ${selectedTheme === theme.id ? 'border-primary' : 'border-transparent'}`}>
                    {selectedTheme === theme.id && <Check className={`h-4 w-4 ${theme.id === 'default' ? 'text-primary' : 'text-white'}`} />}
                </div>
            ))}
        </div>
    </div>
);

export default function CreatePostPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const location = useLocation();

    const passedQuote = location.state?.quote ? `${location.state.quote}\n\n— ${location.state.reference}` : '';

    const [content, setContent] = useState(passedQuote);
    const [visibility, setVisibility] = useState('public');
    const [file, setFile] = useState(null);
    const [fileType, setFileType] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [theme, setTheme] = useState(location.state?.theme || 'default');

    useEffect(() => {
        if (location.state?.quote) {
            const fullQuote = `${location.state.quote}\n\n— ${location.state.reference}`;
            setContent(fullQuote);
            setTheme(location.state.theme || 'default');
        }
    }, [location.state]);

    const createPostMutation = useMutation({
        mutationFn: (newPost) => base44.entities.Post.create(newPost),
        onMutate: async (newPost) => {
            await queryClient.cancelQueries({ queryKey: ['feed_posts_visible'] });
            const previous = queryClient.getQueryData(['feed_posts_visible']);
            const optimistic = {
                id: `optimistic-${Date.now()}`,
                ...newPost,
                created_date: new Date().toISOString(),
                created_by: 'me',
                _optimistic: true,
            };
            queryClient.setQueryData(['feed_posts_visible'], (old) => [optimistic, ...(old || [])]);
            return { previous };
        },
        onError: (_err, _vars, context) => {
            if (context?.previous) {
                queryClient.setQueryData(['feed_posts_visible'], context.previous);
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed_posts_visible'] });
            navigate('/Posts');
        },
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!content.trim()) {
            alert("Please write something to post.");
            return;
        }

        let file_url = null;
        if (file) {
            setIsUploading(true);
            try {
                const res = await base44.integrations.Core.UploadFile({ file });
                file_url = res.file_url;
            } catch (error) {
                console.error("File upload failed", error);
                alert("File upload failed. Please try again.");
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        createPostMutation.mutate({ content, visibility, file_url, theme });
    };
    
    const isLoading = isUploading || createPostMutation.isLoading;

    return (
        <div className="w-full min-h-screen pb-20 sm:pb-0">
            <div className="container mx-auto p-3 sm:p-4 md:p-8 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Create a New Post</CardTitle>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-6">
                        <Textarea
                            placeholder="What's on your mind?"
                            className="h-32 text-base"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                         <ThemeSelector selectedTheme={theme} onSelectTheme={setTheme} />
                         <div className="space-y-2">
                             <label className="block text-sm font-medium text-gray-700">Attach Media</label>
                             <Input 
                                 type="file" 
                                 accept="image/*,video/*" 
                                 onChange={(e) => {
                                     const selectedFile = e.target.files[0];
                                     if (selectedFile) {
                                         setFile(selectedFile);
                                         setFileType(selectedFile.type.startsWith('video') ? 'video' : 'image');
                                         const reader = new FileReader();
                                         reader.onload = (event) => setPreview(event.target.result);
                                         reader.readAsDataURL(selectedFile);
                                     }
                                 }} 
                             />
                             {file && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <span>{file.name}</span>
                                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { setFile(null); setPreview(null); setFileType(null); }}><X className="h-4 w-4"/></Button>
                                    </div>
                                    {preview && fileType === 'image' && <img src={preview} alt="Preview" className="max-h-64 rounded-lg" />}
                                    {preview && fileType === 'video' && <video src={preview} controls className="max-h-64 rounded-lg" />}
                                </div>
                             )}
                         </div>
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
                        <Button type="submit" disabled={isLoading || !content.trim()}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Post
                        </Button>
                    </CardFooter>
                </form>
            </Card>
            </div>
        </div>
    );
}