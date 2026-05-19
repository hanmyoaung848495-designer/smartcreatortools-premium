
import React, { useState } from 'react';
import { toast } from 'sonner';
import { StoredResult, FeatureType } from '../types';
import { Card, Button } from './Shared';

interface Props {
  results: StoredResult[];
  activeType?: FeatureType;
  onDelete: (id: string) => void;
  onClearAll?: () => void;
  onCopy: (content: string) => void;
  onDownload: (result: StoredResult) => void;
}

const PersistentResults: React.FC<Props> = ({ results, activeType, onDelete, onClearAll, onCopy, onDownload }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredResults = activeType 
    ? results.filter(r => r.type === activeType) 
    : results;

  if (filteredResults.length === 0) return null;

  const handleDelete = (id: string) => {
    toast('Delete this record?', {
      description: 'This action cannot be undone.',
      action: {
        label: 'Delete',
        onClick: () => {
          onDelete(id);
          toast.success('Record deleted');
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {},
      },
      style: { borderRadius: '1rem' }
    });
  };

  return (
    <div className="mt-12 space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 pb-4 gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🕒</span> Recent {activeType ? 'Results' : 'Activity'}
          </h3>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md">
            {filteredResults.length} Items
          </span>
        </div>
        
        {onClearAll && (
          <Button 
            variant="ghost" 
            onClick={onClearAll} 
            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50"
          >
            🗑️ Clear All History
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {filteredResults.map((result) => (
          <Card key={result.id} className="border border-gray-100 hover:border-indigo-100 transition-all shadow-sm">
            <div className="p-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">
                    {result.type === 'transcribe' ? '🎙️' : 
                     result.type === 'translate' ? '🌐' : 
                     result.type === 'video-generator' ? '🎥' : 
                     result.type === 'srt-translate' ? '🎞️' : 
                     result.type === 'text-to-srt' ? '📄' : '📝'}
                  </div>
                  <div className="truncate max-w-[200px] sm:max-w-md">
                    <h4 className="font-bold text-gray-900 leading-tight truncate">{result.title}</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      {new Date(result.timestamp).toLocaleString()} • <span className="text-indigo-500">{result.type.replace('-', ' ')}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-2 md:mt-0 shrink-0">
                  <Button variant="ghost" onClick={() => onCopy(result.content)} className="text-[10px] font-bold h-7 px-2.5 uppercase tracking-tighter whitespace-nowrap">
                    📋 Copy
                  </Button>
                  <Button variant="secondary" onClick={() => onDownload(result)} className="text-[10px] font-bold h-7 px-2.5 uppercase tracking-tighter whitespace-nowrap">
                    💾 Save
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => setExpandedId(expandedId === result.id ? null : result.id)} 
                    className="text-[10px] font-bold h-7 px-2.5 uppercase tracking-tighter whitespace-nowrap"
                  >
                    {expandedId === result.id ? '🔼 Hide' : '🔽 View'}
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => handleDelete(result.id)} 
                    className="text-[10px] font-bold h-7 px-2.5 uppercase tracking-tighter text-red-500 hover:bg-red-50 whitespace-nowrap"
                  >
                    🗑️ Delete
                  </Button>
                </div>
              </div>

              {expandedId === result.id && (
                <div className="mt-4 p-4 bg-slate-900 text-slate-300 rounded-xl font-mono text-xs overflow-auto max-h-[300px] leading-relaxed animate-in slide-in-from-top-2">
                  {result.content}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PersistentResults;
