import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { streamId } = await req.json();

    if (!streamId) {
      return Response.json({ error: 'Stream ID required' }, { status: 400 });
    }

    const stream = await base44.entities.LiveStream.get(streamId);

    if (!stream) {
      return Response.json({ error: 'Stream not found' }, { status: 404 });
    }

    // Only host or admin can end a stream
    if (stream.host_email !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    await base44.entities.LiveStream.update(streamId, { status: 'ended' });

    return Response.json({ success: true, message: 'Stream ended successfully' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});