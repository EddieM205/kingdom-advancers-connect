import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch available translations from the API
    const response = await fetch('https://bible.helloao.org/api/available_translations.json');
    const data = await response.json();
    
    if (!data.translations) {
      return Response.json({ error: 'Invalid API response' }, { status: 400 });
    }

    // Sync each translation to the database
    const syncedTranslations = [];
    for (const translation of data.translations) {
      const translationData = {
        id: translation.id,
        name: translation.name,
        englishName: translation.englishName,
        shortName: translation.shortName,
        website: translation.website,
        licenseUrl: translation.licenseUrl,
        language: translation.language,
        languageName: translation.languageName,
        languageEnglishName: translation.languageEnglishName,
        textDirection: translation.textDirection,
        numberOfBooks: translation.numberOfBooks,
        totalNumberOfChapters: translation.totalNumberOfChapters,
        totalNumberOfVerses: translation.totalNumberOfVerses
      };

      // Check if translation already exists
      const existing = await base44.entities.BibleTranslation.filter({ id: translation.id });
      
      if (existing.length === 0) {
        await base44.entities.BibleTranslation.create(translationData);
        syncedTranslations.push(translation.id);
      }
    }

    return Response.json({ 
      synced: syncedTranslations.length,
      translations: syncedTranslations
    });
  } catch (error) {
    console.error('Sync translations error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});