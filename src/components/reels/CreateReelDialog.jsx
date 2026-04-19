import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, X, Upload } from 'lucide-react';

export default function CreateReelDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [videoFile, setVideoFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [preview, setPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const createReelMutation = useMutation({
    mutationFn: async (reelData) => base44.entities.Reel.create(reelData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reels'] });
      resetForm();
      onOpenChange(false);
    },
  });

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video')) {
      setVideoFile(file);
      const reader = new FileReader();
      reader.onload = (event) => setPreview(event.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!videoFile) {
      alert('Please select a video');
      return;
    }

    setIsUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file: videoFile });
      createReelMutation.mutate({
        video_url: res.file_url,
        caption,
        visibility,
      });
    } catch (error) {
      alert('Video upload failed');
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setCaption('');
    setVisibility('public');
    setPreview(null);
    setIsUploading(false);
  };

  const isLoading = isUploading || createReelMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create a Reel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Video Upload */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Video</label>
            <Input
              type="file"
              accept="video/*"
              onChange={handleVideoSelect}
              disabled={isLoading}
            />
            {preview && (
              <div className="relative">
                <video src={preview} className="w-full max-h-40 rounded-lg object-cover" />
                <Button
                  type="button"
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2"
                  onClick={() => {
                    setVideoFile(null);
                    setPreview(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Caption */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Caption (optional)</label>
            <Textarea
              placeholder="Add a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={isLoading}
              className="h-20"
            />
          </div>

          {/* Visibility */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Visibility</label>
            <Select value={visibility} onValueChange={setVisibility} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public</SelectItem>
                <SelectItem value="friends">Friends Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !videoFile}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload Reel
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}