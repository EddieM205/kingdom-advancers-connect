import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { Loader2, Upload, Trash2, Video } from 'lucide-react';

export default function PostStreamDialog({ open, stream, recordedBlob, onPost, onDiscard }) {
    const [uploading, setUploading] = useState(false);
    const videoUrl = recordedBlob ? URL.createObjectURL(recordedBlob) : null;

    const handlePost = async () => {
        setUploading(true);
        try {
            let video_url = null;
            if (recordedBlob) {
                const file = new File([recordedBlob], 'stream.webm', { type: recordedBlob.type });
                const result = await base44.integrations.Core.UploadFile({ file });
                video_url = result.file_url;
            }
            await base44.entities.LiveStream.update(stream.id, { status: 'posted', video_url });
            
            // Update existing "just went live" notifications to "was live" with replay link
            await base44.functions.invoke('updateLiveStreamNotifications', { streamId: stream.id });
            
            onPost();
        } finally {
            setUploading(false);
        }
    };

    const handleDiscard = async () => {
        await base44.entities.LiveStream.delete(stream.id);
        onDiscard();
    };

    return (
        <Dialog open={open} onOpenChange={() => {}}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="w-5 h-5 text-red-500" />
                        Your Live Has Ended
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground">
                        Would you like to post your live stream replay so followers can watch it?
                    </p>

                    {videoUrl ? (
                        <video
                            src={videoUrl}
                            controls
                            className="w-full rounded-lg max-h-64 bg-black"
                        />
                    ) : (
                        <div className="w-full rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center h-32 text-muted-foreground text-sm">
                            <Video className="w-6 h-6 mr-2 opacity-40" /> No recording available
                        </div>
                    )}
                </div>

                <DialogFooter className="flex gap-2 sm:justify-between">
                    <Button
                        variant="destructive"
                        onClick={handleDiscard}
                        disabled={uploading}
                        className="flex items-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" /> Discard
                    </Button>
                    <Button
                        onClick={handlePost}
                        disabled={uploading}
                        className="bg-red-500 hover:bg-red-600 text-white flex items-center gap-2"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        {uploading ? 'Posting...' : 'Post Replay'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}