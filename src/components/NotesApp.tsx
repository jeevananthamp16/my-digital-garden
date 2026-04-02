'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { NoteList } from '@/components/NoteList';
import { NoteEditor } from '@/components/NoteEditor';
import { GraphView } from '@/components/GraphView';
import { useNotesStore } from '@/lib/store';
import { Note } from '@/lib/notion';
import { Loader2 } from 'lucide-react';

export default function NotesApp() {
  const [folders, setFolders] = useState<string[]>(['Inbox']);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  const { 
    setNotes, 
    addNote, 
    updateNoteInStore, 
    removeNote,
    viewMode,
    sidebarOpen,
  } = useNotesStore();

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [notesRes, foldersRes, tagsRes] = await Promise.all([
          fetch('/api/notes'),
          fetch('/api/folders'),
          fetch('/api/tags'),
        ]);

        const [notes, fetchedFolders, fetchedTags] = await Promise.all([
          notesRes.json(),
          foldersRes.json(),
          tagsRes.json(),
        ]);

        setNotes(notes);
        setFolders(fetchedFolders.length > 0 ? fetchedFolders : ['Inbox']);
        setTags(fetchedTags);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [setNotes]);

  // Create new note
  const handleNewNote = async () => {
    try {
      const response = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Untitled',
          content: '',
          folder: 'Inbox',
          tags: [],
          isPublic: false,
        }),
      });
      
      const note = await response.json();
      addNote(note);
    } catch (error) {
      console.error('Error creating note:', error);
    }
  };

  // Save note
  const handleSave = async (updates: Partial<Note>) => {
    const selectedNote = useNotesStore.getState().getSelectedNote();
    if (!selectedNote) return;
    
    try {
      await fetch(`/api/notes/${selectedNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      updateNoteInStore(selectedNote.id, updates);
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  };

  // Delete note
  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      removeNote(id);
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-lg">Loading your notes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <Sidebar 
        folders={folders} 
        tags={tags} 
        onNewNote={handleNewNote} 
      />

      {/* Main Content */}
      {viewMode === 'list' ? (
        <>
          {/* Note List */}
          <NoteList />
          
          {/* Note Editor */}
          <NoteEditor
            folders={folders}
            tags={tags}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </>
      ) : (
        /* Graph View */
        <GraphView />
      )}
    </div>
  );
}
