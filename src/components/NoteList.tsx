'use client';

import { Search, FileText, Globe, Lock } from 'lucide-react';
import { useNotesStore } from '@/lib/store';
import clsx from 'clsx';
import { formatDistanceToNow } from '@/lib/utils';

export function NoteList() {
  const { 
    searchQuery, 
    setSearchQuery, 
    selectedNoteId, 
    selectNote,
    getFilteredNotes 
  } = useNotesStore();

  const notes = getFilteredNotes();

  return (
    <div className="w-80 h-full bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-blue-500 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 outline-none transition-colors"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-700 mb-4" />
            <p className="text-gray-500 dark:text-gray-500">
              {searchQuery ? 'No notes found' : 'No notes yet'}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
              {searchQuery ? 'Try a different search' : 'Create your first note'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {notes.map((note) => (
              <button
                key={note.id}
                onClick={() => selectNote(note.id)}
                className={clsx(
                  'w-full text-left p-4 transition-colors',
                  selectedNoteId === note.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'
                )}
              >
                <div className="flex items-start gap-3">
                  <FileText className="w-4 h-4 mt-0.5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {note.title}
                      </h3>
                      {note.isPublic ? (
                        <Globe className="w-3 h-3 text-green-500 flex-shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500 line-clamp-2 mt-1">
                      {note.content.slice(0, 100) || 'Empty note'}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-400 dark:text-gray-600">
                        {formatDistanceToNow(note.updatedAt)}
                      </span>
                      {note.tags.length > 0 && (
                        <>
                          <span className="text-gray-300 dark:text-gray-700">•</span>
                          <div className="flex gap-1">
                            {note.tags.slice(0, 2).map((tag) => (
                              <span
                                key={tag}
                                className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                              >
                                {tag}
                              </span>
                            ))}
                            {note.tags.length > 2 && (
                              <span className="text-xs text-gray-400">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
