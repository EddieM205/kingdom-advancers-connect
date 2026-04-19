import React from 'react';

const HIGHLIGHT_COLORS = {
  yellow: 'bg-yellow-300/25 border-l-2 border-yellow-400',
  blue:   'bg-blue-300/20 border-l-2 border-blue-400',
  green:  'bg-green-300/20 border-l-2 border-green-400',
  pink:   'bg-pink-300/20 border-l-2 border-pink-400',
  purple: 'bg-purple-300/20 border-l-2 border-purple-400',
};

export default function VerseDisplay({ verse, highlight, isSaved, isSelected, onSelect, fontSize = 18 }) {
  const highlightClass = highlight ? HIGHLIGHT_COLORS[highlight.color] : '';
  const selectedClass = isSelected ? 'bg-amber-400/15' : '';

  return (
    <span
      onClick={() => onSelect(verse.number)}
      className={`cursor-pointer inline rounded transition-colors px-0.5 ${highlightClass} ${selectedClass}`}
    >
      <sup
        className="text-amber-400 font-bold select-none mr-1"
        style={{ fontSize: Math.max(10, fontSize * 0.65) }}
      >
        {verse.number}
      </sup>
      <span style={{ fontSize }}>{verse.text}</span>
      {' '}
    </span>
  );
}
