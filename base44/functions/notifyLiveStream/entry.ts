import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { stream_id, stream_title } = await req.json();

        // Get user's friends and followers
        const friends = await base44.entities.Friend.filter({
            $or: [
                { requester_email: user.email, status: 'accepted' },
                { recipient_email: user.email, status: 'accepted' }
            ]
        });

        const followers = await base44.entities.Follow.filter({
            following_email: user.email
        });

        // Collect unique recipient emails
        const recipientEmails = new Set();
        friends.forEach(f => {
            if (f.requester_email === user.email) {
                recipientEmails.add(f.recipient_email);
            } else {
                recipientEmails.add(f.requester_email);
            }
        });
        followers.forEach(f => recipientEmails.add(f.follower_email));

        // Create notifications for each friend/follower
        const notifications = Array.from(recipientEmails).map(email => ({
            recipient_id: email,
            content: `📹 ${user.full_name} is going live: ${stream_title}`,
            link: `/LiveStreams?stream=${stream_id}`
        }));

        if (notifications.length > 0) {
            await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
        }

        return Response.json({ success: true, notified: notifications.length });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});