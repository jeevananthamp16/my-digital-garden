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

    return response.results.map((page: any) => ({
      id: page.id,
      title: page.properties.Name?.title?.[0]?.plain_text || 'Untitled',
      content: page.properties.Content?.rich_text?.[0]?.plain_text || '',
      folder: page.properties.Folder?.select?.name || 'Inbox',
      tags: page.properties.Tags?.multi_select?.map((t: any) => t.name) || [],
      isPublic: page.properties.Public?.checkbox || false,
      links: page.properties.Links?.relation?.map((r: any) => r.id) || [],
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    }));
  } catch (error) {
    console.error('Error fetching notes:', error);
    return [];
  }
}

// Get a single note by ID
export async function getNote(id: string): Promise<Note | null> {
  try {
    const page = await notionClient.pages.retrieve({ page_id: id }) as any;
    
    // Get page content (blocks)
    const blocks = await notionClient.blocks.children.list({ block_id: id });
    const content = blocks.results
      .map((block: any) => {
        if (block.type === 'paragraph') {
          return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_1') {
          return `# ${block.heading_1.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'heading_2') {
          return `## ${block.heading_2.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'heading_3') {
          return `### ${block.heading_3.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'bulleted_list_item') {
          return `- ${block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'numbered_list_item') {
          return `1. ${block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'code') {
          return `\`\`\`${block.code.language}\n${block.code.rich_text.map((t: any) => t.plain_text).join('')}\n\`\`\``;
        }
        if (block.type === 'quote') {
          return `> ${block.quote.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        return '';
      })
      .join('\n\n');

    return {
      id: page.id,
      title: page.properties.Title?.title?.[0]?.plain_text || 'Untitled',
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

// Create a new note
export async function createNote(note: Partial<Note>): Promise<Note | null> {
  try {
    const response = await notionClient.pages.create({
      parent: { database_id: databaseId },
      properties: {
        Name: {
          title: [{ text: { content: note.title || 'Untitled' } }],
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

    // Add content as blocks
    if (note.content) {
      await updateNoteContent(response.id, note.content);
    }

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
    // Re-throw with more details for the API to catch
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

    await notionClient.pages.update({
      page_id: id,
      properties,
    });

    // Update content if provided
    if (updates.content !== undefined) {
      await updateNoteContent(id, updates.content);
    }

    return await getNote(id);
  } catch (error) {
    console.error('Error updating note:', error);
    return null;
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

// Helper function to update note content as blocks
async function updateNoteContent(pageId: string, content: string) {
  // First, delete existing blocks
  const existingBlocks = await notionClient.blocks.children.list({ block_id: pageId });
  for (const block of existingBlocks.results) {
    await notionClient.blocks.delete({ block_id: block.id });
  }

  // Parse markdown and create blocks
  const lines = content.split('\n');
  const blocks: any[] = [];

  for (const line of lines) {
    if (!line.trim()) continue;

    if (line.startsWith('# ')) {
      blocks.push({
        object: 'block',
        type: 'heading_1',
        heading_1: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
        },
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: line.slice(3) } }],
        },
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        object: 'block',
        type: 'heading_3',
        heading_3: {
          rich_text: [{ type: 'text', text: { content: line.slice(4) } }],
        },
      });
    } else if (line.startsWith('- ')) {
      blocks.push({
        object: 'block',
        type: 'bulleted_list_item',
        bulleted_list_item: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
        },
      });
    } else if (line.startsWith('> ')) {
      blocks.push({
        object: 'block',
        type: 'quote',
        quote: {
          rich_text: [{ type: 'text', text: { content: line.slice(2) } }],
        },
      });
    } else {
      blocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: line } }],
        },
      });
    }
  }

  // Add blocks in chunks (Notion API limit is 100 blocks per request)
  for (let i = 0; i < blocks.length; i += 100) {
    const chunk = blocks.slice(i, i + 100);
    await notionClient.blocks.children.append({
      block_id: pageId,
      children: chunk,
    });
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
    
    // Get page content (blocks)
    const blocks = await notionClient.blocks.children.list({ block_id: id });
    const content = blocks.results
      .map((block: any) => {
        if (block.type === 'paragraph') {
          return block.paragraph.rich_text.map((t: any) => t.plain_text).join('');
        }
        if (block.type === 'heading_1') {
          return `# ${block.heading_1.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'heading_2') {
          return `## ${block.heading_2.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'heading_3') {
          return `### ${block.heading_3.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'bulleted_list_item') {
          return `- ${block.bulleted_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'numbered_list_item') {
          return `1. ${block.numbered_list_item.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        if (block.type === 'code') {
          return `\`\`\`${block.code.language}\n${block.code.rich_text.map((t: any) => t.plain_text).join('')}\n\`\`\``;
        }
        if (block.type === 'quote') {
          return `> ${block.quote.rich_text.map((t: any) => t.plain_text).join('')}`;
        }
        return '';
      })
      .join('\n\n');

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
