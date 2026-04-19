import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to the main Posts feed page
    navigate(createPageUrl('Posts'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading your feed...</p>
      </div>
    </div>
  );
}