import React from "react";
import { Film } from "lucide-react";

export default function FeedPage() {
    return (
        <div className="container mx-auto p-3 sm:p-4 md:p-8 text-center text-muted-foreground pb-24 sm:pb-8">
            <Film className="w-16 h-16 mx-auto mb-4 stroke-1" />
            <h2 className="text-2xl font-semibold text-foreground">Stories</h2>
            <p className="mt-2">Browse stories from the community in the reel above.</p>
        </div>
    );
}