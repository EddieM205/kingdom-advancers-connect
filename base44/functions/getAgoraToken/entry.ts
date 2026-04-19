import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-token@2.0.4';

Deno.serve(async (req) => {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelName, uid } = await req.json();
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId) {
        return Response.json({ error: 'AGORA_APP_ID not set' }, { status: 500 });
    }

    // If no certificate is set, the app is in test mode — use null token
    if (!appCertificate) {
        return Response.json({ appId, token: null, channelName, uid });
    }

    // Generate a token valid for 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        RtcRole.PUBLISHER,
        privilegeExpiredTs,
        privilegeExpiredTs
    );

    return Response.json({ appId, token, channelName, uid });
});