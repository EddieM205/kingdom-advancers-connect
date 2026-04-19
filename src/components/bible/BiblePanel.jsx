import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, BookOpen, ChevronLeft, ChevronRight, X, Share2 } from 'lucide-react';

const bibleBooks = [
  "Genesis","Exodus","Leviticus","Numbers","Deuteronomy","Joshua","Judges","Ruth",
  "1 Samuel","2 Samuel","1 Kings","2 Kings","1 Chronicles","2 Chronicles","Ezra",
  "Nehemiah","Esther","Job","Psalms","Proverbs","Ecclesiastes","Song of Solomon",
  "Isaiah","Jeremiah","Lamentations","Ezekiel","Daniel","Hosea","Joel","Amos",
  "Obadiah","Jonah","Micah","Nahum","Habakkuk","Zephaniah","Haggai","Zechariah","Malachi",
  "Matthew","Mark","Luke","John","Acts","Romans","1 Corinthians","2 Corinthians",
  "Galatians","Ephesians","Philippians","Colossians","1 Thessalonians","2 Thessalonians",
  "1 Timothy","2 Timothy","Titus","Philemon","Hebrews","James","1 Peter","2 Peter",
  "1 John","2 John","3 John","Jude","Revelation"
];

export default function BiblePanel({ onClose, onShareScreen }) {
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(3);
  const [version, setVersion] = useState('KJV');
  const [shouldFetch, setShouldFetch] = useState(false);
  const [fetchKey, setFetchKey] = useState(0);

  const { data: verses, isLoading } = useQuery({
    queryKey: ['bible-panel', book, chapter, version, fetchKey],
    queryFn: async () => {
      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `Provide the full text of ${book} chapter ${chapter} from the ${version} Bible. Return JSON where keys are verse numbers as strings and values are the verse text strings.`,
        response_json_schema: { type: "object", additionalProperties: { type: "string" } }
      });
      return Object.entries(response).map(([v, t]) => ({ verse: parseInt(v), text: t })).sort((a, b) => a.verse - b.verse);
    },
    enabled: shouldFetch,
  });

  const handleLoad = () => { setShouldFetch(true); setFetchKey(k => k + 1); };
  const handlePrev = () => { if (chapter > 1) { setChapter(c => c - 1); setFetchKey(k => k + 1); } };
  const handleNext = () => { setChapter(c => c + 1); setFetchKey(k => k + 1); };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-400" />
          <span className="font-bold text-sm">Bible</span>
        </div>
        <div className="flex items-center gap-1">
          {onShareScreen && (
            <Button size="sm" variant="ghost" onClick={onShareScreen} className="text-blue-400 hover:text-blue-300 text-xs gap-1">
              <Share2 className="w-3.5 h-3.5" /> Share Screen
            </Button>
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 py-2 space-y-2 border-b border-gray-800 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          <Select value={book} onValueChange={setBook}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700 max-h-60">
              {bibleBooks.map(b => <SelectItem key={b} value={b} className="text-white text-xs">{b}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={version} onValueChange={setVersion}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {['KJV','NIV','NLT','ESV','NKJV','AMP'].map(v => (
                <SelectItem key={v} value={v} className="text-white text-xs">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Input
            type="number"
            value={chapter}
            onChange={e => setChapter(parseInt(e.target.value) || 1)}
            min="1"
            className="bg-gray-800 border-gray-700 text-white text-xs h-8 w-20"
            placeholder="Ch."
          />
          <Button onClick={handleLoad} disabled={isLoading} className="flex-1 h-8 bg-blue-600 hover:bg-blue-700 text-xs">
            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load'}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        )}
        {!isLoading && verses && (
          <>
            <h3 className="font-bold text-sm mb-3 text-gray-300">{book} {chapter} ({version})</h3>
            <div className="text-sm leading-7 text-gray-100 space-y-0.5">
              {verses.map(v => (
                <span key={v.verse} className="inline">
                  <sup className="text-blue-400 text-xs font-bold mr-0.5">{v.verse}</sup>
                  {v.text}{' '}
                </span>
              ))}
            </div>
          </>
        )}
        {!isLoading && !verses && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-8">
            <BookOpen className="w-8 h-8 opacity-30" />
            <p className="text-xs text-center">Select a book and chapter then press Load</p>
          </div>
        )}
      </div>

      {/* Chapter Nav */}
      {!!verses && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-gray-800 flex-shrink-0">
          <button onClick={handlePrev} disabled={chapter <= 1 || isLoading} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30">
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-xs text-gray-500">{book} {chapter}</span>
          <button onClick={handleNext} disabled={isLoading} className="flex items-center gap-1 text-xs text-gray-400 hover:text-white disabled:opacity-30">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
