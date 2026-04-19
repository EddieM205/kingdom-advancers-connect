import React, { useState } from 'react';
import { getErrorLog } from '@/lib/errorLogger';
import { ChevronDown, Copy, Trash2 } from 'lucide-react';

export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const logs = getErrorLog();

  if (logs.length === 0 && !isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(logs, null, 2));
  };

  const handleClear = () => {
    sessionStorage.removeItem('app_error_log');
    window.location.reload();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
      >
        {logs.length > 0 && <span className="inline-flex items-center justify-center w-5 h-5 bg-red-800 rounded-full text-xs">{logs.length}</span>}
        Debug
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 w-96 max-h-96 bg-slate-900 text-white rounded-lg shadow-lg border border-red-600 overflow-auto">
          <div className="sticky top-0 bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
            <span className="font-semibold text-sm">Error Logs ({logs.length})</span>
            <div className="flex gap-1">
              <button onClick={handleCopy} className="p-1 hover:bg-slate-700 rounded" title="Copy logs">
                <Copy className="w-4 h-4" />
              </button>
              <button onClick={handleClear} className="p-1 hover:bg-slate-700 rounded" title="Clear logs">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="p-3 space-y-2 text-xs">
            {logs.map((log, i) => (
              <div key={i} className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="font-semibold text-red-400">{log.context}</div>
                <div className="text-slate-300 mt-1">{log.message}</div>
                {log.stack && <div className="text-slate-500 text-[10px] mt-1 font-mono whitespace-pre-wrap break-words">{log.stack.split('\n').slice(0, 3).join('\n')}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}