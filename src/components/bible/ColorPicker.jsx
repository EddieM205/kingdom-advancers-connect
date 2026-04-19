import React from 'react';
import { X } from 'lucide-react';

const COLORS = [
  { id: 'yellow', bg: 'bg-yellow-300', label: 'Yellow' },
  { id: 'blue',   bg: 'bg-blue-400',   label: 'Blue' },
  { id: 'green',  bg: 'bg-green-400',  label: 'Green' },
  { id: 'pink',   bg: 'bg-pink-400',   label: 'Pink' },
  { id: 'purple', bg: 'bg-purple-400', label: 'Purple' },
];

export default function ColorPicker({ onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end" onClick={onCancel}>
      <div
        className="w-full bg-[#1c1c1e] rounded-t-2xl p-5 pb-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="text-white font-semibold text-base">Highlight color</p>
          <button onClick={onCancel} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center justify-around">
          {COLORS.map(color => (
            <button
              key={color.id}
              onClick={() => onSelect(color.id)}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-11 h-11 rounded-full ${color.bg} group-hover:scale-110 transition-transform shadow-lg`} />
              <span className="text-xs text-gray-400 group-hover:text-white transition-colors">{color.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
