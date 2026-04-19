import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { translationId, bookId, chapterNumber } = await req.json();

    if (!translationId || !bookId || !chapterNumber) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // First try to get from database
    const chapters = await base44.entities.BibleChapter.filter({
      translationId,
      bookId,
      chapterNumber
    });

    if (chapters.length > 0) {
      const chapter = chapters[0];
      
      // Get all verses for this chapter
      const verses = await base44.entities.BibleVerse.filter({
        translationId,
        bookId,
        chapterNumber
      }, 'verseNumber', 999);

      return Response.json({
        chapter: {
          ...chapter,
          verses: verses
        },
        fromCache: true
      });
    }

    // If not in database, sync it first
    const syncResponse = await base44.functions.invoke('syncBibleChapter', {
      translationId,
      bookId,
      chapterNumber
    });

    if (!syncResponse.data.success) {
      return Response.json({ error: 'Failed to sync chapter' }, { status: 400 });
    }

    // Now fetch from database
    const synced = await base44.entities.BibleChapter.filter({
      translationId,
      bookId,
      chapterNumber
    });

    const verses = await base44.entities.BibleVerse.filter({
      translationId,
      bookId,
      chapterNumber
    }, 'verseNumber', 999);

    return Response.json({
      chapter: {
        ...synced[0],
        verses
      },
      fromCache: false
    });
  } catch (error) {
    console.error('Get chapter error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});