'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Note } from '@/lib/notion';
import MarkdownPreview from '@uiw/react-markdown-preview';
import remarkBreaks from 'remark-breaks';

// Dynamically import the graph component to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-gray-400">
      Loading graph...
    </div>
  ),
});

type View = 'list' | 'graph';
type Theme = 'light' | 'dark';

export default function PublicNotesApp() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [activeView, setActiveView] = useState<View>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({
    nodes: [],
    links: [],
  });
  const [theme, setTheme] = useState<Theme>('dark');

  // Load notes from public API
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch('/api/public/notes');
        if (res.ok) {
          const data = await res.json();
          setNotes(data);
        }
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchNotes();
  }, []);

  // Load graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const res = await fetch('/api/public/graph');
        if (res.ok) {
          const data = await res.json();
          setGraphData(data);
        }
      } catch (error) {
        console.error('Error fetching graph data:', error);
      }
    };
    if (activeView === 'graph') {
      fetchGraphData();
    }
  }, [activeView]);

  // Get unique folders and tags
  const folders = [...new Set(notes.map((n) => n.folder))];
  const tags = [...new Set(notes.flatMap((n) => n.tags))];

  // Filter notes
  const filteredNotes = notes.filter((note) => {
    const matchesSearch =
      !searchQuery ||
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFolder = !selectedFolder || note.folder === selectedFolder;
    const matchesTag = !selectedTag || note.tags.includes(selectedTag);

    return matchesSearch && matchesFolder && matchesTag;
  });

  const handleGraphNodeClick = (node: any) => {
    const note = notes.find((n) => n.id === node.id);
    if (note) {
      setSelectedNote(note);
      setActiveView('list');
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-xl">Loading notes...</div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex overflow-hidden ${
        theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'
      }`}
    >
      {/* Sidebar */}
      <div
        className={`w-64 flex-shrink-0 ${
          theme === 'dark'
            ? 'bg-gray-800 border-gray-700'
            : 'bg-gray-100 border-gray-200'
        } border-r flex flex-col`}
      >
        {/* Logo and Title */}
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold flex items-center gap-2">
            🌿 Digital Garden
          </h1>
          <p className="text-xs text-gray-400 mt-1">Public Notes</p>
        </div>

        {/* Search */}
        <div className="p-3">
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 border-gray-600 focus:border-green-500'
                : 'bg-white border-gray-300 focus:border-green-600'
            } border focus:outline-none`}
          />
        </div>

        {/* View Switcher */}
        <div className="px-3 pb-3">
          <div
            className={`flex rounded-lg p-1 ${
              theme === 'dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}
          >
            <button
              onClick={() => setActiveView('list')}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${
                activeView === 'list'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              📋 List
            </button>
            <button
              onClick={() => setActiveView('graph')}
              className={`flex-1 py-1.5 text-sm rounded-md transition ${
                activeView === 'graph'
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              🔗 Graph
            </button>
          </div>
        </div>

        {/* Folders */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Folders
          </h3>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                !selectedFolder
                  ? 'bg-green-600/20 text-green-400'
                  : 'hover:bg-gray-700'
              }`}
            >
              📁 All Notes ({notes.length})
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${
                  selectedFolder === folder
                    ? 'bg-green-600/20 text-green-400'
                    : 'hover:bg-gray-700'
                }`}
              >
                📂 {folder} ({notes.filter((n) => n.folder === folder).length})
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
            Tags
          </h3>
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() =>
                  setSelectedTag(selectedTag === tag ? null : tag)
                }
                className={`px-2 py-0.5 rounded-full text-xs ${
                  selectedTag === tag
                    ? 'bg-green-600 text-white'
                    : theme === 'dark'
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="mt-auto p-3 border-t border-gray-700">
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className={`w-full py-2 rounded-lg text-sm ${
              theme === 'dark'
                ? 'bg-gray-700 hover:bg-gray-600'
                : 'bg-gray-200 hover:bg-gray-300'
            }`}
          >
            {theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 h-full overflow-hidden">
        {activeView === 'list' ? (
          <>
            {/* Notes List */}
            <div
              className={`w-72 flex-shrink-0 border-r ${
                theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
              } overflow-y-auto min-h-0`}
            >
              <div className="p-3 border-b border-gray-700">
                <h2 className="text-sm font-semibold text-gray-400">
                  {selectedFolder || 'All Notes'}{' '}
                  <span className="text-gray-500">
                    ({filteredNotes.length})
                  </span>
                </h2>
              </div>
              <div className="divide-y divide-gray-700">
                {filteredNotes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setSelectedNote(note)}
                    className={`w-full text-left p-3 hover:bg-gray-800 transition ${
                      selectedNote?.id === note.id ? 'bg-gray-800' : ''
                    }`}
                  >
                    <h3 className="font-medium truncate">{note.title}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                      {note.content.slice(0, 100)}...
                    </p>
                    <div className="flex gap-1 mt-2">
                      {note.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </button>
                ))}
                {filteredNotes.length === 0 && (
                  <div className="p-4 text-center text-gray-500">
                    No public notes found
                  </div>
                )}
              </div>
            </div>

            {/* Note Content (Read-only) */}
            <div className="flex-1 overflow-y-auto min-h-0 h-full">
              {selectedNote ? (
                <div className="p-6 max-w-4xl mx-auto pb-20">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-3">
                      {selectedNote.title}
                    </h1>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span>📂 {selectedNote.folder}</span>
                      <span>
                        Last updated:{' '}
                        {new Date(selectedNote.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex gap-2 mt-3">
                      {selectedNote.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-green-600/20 text-green-400 rounded-full text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    className={`prose max-w-none ${
                      theme === 'dark' ? 'prose-invert' : ''
                    }`}
                    data-color-mode={theme}
                  >
                    <MarkdownPreview
                      source={selectedNote.content}
                      remarkPlugins={[remarkBreaks]}
                      style={{
                        backgroundColor: 'transparent',
                        color: 'inherit',
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-6xl mb-4">🌿</p>
                    <p className="text-xl">Select a note to read</p>
                    <p className="text-sm mt-2">
                      Explore the digital garden
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Graph View */
          <div className="flex-1 relative">
            <ForceGraph2D
              graphData={graphData}
              nodeLabel="name"
              nodeColor={(node: any) => {
                const colors: Record<string, string> = {
                  Inbox: '#3b82f6',
                  Projects: '#22c55e',
                  Archive: '#6b7280',
                  Ideas: '#f59e0b',
                };
                return colors[node.folder] || '#8b5cf6';
              }}
              nodeVal={(node: any) => node.val}
              linkColor={() => (theme === 'dark' ? '#4b5563' : '#d1d5db')}
              backgroundColor={theme === 'dark' ? '#111827' : '#ffffff'}
              onNodeClick={handleGraphNodeClick}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.name;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px Sans-Serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillStyle = theme === 'dark' ? '#ffffff' : '#111827';
                ctx.fillText(label, node.x, node.y + 10);
              }}
            />
            <div
              className={`absolute top-4 left-4 p-3 rounded-lg ${
                theme === 'dark' ? 'bg-gray-800' : 'bg-white shadow-lg'
              }`}
            >
              <h3 className="font-semibold mb-2">Graph Legend</h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <span>Inbox</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <span>Projects</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                  <span>Ideas</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                  <span>Archive</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
