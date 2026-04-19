import { Button } from '@/components/ui/button';
import { RadioTower } from 'lucide-react';

export default function HostBroadcastView({ stream, me, onEnd }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full">
        <RadioTower className="w-4 h-4 animate-pulse" />
        <span className="font-bold">LIVE</span>
      </div>
      <h1 className="text-2xl font-bold text-center">{stream.title}</h1>
      <p className="text-gray-400 text-sm">You are broadcasting</p>
      <Button onClick={onEnd} variant="destructive" className="mt-4">
        End Stream
      </Button>
    </div>
  );
}