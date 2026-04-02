import { Client } from '@notionhq/client';

// Initialize Notion client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const notionClient = notion as any;

const databaseId = process.env.NOTION_DATABASE_ID!;

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  isPublic: boolean;
  links: string[]; // IDs of linked notes
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: string;
  name: string;
  icon: string;
  parentId: string | null;
}

// Fetch all notes from Notion database
export async function getNotes(): Promise<Note[]> {
  try {
    const response = await notionClient.databases.query({
      database_id: databaseId,
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    });

    return response.results.map((page: any) => {
      // Join all rich_text chunks for content (handles 2000 char limit)
      const contentRichText = page.properties.Content?.rich_text || [];
      const content = contentRichText.map((t: any) => t.plain_text).join('');
      
      return {
        id: page.id,
        title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
        content,
        folder: page.properties.Folder?.select?.name || 'Inbox',
        tags: page.properties.Tags?.multi_select?.map((t: any) => t.name) || [],
        isPublic: page.properties.Public?.checkbox || false,
        links: page.properties.Links?.relation?.map((r: any) => r.id) || [],
        createdAt: page.created_time,
        updatedAt: page.last_edited_time,
      };
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

// Get a single note by ID
export async function getNote(id: string): Promise<Note | null> {
  try {
    const page = await notionClient.pages.retrieve({ page_id: id }) as any;
    
    // Read content from Content property (rich_text can be chunked)
    const contentRichText = page.properties.Content?.rich_text || [];
    const content = contentRichText.map((t: any) => t.plain_text).join('');

    return {
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      content,
      folder: page.properties.Folder?.select?.name || 'Inbox',
      tags: page.properties.Tags?.multi_select?.map((t: any) => t.name) || [],
      isPublic: page.properties.Public?.checkbox || false,
      links: page.properties.Links?.relation?.map((r: any) => r.id) || [],
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    };
  } catch (error) {
    console.error('Error fetching note:', error);
    return null;
  }
}

// Helper function to create rich_text array, chunking text >2000 chars (Notion limit)
function createRichText(text: string): Array<{ type: 'text'; text: { content: string } }> {
  const MAX_LENGTH = 2000;
  const chunks: Array<{ type: 'text'; text: { content: string } }> = [];
  
  for (let i = 0; i < text.length; i += MAX_LENGTH) {
    chunks.push({
      type: 'text',
      text: { content: text.slice(i, i + MAX_LENGTH) },
    });
  }
  
  return chunks.length > 0 ? chunks : [{ type: 'text', text: { content: '' } }];
}

// Create a new note
export async function createNote(note: Partial<Note>): Promise<Note | null> {
  try {
    const response = await notionClient.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: note.title || 'Untitled' } }],
        },
        Content: {
          rich_text: createRichText(note.content || ''),
        },
        Folder: {
          select: { name: note.folder || 'Inbox' },
        },
        Tags: {
          multi_select: (note.tags || []).map((tag) => ({ name: tag })),
        },
        Public: {
          checkbox: note.isPublic || false,
        },
      },
    }) as any;

    return {
      id: response.id,
      title: note.title || 'Untitled',
      content: note.content || '',
      folder: note.folder || 'Inbox',
      tags: note.tags || [],
      isPublic: note.isPublic || false,
      links: [],
      createdAt: response.created_time,
      updatedAt: response.last_edited_time,
    };
  } catch (error: any) {
    console.error('Error creating note:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    throw new Error(`Notion API Error: ${error?.message || error?.body?.message || 'Unknown error'}`);
  }
}

// Update a note
export async function updateNote(id: string, updates: Partial<Note>): Promise<Note | null> {
  try {
    const properties: any = {};

    if (updates.title !== undefined) {
      properties.Name = {
        title: [{ text: { content: updates.title } }],
      };
    }
    if (updates.content !== undefined) {
      properties.Content = {
        rich_text: createRichText(updates.content),
      };
    }
    if (updates.folder !== undefined) {
      properties.Folder = {
        select: { name: updates.folder },
      };
    }
    if (updates.tags !== undefined) {
      properties.Tags = {
        multi_select: updates.tags.map((tag) => ({ name: tag })),
      };
    }
    if (updates.isPublic !== undefined) {
      properties.Public = {
        checkbox: updates.isPublic,
      };
    }

    // Update properties in a single API call
    if (Object.keys(properties).length > 0) {
      await notionClient.pages.update({
        page_id: id,
        properties,
      });
    }

    return await getNote(id);
  } catch (error: any) {
    console.error('Error updating note:', error);
    throw new Error(`Failed to update note: ${error?.message || 'Unknown error'}`);
  }
}

// Delete a note (archive in Notion)
export async function deleteNote(id: string): Promise<boolean> {
  try {
    await notionClient.pages.update({
      page_id: id,
      archived: true,
    });
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

// Search notes
export async function searchNotes(query: string): Promise<Note[]> {
  try {
    const response = await notionClient.search({
      query,
      filter: { property: 'object', value: 'page' },
      sort: { direction: 'descending', timestamp: 'last_edited_time' },
    });

    // Filter results to only include pages from our database
    const notes: Note[] = [];
    for (const page of response.results) {
      if ((page as any).parent?.database_id === databaseId.replace(/-/g, '')) {
        const note = await getNote(page.id);
        if (note) notes.push(note);
      }
    }
    return notes;
  } catch (error) {
    console.error('Error searching notes:', error);
    return [];
  }
}

// Get all folders (unique folder names from notes)
export async function getFolders(): Promise<string[]> {
  try {
    const response = await notionClient.databases.retrieve({ database_id: databaseId }) as any;
    const folderProperty = response.properties.Folder;
    if (folderProperty?.select?.options) {
      return folderProperty.select.options.map((opt: any) => opt.name);
    }
    return ['Inbox'];
  } catch (error) {
    console.error('Error fetching folders:', error);
    return ['Inbox'];
  }
}

// Create a new folder (adds select option to Folder property)
export async function createFolder(name: string): Promise<string | null> {
  try {
    // Get existing options
    const response = await notionClient.databases.retrieve({ database_id: databaseId }) as any;
    const existingOptions = response.properties.Folder?.select?.options || [];
    
    // Check if folder already exists
    if (existingOptions.some((opt: any) => opt.name.toLowerCase() === name.toLowerCase())) {
      throw new Error(`Folder "${name}" already exists`);
    }
    
    // Add new option (Notion will merge with existing)
    await notionClient.databases.update({
      database_id: databaseId,
      properties: {
        Folder: {
          select: {
            options: [...existingOptions, { name }],
          },
        },
      },
    });
    
    return name;
  } catch (error: any) {
    console.error('Error creating folder:', error);
    throw new Error(error?.message || 'Failed to create folder');
  }
}

// Update a folder name (renames select option)
export async function updateFolder(oldName: string, newName: string): Promise<string | null> {
  try {
    // Get existing options
    const response = await notionClient.databases.retrieve({ database_id: databaseId }) as any;
    const existingOptions = response.properties.Folder?.select?.options || [];
    
    // Find the folder to rename
    const folderIndex = existingOptions.findIndex((opt: any) => opt.name === oldName);
    if (folderIndex === -1) {
      throw new Error(`Folder "${oldName}" not found`);
    }
    
    // Check if new name already exists
    if (existingOptions.some((opt: any) => opt.name.toLowerCase() === newName.toLowerCase() && opt.name !== oldName)) {
      throw new Error(`Folder "${newName}" already exists`);
    }
    
    // Update the option name (keep other properties like id and color)
    const updatedOptions = existingOptions.map((opt: any) =>
      opt.name === oldName ? { ...opt, name: newName } : opt
    );
    
    await notionClient.databases.update({
      database_id: databaseId,
      properties: {
        Folder: {
          select: {
            options: updatedOptions,
          },
        },
      },
    });
    
    return newName;
  } catch (error: any) {
    console.error('Error updating folder:', error);
    throw new Error(error?.message || 'Failed to update folder');
  }
}

// Delete a folder (removes select option, notes with this folder become "Inbox")
export async function deleteFolder(name: string): Promise<boolean> {
  try {
    if (name.toLowerCase() === 'inbox') {
      throw new Error('Cannot delete the default "Inbox" folder');
    }
    
    // Get existing options
    const response = await notionClient.databases.retrieve({ database_id: databaseId }) as any;
    const existingOptions = response.properties.Folder?.select?.options || [];
    
    // Check if folder exists
    if (!existingOptions.some((opt: any) => opt.name === name)) {
      throw new Error(`Folder "${name}" not found`);
    }
    
    // First, update all notes with this folder to "Inbox"
    const notesInFolder = await notionClient.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Folder',
        select: { equals: name },
      },
    });
    
    for (const page of notesInFolder.results) {
      await notionClient.pages.update({
        page_id: page.id,
        properties: {
          Folder: { select: { name: 'Inbox' } },
        },
      });
    }
    
    // Remove the folder option
    const updatedOptions = existingOptions.filter((opt: any) => opt.name !== name);
    
    await notionClient.databases.update({
      database_id: databaseId,
      properties: {
        Folder: {
          select: {
            options: updatedOptions,
          },
        },
      },
    });
    
    return true;
  } catch (error: any) {
    console.error('Error deleting folder:', error);
    throw new Error(error?.message || 'Failed to delete folder');
  }
}

// Get all tags
export async function getTags(): Promise<string[]> {
  try {
    const response = await notionClient.databases.retrieve({ database_id: databaseId }) as any;
    const tagsProperty = response.properties.Tags;
    if (tagsProperty?.multi_select?.options) {
      return tagsProperty.multi_select.options.map((opt: any) => opt.name);
    }
    return [];
  } catch (error) {
    console.error('Error fetching tags:', error);
    return [];
  }
}

// Get graph data (nodes and links)
export async function getGraphData() {
  const notes = await getNotes();
  
  const nodes = notes.map((note) => ({
    id: note.id,
    name: note.title,
    folder: note.folder,
    tags: note.tags,
    val: 1 + note.links.length, // Size based on number of connections
  }));

  const links: { source: string; target: string }[] = [];
  
  // Create links from explicit relations
  for (const note of notes) {
    for (const linkedId of note.links) {
      links.push({ source: note.id, target: linkedId });
    }
  }

  // Also detect [[wiki-style]] links in content
  for (const note of notes) {
    const wikiLinks = note.content.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const wikiLink of wikiLinks) {
      const linkTitle = wikiLink.slice(2, -2);
      const linkedNote = notes.find(
        (n) => n.title.toLowerCase() === linkTitle.toLowerCase()
      );
      if (linkedNote && !links.some(
        (l) => l.source === note.id && l.target === linkedNote.id
      )) {
        links.push({ source: note.id, target: linkedNote.id });
      }
    }
  }

  return { nodes, links };
}

// ============================================
// PUBLIC ACCESS FUNCTIONS (Read-only, public notes only)
// ============================================

// Fetch only public notes
export async function getPublicNotes(query?: string): Promise<Note[]> {
  try {
    const response = await notionClient.databases.query({
      database_id: databaseId,
      filter: {
        property: 'Public',
        checkbox: {
          equals: true,
        },
      },
      sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
    });

    const notes = response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      content: page.properties.Content?.rich_text?.[0]?.plain_text || '',
      folder: page.properties.Folder?.select?.name || 'Inbox',
      tags: page.properties.Tags?.multi_select?.map((t: any) => t.name) || [],
      isPublic: true, // Always true for public notes
      links: page.properties.Links?.relation?.map((r: any) => r.id) || [],
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    }));

    // Filter by query if provided
    if (query) {
      const lowerQuery = query.toLowerCase();
      return notes.filter(
        (note: Note) =>
          note.title.toLowerCase().includes(lowerQuery) ||
          note.content.toLowerCase().includes(lowerQuery) ||
          note.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return notes;
  } catch (error) {
    console.error('Error fetching public notes:', error);
    return [];
  }
}

// Get a single public note by ID (returns null if note is not public)
export async function getPublicNote(id: string): Promise<Note | null> {
  try {
    const page = await notionClient.pages.retrieve({ page_id: id }) as any;
    
    // Check if note is public
    const isPublic = page.properties.Public?.checkbox || false;
    if (!isPublic) {
      return null; // Note exists but is not public
    }
    
    // Read content from Content property (rich_text can be chunked)
    const contentRichText = page.properties.Content?.rich_text || [];
    const content = contentRichText.map((t: any) => t.plain_text).join('');

    return {
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      content,
      folder: page.properties.Folder?.select?.name || 'Inbox',
      tags: page.properties.Tags?.multi_select?.map((t: any) => t.name) || [],
      isPublic: true,
      links: page.properties.Links?.relation?.map((r: any) => r.id) || [],
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    };
  } catch (error) {
    console.error('Error fetching public note:', error);
    return null;
  }
}

// Get graph data for public notes only
export async function getPublicGraphData() {
  const notes = await getPublicNotes();
  
  const nodes = notes.map((note) => ({
    id: note.id,
    name: note.title,
    folder: note.folder,
    tags: note.tags,
    val: 1 + note.links.length,
  }));

  const links: { source: string; target: string }[] = [];
  const publicNoteIds = new Set(notes.map((n) => n.id));
  
  // Create links only between public notes
  for (const note of notes) {
    for (const linkedId of note.links) {
      if (publicNoteIds.has(linkedId)) {
        links.push({ source: note.id, target: linkedId });
      }
    }
  }

  // Also detect [[wiki-style]] links in content
  for (const note of notes) {
    const wikiLinks = note.content.match(/\[\[([^\]]+)\]\]/g) || [];
    for (const wikiLink of wikiLinks) {
      const linkTitle = wikiLink.slice(2, -2);
      const linkedNote = notes.find(
        (n) => n.title.toLowerCase() === linkTitle.toLowerCase()
      );
      if (linkedNote && !links.some(
        (l) => l.source === note.id && l.target === linkedNote.id
      )) {
        links.push({ source: note.id, target: linkedNote.id });
      }
    }
  }

  return { nodes, links };
}

export { notion, databaseId };
