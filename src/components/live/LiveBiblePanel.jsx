import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const BOOKS = [
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
  'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel',
  'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah',
  'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah',
  'Haggai', 'Zechariah', 'Malachi', 'Matthew', 'Mark',
  'Luke', 'John', 'Acts', 'Romans', '1 Corinthians',
  '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus',
  'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
  '1 John', '2 John', '3 John', 'Jude', 'Revelation',
];

export default function LiveBiblePanel({ streamId, onClose, onDisplayVerse, onStopDisplaying }) {
  const [selectedBook, setSelectedBook] = useState('John');
  const [selectedChapter, setSelectedChapter] = useState(1);
  const [selectedVersion, setSelectedVersion] = useState('KJV');

  const { data: chapter, isLoading } = useQuery({
    queryKey: ['bible-chapter', selectedBook, selectedChapter, selectedVersion],
    queryFn: async () => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Get the text of ${selectedBook} chapter ${selectedChapter} from the ${selectedVersion} Bible version. Return it as plain text with verse numbers.`,
        });
        return result;
      } catch {
        return null;
      }
    },
  });

  const maxChapters = {
    'Genesis': 50, 'Exodus': 40, 'Leviticus': 27, 'Numbers': 36,
    'Deuteronomy': 34, 'Joshua': 24, 'Judges': 21, 'Ruth': 4,
    'Psalms': 150, 'Proverbs': 31, 'Matthew': 28, 'Mark': 16,
    'Luke': 24, 'John': 21, 'Romans': 16, '1 Corinthians': 16,
    'Revelation': 22,
  };

  const currentMaxChapter = maxChapters[selectedBook] || 40;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border space-y-2">
        <h3 className="font-semibold text-sm">Bible</h3>
        <div className="space-y-1.5">
          <Select value={selectedBook} onValueChange={setSelectedBook}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKS.map((book) => (
                <SelectItem key={book} value={book} className="text-xs">
                  {book}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedChapter(Math.max(1, selectedChapter - 1))}
              disabled={selectedChapter === 1}
            >
              <ChevronLeft className="w-3 h-3" />
            </Button>
            <Select value={String(selectedChapter)} onValueChange={(v) => setSelectedChapter(Number(v))}>
              <SelectTrigger className="h-7 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: currentMaxChapter }, (_, i) => i + 1).map((ch) => (
                  <SelectItem key={ch} value={String(ch)} className="text-xs">
                    Chapter {ch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => setSelectedChapter(Math.min(currentMaxChapter, selectedChapter + 1))}
              disabled={selectedChapter === currentMaxChapter}
            >
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>

          <Select value={selectedVersion} onValueChange={setSelectedVersion}>
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="KJV" className="text-xs">KJV</SelectItem>
              <SelectItem value="NIV" className="text-xs">NIV</SelectItem>
              <SelectItem value="NKJV" className="text-xs">NKJV</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-4 text-xs text-muted-foreground">Loading...</div>
        ) : chapter ? (
          <div className="text-xs leading-relaxed whitespace-pre-wrap">{chapter}</div>
        ) : (
          <div className="text-center py-4 text-xs text-muted-foreground">Unable to load Bible text</div>
        )}
      </div>
    </div>
  );
}