'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { useNotesStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';

// Dynamic import for ForceGraph to avoid SSR issues
const ForceGraph2D = dynamic(
  () => import('react-force-graph-2d'),
  { ssr: false }
);

interface GraphNode {
  id: string;
  name: string;
  folder: string;
  tags: string[];
  val: number;
}

interface GraphLink {
  source: string;
  target: string;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export function GraphView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  
  const { selectNote, notes } = useNotesStore();

  // Fetch graph data
  useEffect(() => {
    const fetchGraphData = async () => {
      try {
        const response = await fetch('/api/graph');
        const data = await response.json();
        setGraphData(data);
      } catch (error) {
        console.error('Error fetching graph data:', error);
        // Generate graph data from local notes
        const nodes = notes.map((note) => ({
          id: note.id,
          name: note.title,
          folder: note.folder,
          tags: note.tags,
          val: 1 + note.links.length,
        }));
        
        const links: GraphLink[] = [];
        for (const note of notes) {
          for (const linkedId of note.links) {
            links.push({ source: note.id, target: linkedId });
          }
          // Also detect [[wiki-style]] links
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
        
        setGraphData({ nodes, links });
      } finally {
        setLoading(false);
      }
    };

    fetchGraphData();
  }, [notes]);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    selectNote(node.id);
  }, [selectNote]);

  // Node color based on folder
  const getNodeColor = (node: GraphNode) => {
    const colors: Record<string, string> = {
      'Inbox': '#3b82f6',      // blue
      'Notes': '#10b981',      // green
      'Projects': '#f59e0b',   // amber
      'Archive': '#6b7280',    // gray
    };
    return colors[node.folder] || '#8b5cf6'; // purple default
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex items-center gap-3 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin" />
          Loading graph...
        </div>
      </div>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
            <svg className="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="6" cy="6" r="2" />
              <circle cx="18" cy="6" r="2" />
              <circle cx="12" cy="18" r="2" />
              <line x1="8" y1="6" x2="16" y2="6" />
              <line x1="7" y1="8" x2="11" y2="16" />
              <line x1="17" y1="8" x2="13" y2="16" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-500 text-lg">
            No connections yet
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-600 mt-1">
            Link notes using [[Note Title]] syntax
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef} 
      className="flex-1 bg-gray-50 dark:bg-gray-950 relative"
    >
      <ForceGraph2D
        width={dimensions.width}
        height={dimensions.height}
        graphData={graphData}
        nodeLabel="name"
        nodeColor={(node: unknown) => getNodeColor(node as GraphNode)}
        nodeRelSize={6}
        linkColor={() => 'rgba(156, 163, 175, 0.3)'}
        linkWidth={1.5}
        onNodeClick={(node: unknown) => handleNodeClick(node as GraphNode)}
        onNodeHover={(node: unknown) => setHoveredNode(node as GraphNode | null)}
        nodeCanvasObject={(node: unknown, ctx, globalScale) => {
          const n = node as GraphNode & { x: number; y: number };
          const label = n.name;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // Draw node circle
          const size = Math.sqrt(n.val) * 4;
          ctx.beginPath();
          ctx.arc(n.x, n.y, size, 0, 2 * Math.PI);
          ctx.fillStyle = getNodeColor(n);
          ctx.fill();
          
          // Draw label
          ctx.fillStyle = hoveredNode?.id === n.id 
            ? '#1f2937' 
            : 'rgba(107, 114, 128, 0.8)';
          ctx.fillText(label, n.x, n.y + size + fontSize);
        }}
        cooldownTicks={100}
        d3VelocityDecay={0.3}
      />
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-900 rounded-lg p-3 shadow-lg border border-gray-200 dark:border-gray-700">
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
          Folders
        </div>
        <div className="space-y-1">
          {['Inbox', 'Notes', 'Projects', 'Archive'].map((folder) => (
            <div key={folder} className="flex items-center gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full"
                style={{ 
                  backgroundColor: folder === 'Inbox' ? '#3b82f6' 
                    : folder === 'Notes' ? '#10b981' 
                    : folder === 'Projects' ? '#f59e0b' 
                    : '#6b7280' 
                }}
              />
              <span className="text-gray-600 dark:text-gray-400">{folder}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Hovered node info */}
      {hoveredNode && (
        <div className="absolute top-4 right-4 bg-white dark:bg-gray-900 rounded-lg p-4 shadow-lg border border-gray-200 dark:border-gray-700 max-w-xs">
          <h3 className="font-medium text-gray-900 dark:text-white">
            {hoveredNode.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {hoveredNode.folder}
          </p>
          {hoveredNode.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {hoveredNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            {hoveredNode.val - 1} connection{hoveredNode.val !== 2 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
