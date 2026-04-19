import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  ChevronLeft, ChevronRight, ChevronDown, Search, Bookmark,
  Highlighter, Share2, Send, X, Loader2, BookOpen, Minus, Plus,
  Trash2, Copy
} from 'lucide-react';
import VerseDisplay from '@/components/bible/VerseDisplay';
import ColorPicker from '@/components/bible/ColorPicker';
import CreateVersePostDialog from '@/components/bible/CreateVersePostDialog';

// ─── Data ────────────────────────────────────────────────────────────────────

const BOOKS = [
  'Genesis','Exodus','Leviticus','Numbers','Deuteronomy','Joshua','Judges','Ruth',
  '1 Samuel','2 Samuel','1 Kings','2 Kings','1 Chronicles','2 Chronicles','Ezra',
  'Nehemiah','Esther','Job','Psalms','Proverbs','Ecclesiastes','Isaiah','Jeremiah',
  'Lamentations','Ezekiel','Daniel','Hosea','Joel','Amos','Obadiah','Jonah','Micah',
  'Nahum','Habakkuk','Zephaniah','Haggai','Zechariah','Malachi',
  'Matthew','Mark','Luke','John','Acts','Romans','1 Corinthians','2 Corinthians',
  'Galatians','Ephesians','Philippians','Colossians','1 Thessalonians','2 Thessalonians',
  '1 Timothy','2 Timothy','Titus','Philemon','Hebrews','James','1 Peter','2 Peter',
  '1 John','2 John','3 John','Jude','Revelation',
];

const OT = BOOKS.slice(0, 39);
const NT = BOOKS.slice(39);

const VOTD = {
  ref: 'John 3:16',
  text: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
};

const VERSIONS_INITIAL = [
  { id: 'en-kjv', name: 'KJV', full: 'King James Version' },
  { id: 'en-asv', name: 'ASV', full: 'American Standard Version' },
  { id: 'en-web', name: 'WEB', full: 'World English Bible' },
  { id: 'en-ylt', name: 'YLT', full: "Young's Literal Translation" },
];

// ─── BookChapterPicker ───────────────────────────────────────────────────────

function BookChapterPicker({ currentBook, currentChapter, onSelect, onClose }) {
  const [step, setStep] = useState('book'); // 'book' | 'chapter'
  const [selectedBook, setSelectedBook] = useState(currentBook);
  const [chapterCount] = useState(150);

  const pickBook = (b) => {
    setSelectedBook(b);
    setStep('chapter');
  };

  const pickChapter = (c) => {
    onSelect(selectedBook, c);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {step === 'chapter' ? (
          <button onClick={() => setStep('book')} className="flex items-center gap-1 text-amber-400 text-sm font-medium">
            <ChevronLeft className="w-4 h-4" /> Books
          </button>
        ) : (
          <span className="text-white font-semibold text-base">Choose Book</span>
        )}
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
          <X className="w-5 h-5" />
        </button>
      </div>

      {step === 'book' ? (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">Old Testament</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-6">
            {OT.map(b => (
              <button
                key={b}
                onClick={() => pickBook(b)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  b === currentBook
                    ? 'bg-amber-500 text-black'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">New Testament</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pb-6">
            {NT.map(b => (
              <button
                key={b}
                onClick={() => pickBook(b)}
                className={`text-left px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                  b === currentBook
                    ? 'bg-amber-500 text-black'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-3">
          <p className="text-white font-semibold text-lg mb-4">{selectedBook}</p>
          <div className="grid grid-cols-5 sm:grid-cols-8 gap-2 pb-6">
            {Array.from({ length: chapterCount }, (_, i) => i + 1).map(c => (
              <button
                key={c}
                onClick={() => pickChapter(c)}
                className={`aspect-square rounded-xl text-sm font-semibold transition ${
                  selectedBook === currentBook && c === currentChapter
                    ? 'bg-amber-500 text-black'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VersionPicker ───────────────────────────────────────────────────────────

function VersionPicker({ versions, current, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = versions.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.full?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <span className="text-white font-semibold text-base">Bible Version</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1"><X className="w-5 h-5" /></button>
      </div>
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search versions..."
            className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-gray-500"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered.map(v => (
          <button
            key={v.id}
            onClick={() => { onSelect(v.id); onClose(); }}
            className={`w-full flex items-center justify-between px-4 py-4 border-b border-white/5 hover:bg-white/5 transition ${
              v.id === current ? 'bg-amber-500/10' : ''
            }`}
          >
            <div className="text-left">
              <p className={`font-bold text-sm ${v.id === current ? 'text-amber-400' : 'text-white'}`}>{v.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{v.full || v.id}</p>
            </div>
            {v.id === current && <div className="w-2 h-2 rounded-full bg-amber-400" />}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Floating Verse Action Bar ────────────────────────────────────────────────

function VerseActionBar({ verse, book, chapter, version, isSaved, isHighlighted, onHighlight, onRemoveHighlight, onSave, onShare, onPost, onCopy, onClose }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:left-80">
      <div className="bg-[#1c1c1e] border-t border-white/10 px-4 py-3 pb-safe flex items-center gap-1"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {/* Verse ref */}
        <span className="text-amber-400 text-xs font-bold mr-2 flex-shrink-0">
          {book} {chapter}:{verse}
        </span>

        <div className="flex items-center gap-1 ml-auto">
          <ActionBtn icon={<Highlighter className="w-5 h-5" />} label={isHighlighted ? 'Highlight' : 'Highlight'} active={isHighlighted} activeColor="text-amber-400" onClick={onHighlight} />
          {isHighlighted && <ActionBtn icon={<X className="w-4 h-4" />} label="Remove" onClick={onRemoveHighlight} />}
          <ActionBtn icon={<Bookmark className={`w-5 h-5 ${isSaved ? 'fill-amber-400 text-amber-400' : ''}`} />} label={isSaved ? 'Saved' : 'Save'} active={isSaved} activeColor="text-amber-400" onClick={onSave} />
          <ActionBtn icon={<Copy className="w-5 h-5" />} label="Copy" onClick={onCopy} />
          <ActionBtn icon={<Share2 className="w-5 h-5" />} label="Share" onClick={onShare} />
          <ActionBtn icon={<Send className="w-5 h-5" />} label="Post" onClick={onPost} />
          <button
            onClick={onClose}
            className="flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
            <span className="text-[9px]">Close</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ icon, label, active, activeColor = 'text-white', onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition hover:bg-white/10 ${active ? activeColor : 'text-gray-300 hover:text-white'}`}
    >
      {icon}
      <span className="text-[9px] leading-none">{label}</span>
    </button>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Bible() {
  const queryClient = useQueryClient();
  const [view, setView] = useState('home');
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(3);
  const [version, setVersion] = useState('en-kjv');
  const [searchInput, setSearchInput] = useState('');
  const [fontSize, setFontSize] = useState(18);
  const [showBookPicker, setShowBookPicker] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showVersePostDialog, setShowVersePostDialog] = useState(null);
  const [selectedVerse, setSelectedVerse] = useState(null);
  const contentRef = useRef(null);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: allVersions = VERSIONS_INITIAL } = useQuery({
    queryKey: ['bibleVersions'],
    queryFn: async () => {
      const r = await base44.functions.invoke('getBibleVersions', {});
      return r.data?.versions || VERSIONS_INITIAL;
    },
  });

  const getVersionName = (id) => allVersions.find(v => v.id === id)?.name || id;

  const { data: savedVerses = [], refetch: refetchSavedVerses } = useQuery({
    queryKey: ['savedVerses', me?.email],
    queryFn: () => base44.entities.SavedVerse.list(),
    enabled: !!me,
    staleTime: 0,
  });

  const { data: allHighlights = [], refetch: refetchHighlights } = useQuery({
    queryKey: ['highlights', me?.email],
    queryFn: () => base44.entities.Highlight.list(),
    enabled: !!me,
  });

  const highlights = allHighlights.filter(h => h.book === book && h.chapter === chapter);

  const { data: readingProgress } = useQuery({
    queryKey: ['readingProgress', me?.email],
    queryFn: () => base44.entities.ReadingProgress.filter({ user_email: me?.email }),
    enabled: !!me,
  });

  const { data: versesData, isLoading: versesLoading } = useQuery({
    queryKey: ['chapter', book, chapter, version],
    queryFn: async () => {
      const r = await base44.functions.invoke('getBibleVerse', { book, chapter, version });
      return r.data;
    },
    enabled: view === 'read',
  });

  const verses = versesData?.verses || [];

  // Load reading progress on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pBook = params.get('book');
    const pChapter = params.get('chapter');
    if (pBook && pChapter) {
      setBook(pBook); setChapter(parseInt(pChapter)); setView('read');
    }
  }, []);

  useEffect(() => {
    if (me && readingProgress?.length > 0 && view === 'home') {
      const l = readingProgress[0];
      setBook(l.book); setChapter(l.chapter);
    }
  }, [me, readingProgress]);

  // Auto-save progress
  const saveProgressMutation = useMutation({
    mutationFn: (p) => {
      const ex = readingProgress?.find(x => x.book === p.book);
      return ex ? base44.entities.ReadingProgress.update(ex.id, p) : base44.entities.ReadingProgress.create(p);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['readingProgress'] }),
  });

  useEffect(() => {
    if (me && view === 'read') {
      const t = setTimeout(() => saveProgressMutation.mutate({ book, chapter, user_email: me.email, last_read: new Date().toISOString() }), 1500);
      return () => clearTimeout(t);
    }
  }, [book, chapter, view, me]);

  const highlightMutation = useMutation({
    mutationFn: async ({ verseId, verseNum, text, color }) => {
      const ex = allHighlights.find(h => h.verseId === verseId);
      if (ex) return base44.entities.Highlight.update(ex.id, { color });
      return base44.entities.Highlight.create({ verseId, book, chapter, verse: verseNum, text, color, user_email: me.email });
    },
    onSuccess: () => { setShowColorPicker(false); setSelectedVerse(null); queryClient.invalidateQueries({ queryKey: ['highlights'] }); },
  });

  const removeHighlightMutation = useMutation({
    mutationFn: (verseId) => {
      const h = allHighlights.find(x => x.verseId === verseId);
      if (h) return base44.entities.Highlight.delete(h.id);
    },
    onSuccess: () => { setSelectedVerse(null); queryClient.invalidateQueries({ queryKey: ['highlights'] }); },
  });

  const saveVerseMutation = useMutation({
    mutationFn: async ({ book: b, chapter: c, verse, text }) => {
      const ref = `${b} ${c}:${verse}`;
      const ex = savedVerses.find(v => v.reference === ref);
      if (ex) return base44.entities.SavedVerse.delete(ex.id);
      return base44.entities.SavedVerse.create({ reference: ref, text, version });
    },
    onSuccess: () => { setSelectedVerse(null); queryClient.invalidateQueries({ queryKey: ['savedVerses'] }); refetchSavedVerses(); },
  });

  const handleSearch = (e) => {
    e.preventDefault();
    const input = searchInput.toLowerCase().trim();
    if (!input) return;
    const match = input.match(/^([a-z0-9\s]+)\s(\d+)(?::(\d+))?$/i);
    if (match) {
      const bookName = match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      setBook(bookName); setChapter(parseInt(match[2])); setView('read'); setSearchInput('');
    }
  };

  const handleCopy = useCallback(async (verseNum) => {
    const v = verses.find(x => x.number === verseNum);
    if (!v) return;
    const text = `${book} ${chapter}:${verseNum} (${getVersionName(version)})\n\n"${v.text}"`;
    await navigator.clipboard.writeText(text).catch(() => {});
    setSelectedVerse(null);
  }, [verses, book, chapter, version]);

  const handleShare = useCallback(async (verseNum) => {
    const v = verses.find(x => x.number === verseNum);
    if (!v) return;
    const text = `${book} ${chapter}:${verseNum}\n\n"${v.text}"\n\n— ${getVersionName(version)}`;
    if (navigator.share) {
      try { await navigator.share({ title: `${book} ${chapter}:${verseNum}`, text }); } catch {}
    } else {
      await navigator.clipboard.writeText(text).catch(() => {});
    }
    setSelectedVerse(null);
  }, [verses, book, chapter, version]);

  const isSavedVOTD = savedVerses.some(v => v.reference === VOTD.ref);

  // ─── READER VIEW ────────────────────────────────────────────────────────────
  if (view === 'read') {
    const selectedVerseObj = selectedVerse != null ? verses.find(v => v.number === selectedVerse) : null;
    const selectedVerseId = selectedVerse != null ? `${book.toLowerCase()}_${chapter}_${selectedVerse}` : null;
    const selectedHighlight = selectedVerseId ? allHighlights.find(h => h.verseId === selectedVerseId) : null;
    const selectedIsSaved = selectedVerse != null ? savedVerses.some(v => v.reference === `${book} ${chapter}:${selectedVerse}`) : false;

    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col" style={{ paddingBottom: selectedVerse != null ? '80px' : '0' }}>

        {/* Color Picker overlay */}
        {showColorPicker && selectedVerseId && (
          <ColorPicker
            onSelect={(color) => {
              const v = verses.find(x => x.number === selectedVerse);
              if (v) highlightMutation.mutate({ verseId: selectedVerseId, verseNum: selectedVerse, text: v.text, color });
            }}
            onCancel={() => setShowColorPicker(false)}
          />
        )}

        {/* Post dialog */}
        {showVersePostDialog && (
          <CreateVersePostDialog
            verse={showVersePostDialog}
            book={book}
            chapter={chapter}
            version={getVersionName(version)}
            onClose={() => setShowVersePostDialog(null)}
          />
        )}

        {/* Reader Header */}
        <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/10">
          <div className="flex items-center gap-2 px-3 py-3">
            <button onClick={() => { setView('home'); setSelectedVerse(null); }} className="p-2 rounded-lg hover:bg-white/10 transition text-gray-300 flex-shrink-0">
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Book + Chapter picker trigger */}
            <button
              onClick={() => setShowBookPicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition flex-1 min-w-0"
            >
              <span className="font-bold text-white text-sm truncate">{book} {chapter}</span>
              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>

            {/* Version picker trigger */}
            <button
              onClick={() => setShowVersionPicker(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 transition flex-shrink-0"
            >
              <span className="text-amber-400 font-bold text-sm">{getVersionName(version)}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>

            {/* Font size */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setFontSize(s => Math.max(14, s - 2))} className="p-1.5 rounded-lg hover:bg-white/10 transition text-gray-400">
                <Minus className="w-4 h-4" />
              </button>
              <button onClick={() => setFontSize(s => Math.min(28, s + 2))} className="p-1.5 rounded-lg hover:bg-white/10 transition text-gray-400">
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {showBookPicker && (
          <BookChapterPicker
            currentBook={book}
            currentChapter={chapter}
            onSelect={(b, c) => { setBook(b); setChapter(c); setSelectedVerse(null); contentRef.current?.scrollTo(0, 0); }}
            onClose={() => setShowBookPicker(false)}
          />
        )}

        {showVersionPicker && (
          <VersionPicker
            versions={allVersions}
            current={version}
            onSelect={setVersion}
            onClose={() => setShowVersionPicker(false)}
          />
        )}

        {/* Verses */}
        <div ref={contentRef} className="flex-1 px-4 sm:px-8 md:px-16 lg:px-24 py-8 max-w-3xl mx-auto w-full">
          {versesLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white/20 mb-8 text-center tracking-wide">{book.toUpperCase()} {chapter}</h1>
              <p className="leading-[2] font-serif text-white/90" style={{ fontSize }}>
                {verses.map(verse => {
                  const verseId = `${book.toLowerCase()}_${chapter}_${verse.number}`;
                  const highlight = highlights.find(h => h.verseId === verseId);
                  const isSaved = savedVerses.some(v => v.reference === `${book} ${chapter}:${verse.number}`);
                  return (
                    <VerseDisplay
                      key={verse.number}
                      verse={verse}
                      highlight={highlight}
                      isSaved={isSaved}
                      isSelected={selectedVerse === verse.number}
                      onSelect={(num) => setSelectedVerse(prev => prev === num ? null : num)}
                      fontSize={fontSize}
                    />
                  );
                })}
              </p>
            </>
          )}

          {/* Chapter nav */}
          <div className="flex items-center justify-between mt-16 mb-8">
            <button
              onClick={() => { if (chapter > 1) { setChapter(c => c - 1); setSelectedVerse(null); contentRef.current?.scrollTo(0, 0); } }}
              disabled={chapter <= 1}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 transition text-white disabled:opacity-30 text-sm font-medium"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>
            <span className="text-gray-500 text-xs">{book} {chapter}</span>
            <button
              onClick={() => { setChapter(c => c + 1); setSelectedVerse(null); contentRef.current?.scrollTo(0, 0); }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 transition text-white text-sm font-medium"
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Floating action bar when verse selected */}
        {selectedVerse != null && selectedVerseObj && (
          <VerseActionBar
            verse={selectedVerse}
            book={book}
            chapter={chapter}
            version={getVersionName(version)}
            isSaved={selectedIsSaved}
            isHighlighted={!!selectedHighlight}
            onHighlight={() => setShowColorPicker(true)}
            onRemoveHighlight={() => removeHighlightMutation.mutate(selectedVerseId)}
            onSave={() => saveVerseMutation.mutate({ book, chapter, verse: selectedVerse, text: selectedVerseObj.text })}
            onCopy={() => handleCopy(selectedVerse)}
            onShare={() => handleShare(selectedVerse)}
            onPost={() => { setShowVersePostDialog({ number: selectedVerse, text: selectedVerseObj.text }); setSelectedVerse(null); }}
            onClose={() => setSelectedVerse(null)}
          />
        )}
      </div>
    );
  }

  // ─── HOME VIEW ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white pb-28">

      {showBookPicker && (
        <BookChapterPicker
          currentBook={book}
          currentChapter={chapter}
          onSelect={(b, c) => { setBook(b); setChapter(c); setView('read'); }}
          onClose={() => setShowBookPicker(false)}
        />
      )}

      {showVersionPicker && (
        <VersionPicker
          versions={allVersions}
          current={version}
          onSelect={setVersion}
          onClose={() => setShowVersionPicker(false)}
        />
      )}

      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">Welcome back</p>
            <h1 className="text-2xl font-bold text-white">Bible</h1>
          </div>
          <button
            onClick={() => setShowVersionPicker(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">{getVersionName(version)}</span>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-4 py-3">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search — e.g. John 3:16 or Psalms 23"
              className="bg-transparent text-white text-sm flex-1 focus:outline-none placeholder-gray-500"
            />
          </div>
        </form>

        {/* Verse of the Day */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-900/60 via-orange-900/40 to-purple-900/60 border border-amber-500/20">
          <div className="px-5 pt-5 pb-6 space-y-3">
            <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest">✦ Verse of the Day</p>
            <p className="text-white text-xl font-bold leading-snug">{VOTD.ref}</p>
            <p className="text-white/80 text-sm leading-relaxed">"{VOTD.text}"</p>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => { setBook('John'); setChapter(3); setView('read'); }}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm transition"
              >
                Read Chapter
              </button>
              <button
                onClick={() => saveVerseMutation.mutate({ book: 'John', chapter: 3, verse: 16, text: VOTD.text })}
                disabled={saveVerseMutation.isPending}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition ${isSavedVOTD ? 'bg-white/10 text-amber-400' : 'bg-white/10 text-white hover:bg-white/20'}`}
              >
                {isSavedVOTD ? '✓ Saved' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Continue Reading */}
        {readingProgress && readingProgress.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Continue Reading</h2>
            <button
              onClick={() => { const l = readingProgress[0]; setBook(l.book); setChapter(l.chapter); setView('read'); }}
              className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl p-4 transition border border-white/10"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-black" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-bold text-white">{readingProgress[0].book} {readingProgress[0].chapter}</p>
                <p className="text-xs text-gray-400 mt-0.5">{getVersionName(version)} · Tap to continue</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
            </button>
          </div>
        )}

        {/* Browse Books */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Browse</h2>
          <button
            onClick={() => setShowBookPicker(true)}
            className="w-full flex items-center gap-4 bg-white/5 hover:bg-white/10 rounded-2xl p-4 transition border border-white/10"
          >
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="text-left flex-1">
              <p className="font-bold text-white">All Books</p>
              <p className="text-xs text-gray-400 mt-0.5">Old & New Testament · 66 books</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
          </button>
        </div>

        {/* Quick Access — OT & NT */}
        <div>
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3">Popular Books</h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {['Psalms','Proverbs','Isaiah','Matthew','John','Romans','Revelation','Genesis'].map(b => (
              <button
                key={b}
                onClick={() => { setBook(b); setChapter(1); setView('read'); }}
                className="py-3 px-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition text-center"
              >
                <p className="text-white text-xs font-semibold truncate">{b}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Saved Verses */}
        {savedVerses.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-amber-400" />
              Saved Verses
            </h2>
            <div className="space-y-2">
              {savedVerses.map(v => (
                <SavedVerseCard
                  key={v.id}
                  verse={v}
                  onRead={() => {
                    const m = v.reference?.match(/^(.+?)\s(\d+):(\d+)$/);
                    if (m) { setBook(m[1]); setChapter(parseInt(m[2])); setView('read'); }
                  }}
                  onRemove={() => base44.entities.SavedVerse.delete(v.id).then(() => queryClient.invalidateQueries({ queryKey: ['savedVerses'] }))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SavedVerseCard({ verse, onRead, onRemove }) {
  return (
    <div className="bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-3">
        <p className="text-amber-400 text-xs font-bold uppercase tracking-wide mb-2">{verse.reference}</p>
        <p className="text-white/80 text-sm leading-relaxed line-clamp-3">"{verse.text}"</p>
        {verse.version && <p className="text-gray-500 text-xs mt-2">{verse.version.toUpperCase()}</p>}
      </div>
      <div className="flex border-t border-white/10">
        <button
          onClick={onRead}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-amber-400 hover:bg-white/5 transition"
        >
          <BookOpen className="w-3.5 h-3.5" /> Read
        </button>
        <div className="w-px bg-white/10" />
        <button
          onClick={onRemove}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold text-gray-400 hover:bg-white/5 hover:text-red-400 transition"
        >
          <Trash2 className="w-3.5 h-3.5" /> Remove
        </button>
      </div>
    </div>
  );
}
