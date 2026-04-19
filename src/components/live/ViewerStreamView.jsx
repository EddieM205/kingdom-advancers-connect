import { Button } from '@/components/ui/button';

export default function ViewerStreamView({ stream, me, onLeave }) {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 p-6">
      <div className="flex items-center gap-2 bg-red-600 px-4 py-2 rounded-full">
        <span className="font-bold">LIVE</span>
      </div>
      <h1 className="text-2xl font-bold text-center">{stream.title}</h1>
      <p className="text-gray-400 text-sm">Hosted by {stream.host_name}</p>
      <Button onClick={onLeave} variant="outline" className="mt-4">
        Leave Stream
      </Button>
    </div>
  );
}