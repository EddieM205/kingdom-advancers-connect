import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { Play } from 'lucide-react';

export default function MediaGallery({ onSelectStream }) {
  const { data: streams = [], isLoading } = useQuery({
    queryKey: ['posted-streams'],
    queryFn: async () => {
      try {
        return await base44.entities.LiveStream.filter(
          { status: 'posted' },
          '-created_date',
          12
        );
      } catch {
        return [];
      }
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="aspect-video" />
        ))}
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No past streams yet. Start a live stream to create replays!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {streams.map((stream) => (
        <Card
          key={stream.id}
          onClick={() => onSelectStream(stream)}
          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
        >
          <CardContent className="p-0">
            <div className="aspect-video bg-black relative group">
              {stream.thumbnail_url ? (
                <img
                  src={stream.thumbnail_url}
                  alt={stream.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-900">
                  <Play className="w-12 h-12 text-gray-500" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>
            <div className="p-3">
              <h3 className="font-semibold line-clamp-2">{stream.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{stream.host_name}</p>
              {stream.stream_start_time && (
                <p className="text-xs text-muted-foreground mt-1">
                  {format(new Date(stream.stream_start_time), 'MMM d, yyyy')}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}