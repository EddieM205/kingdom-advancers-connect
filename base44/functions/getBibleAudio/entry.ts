// Sample audio URL (royalty-free, CORS-enabled)
const SAMPLE_AUDIO = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

Deno.serve(async (req) => {
  try {
    const { book, chapter } = await req.json();

    if (!book || !chapter) {
      return Response.json({ error: 'Missing book or chapter' }, { status: 400 });
    }

    // Return sample audio URL that's CORS-enabled and playable
    // In production, integrate with a real Bible audio API
    return Response.json({ audioUrl: SAMPLE_AUDIO });
  } catch (error) {
    return Response.json({ 
      audioUrl: null,
      error: 'Unable to fetch audio'
    }, { status: 500 });
  }
});