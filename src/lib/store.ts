import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Note } from './notion';

interface NotesState {
  notes: Note[];
  selectedNoteId: string | null;
  selectedFolder: string | null;
  selectedTags: string[];
  searchQuery: string;
  isEditing: boolean;
  viewMode: 'list' | 'graph';
  sidebarOpen: boolean;
  
  // Actions
  setNotes: (notes: Note[]) => void;
  addNote: (note: Note) => void;
  updateNoteInStore: (id: string, updates: Partial<Note>) => void;
  removeNote: (id: string) => void;
  selectNote: (id: string | null) => void;
  setSelectedFolder: (folder: string | null) => void;
  setSelectedTags: (tags: string[]) => void;
  setSearchQuery: (query: string) => void;
  setIsEditing: (editing: boolean) => void;
  setViewMode: (mode: 'list' | 'graph') => void;
  toggleSidebar: () => void;
  
  // Computed
  getFilteredNotes: () => Note[];
  getSelectedNote: () => Note | null;
}

export const useNotesStore = create<NotesState>()(
  persist(
    (set, get) => ({
      notes: [],
      selectedNoteId: null,
      selectedFolder: null,
      selectedTags: [],
      searchQuery: '',
      isEditing: false,
      viewMode: 'list',
      sidebarOpen: true,

      setNotes: (notes) => set({ notes }),
      
      addNote: (note) => set((state) => ({ 
        notes: [note, ...state.notes],
        selectedNoteId: note.id,
        isEditing: true,
      })),
      
      updateNoteInStore: (id, updates) => set((state) => ({
        notes: state.notes.map((note) =>
          note.id === id ? { ...note, ...updates } : note
        ),
      })),
      
      removeNote: (id) => set((state) => ({
        notes: state.notes.filter((note) => note.id !== id),
        selectedNoteId: state.selectedNoteId === id ? null : state.selectedNoteId,
      })),
      
      selectNote: (id) => set({ selectedNoteId: id, isEditing: false }),
      
      setSelectedFolder: (folder) => set({ selectedFolder: folder }),
      
      setSelectedTags: (tags) => set({ selectedTags: tags }),
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      setIsEditing: (editing) => set({ isEditing: editing }),
      
      setViewMode: (mode) => set({ viewMode: mode }),
      
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      getFilteredNotes: () => {
        const { notes, selectedFolder, selectedTags, searchQuery } = get();
        return notes.filter((note) => {
          // Filter by folder
          if (selectedFolder && note.folder !== selectedFolder) return false;
          
          // Filter by tags (all selected tags must be present)
          if (selectedTags.length > 0) {
            const hasAllTags = selectedTags.every((tag) => note.tags.includes(tag));
            if (!hasAllTags) return false;
          }
          
          // Filter by search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesTitle = note.title.toLowerCase().includes(query);
            const matchesContent = note.content.toLowerCase().includes(query);
            const matchesTags = note.tags.some((tag) => 
              tag.toLowerCase().includes(query)
            );
            if (!matchesTitle && !matchesContent && !matchesTags) return false;
          }
          
          return true;
        });
      },
      
      getSelectedNote: () => {
        const { notes, selectedNoteId } = get();
        return notes.find((note) => note.id === selectedNoteId) || null;
      },
    }),
    {
      name: 'notes-storage',
      partialize: (state) => ({
        selectedFolder: state.selectedFolder,
        viewMode: state.viewMode,
        sidebarOpen: state.sidebarOpen,
      }),
    }
  )
);

// Theme store
interface ThemeState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
    }
  )
);
