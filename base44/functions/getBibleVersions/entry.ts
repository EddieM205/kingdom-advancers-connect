import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Return supported versions (verified available in wldeh/bible-api)
    const versions = [
      { id: 'en-kjv', name: 'KJV' },
      { id: 'en-asv', name: 'ASV' },
      { id: 'en-web', name: 'Web' },
      { id: 'en-ylt', name: 'YLT' }
    ];

    return Response.json({ versions });
  } catch (error) {
    console.error('Bible versions fetch error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});