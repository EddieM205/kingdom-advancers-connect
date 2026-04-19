import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioTower, Loader2, Play, Users, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import HostLiveView from '@/components/live/HostLiveView';
import ViewerLiveView from '@/components/live/ViewerLiveView';

export default function LiveStreams() {
  const queryClient = useQueryClient();
  const [showGoLiveDialog, setShowGoLiveDialog] = useState(false);
  const [streamTitle, setStreamTitle] = useState('');
  const [activeStream, setActiveStream] = useState(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['live-streams'],
    queryFn: async () => {
      const streams = await base44.entities.LiveStream.filter({ status: 'live' }, '-created_date', 50);
      const now = new Date();
      return streams.filter((stream) => {
        const diffHours = (now - new Date(stream.created_date)) / (1000 * 60 * 60);
        if (diffHours > 12) {
          base44.entities.LiveStream.update(stream.id, { status: 'ended' }).catch(() => {});
          return false;
        }
        return true;
      });
    },
    refetchInterval: 5000,
  });

  const createStreamMutation = useMutation({
    mutationFn: async () => {
      if (!me) throw new Error('Not authenticated');
      return base44.entities.LiveStream.create({
        title: streamTitle.trim(),
        host_email: me.email,
        host_name: me.full_name,
        host_avatar: me.avatar_url || '',
        status: 'live',
        viewer_count: 0,
        room_id: `live_${Date.now()}_${me.email.replace(/[^a-z0-9]/gi, '')}`,
      });
    },
    onSuccess: (newStream) => {
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
      setShowGoLiveDialog(false);
      setStreamTitle('');
      setActiveStream(newStream);
      setIsBroadcasting(true);
    },
  });

  const handleEndStream = async () => {
    if (activeStream) {
      await base44.entities.LiveStream.update(activeStream.id, { status: 'ended' }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['live-streams'] });
    }
    setActiveStream(null);
    setIsBroadcasting(false);
  };

  // Host view
  if (isBroadcasting && activeStream) {
    return <HostLiveView stream={activeStream} me={me} onEnd={handleEndStream} />;
  }

  // Viewer view
  if (activeStream && !isBroadcasting) {
    return (
      <ViewerLiveView
        stream={activeStream}
        me={me}
        onLeave={() => setActiveStream(null)}
      />
    );
  }

  return (
    <div className="w-full min-h-screen pb-20 sm:pb-0">
      <div className="container mx-auto max-w-6xl px-3 sm:px-4 md:px-8 py-4 md:py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <RadioTower className="w-6 h-6 text-red-500" />
            <h1 className="text-3xl font-bold">Live Streams</h1>
          </div>
          <Button
            onClick={() => setShowGoLiveDialog(true)}
            className="bg-red-600 hover:bg-red-700"
            disabled={!me}
          >
            <RadioTower className="w-4 h-4 mr-2" />
            Go Live
          </Button>
        </div>

        {/* Go Live dialog */}
        <Dialog open={showGoLiveDialog} onOpenChange={setShowGoLiveDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Start a Live Stream</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="stream-title">What are you sharing today?</Label>
                <Input
                  id="stream-title"
                  placeholder="e.g. Morning devotion, Bible study…"
                  value={streamTitle}
                  onChange={(e) => setStreamTitle(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && streamTitle.trim() && createStreamMutation.mutate()}
                  maxLength={100}
                  autoFocus
                />
              </div>
              <Button
                onClick={() => createStreamMutation.mutate()}
                disabled={!streamTitle.trim() || createStreamMutation.isPending || !me}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                {createStreamMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Starting…
                  </>
                ) : (
                  <>
                    <RadioTower className="w-4 h-4 mr-2" />
                    Go Live
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Stream list */}
        {liveStreams.length > 0 ? (
          <div>
            <h2 className="text-xl font-bold mb-4">Currently Live</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveStreams.map((stream) => (
                <div
                  key={stream.id}
                  className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-red-500 transition-all hover:shadow-lg"
                >
                  <button
                    onClick={() => { setActiveStream(stream); setIsBroadcasting(false); }}
                    className="w-full text-left"
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-gradient-to-br from-gray-900 to-black relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      {/* LIVE badge */}
                      <div className="absolute top-3 left-3 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 z-10">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                        </span>
                        LIVE
                      </div>
                      <Play className="w-10 h-10 text-red-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <h3 className="font-bold text-base mb-2 line-clamp-2 group-hover:text-red-600 transition-colors">
                        {stream.title}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={stream.host_avatar} />
                          <AvatarFallback>{stream.host_name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">{stream.host_name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {stream.viewer_count || 0} watching
                        </span>
                        {stream.total_reactions > 0 && (
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3 text-red-400" />
                            {stream.total_reactions >= 1000
                              ? `${(stream.total_reactions / 1000).toFixed(1)}K`
                              : stream.total_reactions} reactions
                          </span>
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Host: end stream button */}
                  {me?.email === stream.host_email && (
                    <div className="px-4 pb-4">
                      <Button
                        onClick={async () => {
                          await base44.entities.LiveStream.update(stream.id, { status: 'ended' }).catch(() => {});
                          queryClient.invalidateQueries({ queryKey: ['live-streams'] });
                        }}
                        variant="destructive"
                        size="sm"
                        className="w-full"
                      >
                        End Stream
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <RadioTower className="w-14 h-14 mx-auto mb-4 opacity-40" />
            <p className="text-lg font-medium mb-1">No live streams right now</p>
            <p className="text-sm">Be the first to go live and share with the community!</p>
          </div>
        )}
      </div>
    </div>
  );
}
