import { useState, useCallback } from 'react';

/**
 * Hook to manage verse sharing in calls
 * Handles:
 * - Selecting and sharing verses
 * - Broadcasting to all participants
 * - Managing shared verse state
 */
export function useVerseSharing() {
  const [sharedVerse, setSharedVerse] = useState(null);
  const [verseHistory, setVerseHistory] = useState([]);

  // Share a verse with all call participants
  const shareVerse = useCallback((verse) => {
    if (!verse || !verse.reference || !verse.text) return false;

    const sharedData = {
      ...verse,
      sharedAt: new Date().toISOString(),
      id: `${verse.reference}-${Date.now()}`
    };

    setSharedVerse(sharedData);
    setVerseHistory(prev => [sharedData, ...prev].slice(0, 10)); // Keep last 10
    return true;
  }, []);

  // Clear current shared verse
  const clearSharedVerse = useCallback(() => {
    setSharedVerse(null);
  }, []);

  // Get verse to display (current shared or from history)
  const getDisplayVerse = useCallback(() => {
    return sharedVerse;
  }, [sharedVerse]);

  return {
    sharedVerse,
    verseHistory,
    shareVerse,
    clearSharedVerse,
    getDisplayVerse,
  };
}