import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let { book, chapter, version = 'en-kjv' } = await req.json();

    if (!book || !chapter) {
      return Response.json({ error: 'Missing book or chapter' }, { status: 400 });
    }

    // Normalize version format (KJV -> en-kjv, NIV -> en-niv, etc.)
    const versionKey = normalizeVersion(version);
    const bookKey = bookToKey(book);

    if (!bookKey) {
      return Response.json({ error: `Unknown book: ${book}` }, { status: 400 });
    }

    // Free Bible API - fetches verses
    const verses = await fetchFromFreeAPI(bookKey, chapter, versionKey);

    if (!verses || verses.length === 0) {
      return Response.json({
        verses: [{ number: 1, text: `No verses found for ${book} ${chapter}` }]
      });
    }

    return Response.json({ verses });
  } catch (error) {
    console.error('Bible API error:', error.message);
    return Response.json({
      verses: [{ number: 1, text: `Error: ${error.message}` }]
    });
  }
});

async function fetchFromFreeAPI(bookKey, chapter, version) {
  try {
    // Use raw GitHub URL for better reliability
    const url = `https://raw.githubusercontent.com/wldeh/bible-api/main/bibles/${version}/books/${bookKey}/chapters/${chapter}.json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      // Fallback to CDN
      const cdnUrl = `https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/${version}/books/${bookKey}/chapters/${chapter}.json`;
      const cdnResponse = await fetch(cdnUrl);
      if (!cdnResponse.ok) return null;
      const data = await cdnResponse.json();
      return parseFreeBibleAPI(data);
    }
    
    const data = await response.json();
    return parseFreeBibleAPI(data);
  } catch (error) {
    console.error('Free Bible API error:', error.message);
    return null;
  }
}

function parseFreeBibleAPI(data) {
  if (!data || !data.data || data.data.length === 0) return [];
  
  const versesMap = {};
  
  // Group verses by verse number
  data.data.forEach(item => {
    const verseNum = parseInt(item.verse);
    if (!versesMap[verseNum]) {
      versesMap[verseNum] = item.text;
    }
  });
  
  // Convert to array and sort by verse number
  const verses = Object.keys(versesMap)
    .map(num => ({
      number: parseInt(num),
      text: versesMap[num]
    }))
    .sort((a, b) => a.number - b.number);
  
  return verses;
}

function normalizeVersion(version) {
  // Map common version names to API format
  const versionMap = {
    'kjv': 'en-kjv',
    'niv': 'en-niv',
    'nlt': 'en-nlt',
    'amp': 'en-amp',
    'asv': 'en-asv',
    'nkjv': 'en-nkjv',
    'esv': 'en-esv',
    'en-kjv': 'en-kjv',
    'en-niv': 'en-niv',
    'en-nlt': 'en-nlt',
    'en-amp': 'en-amp',
    'en-asv': 'en-asv',
    'en-nkjv': 'en-nkjv',
    'en-esv': 'en-esv'
  };
  return versionMap[version.toLowerCase()] || 'en-kjv';
}

function bookToKey(book) {
  // Convert book name to API key format (lowercase with hyphens)
  const bookMap = {
    'genesis': 'genesis',
    'exodus': 'exodus',
    'leviticus': 'leviticus',
    'numbers': 'numbers',
    'deuteronomy': 'deuteronomy',
    'joshua': 'joshua',
    'judges': 'judges',
    'ruth': 'ruth',
    '1 samuel': '1-samuel',
    '1samuel': '1-samuel',
    '2 samuel': '2-samuel',
    '2samuel': '2-samuel',
    '1 kings': '1-kings',
    '1kings': '1-kings',
    '2 kings': '2-kings',
    '2kings': '2-kings',
    '1 chronicles': '1-chronicles',
    '1chronicles': '1-chronicles',
    '2 chronicles': '2-chronicles',
    '2chronicles': '2-chronicles',
    'ezra': 'ezra',
    'nehemiah': 'nehemiah',
    'esther': 'esther',
    'job': 'job',
    'psalms': 'psalms',
    'proverbs': 'proverbs',
    'ecclesiastes': 'ecclesiastes',
    'isaiah': 'isaiah',
    'jeremiah': 'jeremiah',
    'lamentations': 'lamentations',
    'ezekiel': 'ezekiel',
    'daniel': 'daniel',
    'hosea': 'hosea',
    'joel': 'joel',
    'amos': 'amos',
    'obadiah': 'obadiah',
    'jonah': 'jonah',
    'micah': 'micah',
    'nahum': 'nahum',
    'habakkuk': 'habakkuk',
    'zephaniah': 'zephaniah',
    'haggai': 'haggai',
    'zechariah': 'zechariah',
    'malachi': 'malachi',
    'matthew': 'matthew',
    'mark': 'mark',
    'luke': 'luke',
    'john': 'john',
    'acts': 'acts',
    'romans': 'romans',
    '1 corinthians': '1-corinthians',
    '1corinthians': '1-corinthians',
    '2 corinthians': '2-corinthians',
    '2corinthians': '2-corinthians',
    'galatians': 'galatians',
    'ephesians': 'ephesians',
    'philippians': 'philippians',
    'colossians': 'colossians',
    '1 thessalonians': '1-thessalonians',
    '1thessalonians': '1-thessalonians',
    '2 thessalonians': '2-thessalonians',
    '2thessalonians': '2-thessalonians',
    '1 timothy': '1-timothy',
    '1timothy': '1-timothy',
    '2 timothy': '2-timothy',
    '2timothy': '2-timothy',
    'titus': 'titus',
    'philemon': 'philemon',
    'hebrews': 'hebrews',
    'james': 'james',
    '1 peter': '1-peter',
    '1peter': '1-peter',
    '2 peter': '2-peter',
    '2peter': '2-peter',
    '1 john': '1-john',
    '1john': '1-john',
    '2 john': '2-john',
    '2john': '2-john',
    '3 john': '3-john',
    '3john': '3-john',
    'jude': 'jude',
    'revelation': 'revelation'
  };
  return bookMap[book.toLowerCase()] || null;
}