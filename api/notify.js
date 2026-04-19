// Vercel Serverless Function — proxies push notifications to OneSignal
// Environment variables required on Vercel:
//   ONESIGNAL_APP_ID
//   ONESIGNAL_REST_API_KEY

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { targetEmail, title, body, url } = req.body || {};

  if (!targetEmail || !title) {
    return res.status(400).json({ error: 'targetEmail and title are required' });
  }

  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return res.status(500).json({ error: 'Push notifications not configured' });
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: 'push',
        filters: [{ field: 'external_user_id', value: targetEmail }],
        headings: { en: title },
        contents: { en: body || '' },
        url: url || '/',
        web_url: url || '/',
        chrome_web_icon: '/favicon.ico',
        firefox_icon: '/favicon.ico',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', data);
      return res.status(502).json({ error: 'OneSignal request failed', details: data });
    }

    return res.status(200).json({ ok: true, id: data.id });
  } catch (err) {
    console.error('notify handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
