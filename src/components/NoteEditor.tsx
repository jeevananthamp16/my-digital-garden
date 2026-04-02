'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import {
  Save,
  Trash2,
  Folder,
  Tag,
  Globe,
  Lock,
  X,
  Plus,
  Edit3,
  Eye,
} from 'lucide-react';
import { useNotesStore } from '@/lib/store';
import { Note } from '@/lib/notion';
import { debounce } from '@/lib/utils';
import clsx from 'clsx';

// Dynamic import for MDEditor to avoid SSR issues
const MDEditor = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default),
  { ssr: false }
);

// Dynamic import for MDEditor Markdown preview
const MarkdownPreview = dynamic(
  () => import('@uiw/react-md-editor').then((mod) => mod.default.Markdown),
  { ssr: false }
);

interface NoteEditorProps {
  folders: string[];
  tags: string[];
  onSave: (note: Partial<Note>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function NoteEditor({ folders, tags, onSave, onDelete }: NoteEditorProps) {
  const { getSelectedNote, isEditing, setIsEditing, updateNoteInStore } = useNotesStore();
  const note = getSelectedNote();
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('Inbox');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Load note data when selection changes
  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setFolder(note.folder);
      setSelectedTags(note.tags);
      setIsPublic(note.isPublic);
    } else {
      setTitle('');
      setContent('');
      setFolder('Inbox');
      setSelectedTags([]);
      setIsPublic(false);
    }
  }, [note?.id]);

  // Auto-save with debounce
  const debouncedSave = useCallback(
    debounce(async (updates: Partial<Note>) => {
      if (!note) return;
      setIsSaving(true);
      try {
        await onSave(updates);
        updateNoteInStore(note.id, updates);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [note?.id, onSave]
  );

  // Handle content changes with auto-save
  const handleContentChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    if (note && isEditing) {
      debouncedSave({ content: newContent });
    }
  };

  // Handle title changes
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (note && isEditing) {
      debouncedSave({ title: newTitle });
    }
  };

  // Save all changes
  const handleSave = async () => {
    if (!note) return;
    setIsSaving(true);
    try {
      const updates = { title, content, folder, tags: selectedTags, isPublic };
      await onSave(updates);
      updateNoteInStore(note.id, updates);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete note
  const handleDelete = async () => {
    if (!note) return;
    await onDelete(note.id);
    setShowDeleteConfirm(false);
  };

  // Toggle tag
  const toggleTag = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    if (note && isEditing) {
      debouncedSave({ tags: newTags });
    }
  };

  // Add new tag
  const addNewTag = () => {
    if (newTag && !selectedTags.includes(newTag)) {
      const newTags = [...selectedTags, newTag];
      setSelectedTags(newTags);
      setNewTag('');
      setShowTagInput(false);
      if (note && isEditing) {
        debouncedSave({ tags: newTags });
      }
    }
  };

  if (!note) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <Edit3 className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 dark:text-gray-500 text-lg">
            Select a note or create a new one
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-950 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4">
          {/* Folder selector */}
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gray-400" />
            <select
              value={folder}
              onChange={(e) => {
                setFolder(e.target.value);
                if (isEditing) debouncedSave({ folder: e.target.value });
              }}
              disabled={!isEditing}
              className="bg-transparent text-sm text-gray-700 dark:text-gray-300 border-none outline-none cursor-pointer disabled:cursor-default"
            >
              {folders.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          {/* Visibility toggle */}
          <button
            onClick={() => {
              if (!isEditing) return;
              const newValue = !isPublic;
              setIsPublic(newValue);
              debouncedSave({ isPublic: newValue });
            }}
            disabled={!isEditing}
            className={clsx(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-sm transition-colors',
              isPublic
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
              !isEditing && 'opacity-60 cursor-default'
            )}
          >
            {isPublic ? (
              <>
                <Globe className="w-3.5 h-3.5" />
                Public
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5" />
                Private
              </>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="text-xs text-gray-500">Saving...</span>
          )}
          
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          ) : (
            <>
              <button
                onClick={handleSave}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-900">
        {isEditing ? (
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Note title..."
            className="w-full text-3xl font-bold text-gray-900 dark:text-white bg-transparent border-none outline-none placeholder-gray-400"
          />
        ) : (
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {title}
          </h1>
        )}
        
        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <Tag className="w-4 h-4 text-gray-400" />
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className={clsx(
                'flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm',
                isEditing && 'pr-1'
              )}
            >
              {tag}
              {isEditing && (
                <button
                  onClick={() => toggleTag(tag)}
                  className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
          
          {isEditing && (
            <>
              {showTagInput ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
                    placeholder="New tag..."
                    className="w-24 px-2 py-0.5 text-sm bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full outline-none"
                    autoFocus
                  />
                  <button
                    onClick={() => setShowTagInput(false)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
                  >
                    <X className="w-3 h-3 text-gray-500" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowTagInput(true)}
                  className="flex items-center gap-1 px-2 py-0.5 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 border border-dashed border-gray-300 dark:border-gray-700 rounded-full transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Add tag
                </button>
              )}
              
              {/* Available tags dropdown */}
              {tags.filter((t) => !selectedTags.includes(t)).length > 0 && (
                <div className="relative group">
                  <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    More tags...
                  </button>
                  <div className="absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {tags
                        .filter((t) => !selectedTags.includes(t))
                        .map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                          >
                            {tag}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden" data-color-mode="auto">
        {isEditing ? (
          <MDEditor
            value={content}
            onChange={handleContentChange}
            preview="live"
            height="100%"
            visibleDragbar={false}
            hideToolbar={false}
            className="!h-full !border-none"
          />
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <MarkdownPreview
              source={content}
              className="prose dark:prose-invert max-w-none"
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Delete Note?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete "{title}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
