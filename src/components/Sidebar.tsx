'use client';

import { useState, useEffect } from 'react';
import { 
  Folder, 
  Tag, 
  Plus, 
  Search, 
  ChevronDown, 
  ChevronRight,
  FileText,
  Settings,
  Moon,
  Sun,
  Network,
  List,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useNotesStore } from '@/lib/store';
import clsx from 'clsx';

interface SidebarProps {
  folders: string[];
  tags: string[];
  onNewNote: () => void;
}

export function Sidebar({ folders, tags, onNewNote }: SidebarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [foldersOpen, setFoldersOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  
  const { 
    selectedFolder, 
    setSelectedFolder,
    selectedTags,
    setSelectedTags,
    viewMode,
    setViewMode,
    sidebarOpen,
    toggleSidebar,
    notes
  } = useNotesStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Count notes per folder
  const folderCounts = folders.reduce((acc, folder) => {
    acc[folder] = notes.filter((n) => n.folder === folder).length;
    return acc;
  }, {} as Record<string, number>);

  // Count notes per tag
  const tagCounts = tags.reduce((acc, tag) => {
    acc[tag] = notes.filter((n) => n.tags.includes(tag)).length;
    return acc;
  }, {} as Record<string, number>);

  if (!sidebarOpen) {
    return (
      <div className="w-12 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col items-center py-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
          title="Open Sidebar"
        >
          <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-64 h-full bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Digital Garden
          </h1>
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title="Close Sidebar"
          >
            <PanelLeftClose className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        {/* New Note Button */}
        <button
          onClick={onNewNote}
          className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {/* View Mode Toggle */}
      <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex gap-1 p-1 bg-gray-200 dark:bg-gray-800 rounded-lg">
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm transition-colors',
              viewMode === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <List className="w-4 h-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('graph')}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm transition-colors',
              viewMode === 'graph'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            )}
          >
            <Network className="w-4 h-4" />
            Graph
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        {/* All Notes */}
        <button
          onClick={() => setSelectedFolder(null)}
          className={clsx(
            'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
            selectedFolder === null
              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
          )}
        >
          <FileText className="w-4 h-4" />
          All Notes
          <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">
            {notes.length}
          </span>
        </button>

        {/* Folders Section */}
        <div className="mt-4">
          <button
            onClick={() => setFoldersOpen(!foldersOpen)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider"
          >
            {foldersOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Folders
          </button>
          
          {foldersOpen && (
            <div className="mt-1 space-y-0.5">
              {folders.map((folder) => (
                <button
                  key={folder}
                  onClick={() => setSelectedFolder(folder)}
                  className={clsx(
                    'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                    selectedFolder === folder
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Folder className="w-4 h-4" />
                  {folder}
                  <span className="ml-auto text-xs text-gray-500 dark:text-gray-500">
                    {folderCounts[folder] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags Section */}
        <div className="mt-4">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="w-full flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-gray-500 dark:text-gray-500 uppercase tracking-wider"
          >
            {tagsOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Tags
          </button>
          
          {tagsOpen && (
            <div className="mt-1 flex flex-wrap gap-1.5 px-3">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-colors',
                    selectedTags.includes(tag)
                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  <Tag className="w-3 h-3" />
                  {tag}
                  <span className="text-gray-500 dark:text-gray-500">
                    {tagCounts[tag] || 0}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors"
            title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        )}
        <button className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    </aside>
  );
}
