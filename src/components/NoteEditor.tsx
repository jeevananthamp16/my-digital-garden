'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import remarkBreaks from 'remark-breaks';
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
  Image as ImageIcon,
} from 'lucide-react';
import { useNotesStore } from '@/lib/store';
import { Note } from '@/lib/notion';
import { debounce, DebouncedFunction } from '@/lib/utils';
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
  const editorRef = useRef<HTMLDivElement>(null);
  const noteIdRef = useRef<string | null>(null);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [folder, setFolder] = useState('Inbox');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Memoize textarea props to prevent unnecessary re-renders
  const textareaProps = useMemo(() => ({
    autoComplete: "off" as const,
    autoCorrect: "off" as const,
    autoCapitalize: "off" as const,
    spellCheck: false,
  }), []);

  // Compress and convert image to base64
  const compressImage = useCallback(async (file: File, maxWidth = 1200, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Scale down if too large
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  // Handle paste event for images
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        setIsUploadingImage(true);
        try {
          // Compress large images
          const maxSizeKB = 500;
          let imageData: string;
          
          if (file.size > maxSizeKB * 1024) {
            imageData = await compressImage(file, 1200, 0.7);
          } else {
            imageData = await compressImage(file, 1600, 0.85);
          }
          
          // Insert markdown image at cursor position
          const imageMarkdown = `\n![image](${imageData})\n`;
          setContent(prev => prev + imageMarkdown);
          
          // Trigger auto-save
          if (note && isEditing && debouncedSaveRef.current) {
            debouncedSaveRef.current(note.id, { content: content + imageMarkdown });
          }
        } catch (error) {
          console.error('Failed to process image:', error);
          alert('Failed to paste image. Please try again.');
        } finally {
          setIsUploadingImage(false);
        }
        break;
      }
    }
  }, [note, isEditing, content, compressImage]);

  // Handle drag and drop for images
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.type.startsWith('image/')) return;

    setIsUploadingImage(true);
    try {
      const imageData = await compressImage(file, 1200, 0.8);
      const imageMarkdown = `\n![${file.name}](${imageData})\n`;
      setContent(prev => prev + imageMarkdown);
      
      if (note && isEditing && debouncedSaveRef.current) {
        debouncedSaveRef.current(note.id, { content: content + imageMarkdown });
      }
    } catch (error) {
      console.error('Failed to process dropped image:', error);
      alert('Failed to add image. Please try again.');
    } finally {
      setIsUploadingImage(false);
    }
  }, [note, isEditing, content, compressImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Load note data when selection changes (only when note ID actually changes)
  useEffect(() => {
    const currentNoteId = note?.id || null;
    
    // Only update state if note ID actually changed
    if (currentNoteId !== noteIdRef.current) {
      noteIdRef.current = currentNoteId;
      
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
    }
  }, [note?.id, note?.title, note?.content, note?.folder, note?.tags, note?.isPublic]);

  // Auto-save with debounce - use ref to persist between renders
  const debouncedSaveRef = useRef<DebouncedFunction<(noteId: string, updates: Partial<Note>) => Promise<void>> | null>(null);
  
  // Initialize debouncedSave once
  useEffect(() => {
    debouncedSaveRef.current = debounce(async (noteId: string, updates: Partial<Note>) => {
      setIsSaving(true);
      try {
        await onSave(updates);
        updateNoteInStore(noteId, updates);
      } finally {
        setIsSaving(false);
      }
    }, 1000);
    
    return () => {
      debouncedSaveRef.current?.cancel();
    };
  }, [onSave, updateNoteInStore]);

  // Handle content changes with auto-save
  const handleContentChange = useCallback((value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    if (note && isEditing && debouncedSaveRef.current) {
      debouncedSaveRef.current(note.id, { content: newContent });
    }
  }, [note?.id, isEditing]);

  // Handle title changes
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (note && isEditing && debouncedSaveRef.current) {
      debouncedSaveRef.current(note.id, { title: newTitle });
    }
  }, [note?.id, isEditing]);

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
  const toggleTag = useCallback((tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter((t) => t !== tag)
      : [...selectedTags, tag];
    setSelectedTags(newTags);
    if (note && isEditing && debouncedSaveRef.current) {
      debouncedSaveRef.current(note.id, { tags: newTags });
    }
  }, [selectedTags, note?.id, isEditing]);

  // Add new tag
  const addNewTag = useCallback(() => {
    if (newTag && !selectedTags.includes(newTag)) {
      const newTags = [...selectedTags, newTag];
      setSelectedTags(newTags);
      setNewTag('');
      setShowTagInput(false);
      if (note && isEditing && debouncedSaveRef.current) {
        debouncedSaveRef.current(note.id, { tags: newTags });
      }
    }
  }, [newTag, selectedTags, note?.id, isEditing]);

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
                if (isEditing && note && debouncedSaveRef.current) debouncedSaveRef.current(note.id, { folder: e.target.value });
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
              if (!isEditing || !note) return;
              const newValue = !isPublic;
              setIsPublic(newValue);
              if (debouncedSaveRef.current) debouncedSaveRef.current(note.id, { isPublic: newValue });
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
          
          {isEditing ? (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              Save
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
          
          {/* Delete button - always visible */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg text-sm transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
          <div 
            ref={editorRef}
            className="h-full relative"
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {isUploadingImage && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-10">
                <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 animate-pulse" />
                  <span>Processing image...</span>
                </div>
              </div>
            )}
            <MDEditor
              value={content}
              onChange={handleContentChange}
              preview="edit"
              height="100%"
              visibleDragbar={false}
              hideToolbar={false}
              className="!h-full !border-none"
              textareaProps={{
                autoComplete: "off",
                autoCorrect: "off",
                autoCapitalize: "off",
                spellCheck: false,
              }}
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-6">
            <MarkdownPreview
              source={content}
              remarkPlugins={[remarkBreaks]}
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
