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
      return Response.json({ error: 'streamId is required' }, { status: 400 });
    }

    // Get the posted stream
    const stream = await base44.entities.LiveStream.get(streamId);
    
    if (!stream || stream.status !== 'posted') {
      return Response.json({ error: 'Stream not found or not posted' }, { status: 400 });
    }

    // Find and update notifications from this stream
    const notifications = await base44.entities.Notification.filter({
      content: { '$contains': `🔴 ${stream.host_name || stream.host_email} just went live` }
    });

    const updatePromises = notifications.map(notif =>
      base44.entities.Notification.update(notif.id, {
        content: `🎬 ${stream.host_name || stream.host_email} was live: "${stream.title}" — watch the replay!`,
        link: `/LiveStreams`
      })
    );

    await Promise.all(updatePromises);

    return Response.json({ 
      success: true, 
      updatedCount: updatePromises.length 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});