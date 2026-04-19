import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import ReelCard from "@/components/reels/ReelCard";
import CreateReelDialog from "@/components/reels/CreateReelDialog";
import { useContentRecommender } from "@/components/ContentRecommender";
import { Loader2, PlusCircle, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Reels() {
  const [openDialog, setOpenDialog] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: blockedEmails = [] } = useQuery({
    queryKey: ['blocked_emails_reels', me?.email],
    queryFn: async () => {
      if (!me) return [];
      const blocks = await base44.entities.Block.filter({
        '$or': [{ blocker_email: me.email }, { blocked_email: me.email }]
      });
      return blocks.map(b => b.blocker_email === me.email ? b.blocked_email : b.blocker_email);
    },
    enabled: !!me,
  });

  const { data: friendEmails = [] } = useQuery({
    queryKey: ['friends_emails_reels', me?.email],
    queryFn: async () => {
      if (!me) return [];
      const friendRelations = await base44.entities.Friend.filter({
        '$or': [
          { requester_email: me.email, status: 'accepted' },
          { recipient_email: me.email, status: 'accepted' }
        ]
      });
      return friendRelations.map(f =>
        f.requester_email === me.email ? f.recipient_email : f.requester_email
      );
    },
    enabled: !!me,
  });

  const { data: allReels = [], isLoading: reelsLoading } = useQuery({
    queryKey: ["reels"],
    queryFn: () => base44.entities.Reel.list("-created_date", 20),
  });

  const reels = useMemo(() => {
    const blockedSet = new Set(blockedEmails);
    return allReels.filter(reel => !blockedSet.has(reel.created_by));
  }, [allReels, blockedEmails]);

  const { userInterests, friendsInterests } = useContentRecommender({ contentType: 'reel', me, friendEmails });

  const sortedReels = useMemo(() => {
    if (reels.length === 0) return reels;
    const interestedIds = new Set(
      userInterests.filter(i => i.content_type === 'reel' && i.is_interested).map(i => i.content_id)
    );
    const notInterestedIds = new Set(
      userInterests.filter(i => i.content_type === 'reel' && !i.is_interested).map(i => i.content_id)
    );
    const friendsInterestedIds = new Set(
      friendsInterests.filter(i => i.content_type === 'reel').map(i => i.content_id)
    );
    return [...reels].sort((a, b) => {
      const aI = interestedIds.has(a.id), bI = interestedIds.has(b.id);
      const aNotI = notInterestedIds.has(a.id), bNotI = notInterestedIds.has(b.id);
      const aF = friendsInterestedIds.has(a.id), bF = friendsInterestedIds.has(b.id);
      if (aI && !bI) return -1; if (!aI && bI) return 1;
      if (aNotI && !bNotI) return 1; if (!aNotI && bNotI) return -1;
      if (aF && !bF) return -1; if (!aF && bF) return 1;
      return 0;
    });
  }, [reels, userInterests, friendsInterests]);

  /* ── Full-screen snap-scroll reel feed ─────────────────── */
  return (
    <>
      {/* Fixed full-screen container — covers viewport, leaves desktop sidebar visible */}
      <div
        className="fixed inset-0 md:left-80 bg-black z-40"
        style={{ overflowY: 'scroll', scrollSnapType: 'y mandatory', overscrollBehavior: 'contain' }}
      >
        {reelsLoading ? (
          /* Loading */
          <div className="h-screen flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-white" />
          </div>
        ) : sortedReels.length === 0 ? (
          /* Empty state */
          <div className="h-screen flex flex-col items-center justify-center text-white gap-4 px-8 text-center">
            <Film className="w-16 h-16 opacity-30" />
            <p className="text-xl font-bold opacity-70">No reels yet</p>
            <p className="text-sm opacity-40">Be the first to share a reel with the community!</p>
            <Button
              onClick={() => setOpenDialog(true)}
              className="mt-2 bg-white text-black hover:bg-gray-100 font-semibold"
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Reel
            </Button>
          </div>
        ) : (
          /* Reel cards — each snaps to fill the full viewport */
          sortedReels.map(reel => (
            <div
              key={reel.id}
              style={{ height: '100vh', scrollSnapAlign: 'start', flexShrink: 0 }}
            >
              <ReelCard reel={reel} me={me} />
            </div>
          ))
        )}
      </div>

      {/* Floating top bar (visible over the reel feed) */}
      {!reelsLoading && (
        <div
          className="fixed top-0 left-0 right-0 md:left-80 z-50 flex items-center justify-between px-4 pt-4 pb-6 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
        >
          <span className="text-white font-bold text-lg tracking-wide pointer-events-none">Reels</span>
          <button
            onClick={() => setOpenDialog(true)}
            className="pointer-events-auto flex items-center gap-1.5 bg-white/20 backdrop-blur-md text-white text-sm font-semibold px-3 py-1.5 rounded-full border border-white/30 hover:bg-white/30 active:scale-95 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create
          </button>
        </div>
      )}

      <CreateReelDialog open={openDialog} onOpenChange={setOpenDialog} />
    </>
  );
}
