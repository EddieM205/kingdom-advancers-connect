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

    // Fetch chapter from API
    const url = `https://bible.helloao.org/api/${translationId}/${bookId}/${chapterNumber}.json`;
    console.log('Fetching from URL:', url);
    const response = await fetch(url);
    console.log('Response status:', response.status);

    if (!response.ok) {
      console.log('API returned error status:', response.status);
      return Response.json({
        error: `Chapter not found for ${bookId} ${chapterNumber} in ${translationId}.`
      }, { status: 404 });
    }

    const text = await response.text();

    // Check if response is HTML (error)
    if (text.startsWith('<')) {
      return Response.json({
        error: `Chapter not found for ${bookId} ${chapterNumber} in ${translationId}.`
      }, { status: 404 });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return Response.json({ error: 'Invalid API response' }, { status: 400 });
    }

    // Extract verses from chapter content
    const verses = data.chapter?.content?.filter(item => item.type === 'verse') || [];
    
    // Create or update chapter in database
    const chapterKey = `${translationId}:${bookId}:${chapterNumber}`;
    const existing = await base44.entities.BibleChapter.filter({ 
      translationId, 
      bookId, 
      chapterNumber 
    });

    const chapterData = {
      translationId,
      bookId,
      chapterNumber,
      numberOfVerses: verses.length,
      content: data.chapter?.content || [],
      footnotes: data.chapter?.footnotes || [],
      nextChapterLink: data.nextChapterApiLink || null,
      previousChapterLink: data.previousChapterApiLink || null,
      audioLinks: data.thisChapterAudioLinks || {}
    };

    let chapterId;
    if (existing.length > 0) {
      await base44.entities.BibleChapter.update(existing[0].id, chapterData);
      chapterId = existing[0].id;
    } else {
      const created = await base44.entities.BibleChapter.create(chapterData);
      chapterId = created.id;
    }

    // Create individual verse records
    for (const verse of verses) {
      const verseText = verse.content
        .map(part => {
          if (typeof part === 'string') return part;
          if (part.text) return part.text;
          return '';
        })
        .join('');

      const isPoetry = verse.content.some(part => part.poem !== undefined);
      const isWordsOfJesus = verse.content.some(part => part.wordsOfJesus === true);
      const footnoteIds = verse.content
        .filter(part => part.noteId !== undefined)
        .map(part => part.noteId);

      const existingVerse = await base44.entities.BibleVerse.filter({
        translationId,
        bookId,
        chapterNumber,
        verseNumber: verse.number
      });

      const verseData = {
        translationId,
        bookId,
        chapterId,
        chapterNumber,
        verseNumber: verse.number,
        text: verseText,
        isPoetry,
        isWordsOfJesus,
        footnoteIds
      };

      if (existingVerse.length > 0) {
        await base44.entities.BibleVerse.update(existingVerse[0].id, verseData);
      } else {
        await base44.entities.BibleVerse.create(verseData);
      }
    }

    return Response.json({ 
      success: true,
      chapterId,
      versesCreated: verses.length
    });
  } catch (error) {
    console.error('Sync chapter error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});