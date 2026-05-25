import type { Edge, Node, NodeProps } from "@xyflow/react";
import type { Database } from "@/types/database";

export type MindMapRecord = Database["public"]["Tables"]["mind_maps"]["Row"];
export type MindMapNodeRecord = Database["public"]["Tables"]["nodes"]["Row"];
export type MindMapEdgeRecord = Database["public"]["Tables"]["edges"]["Row"];
export type MediaRecord = Database["public"]["Tables"]["media"]["Row"];

export type MindMapNodeData = {
  label: string;
  subtitle?: string | null;
  notes?: string | null;
  image_suggestion?: string | null;
  isRoot?: boolean;
  isSaving?: boolean;
  isSelected?: boolean;
  mindMapId?: string;
  mediaItems?: MediaRecord[];
  onChangeLabel: (nodeId: string, label: string) => void;
  onSaveNotes?: (nodeId: string, notes: string) => Promise<void>;
  onSaveNodeDetail?: (nodeId: string, subtitle: string | null, notes: string, image_suggestion: string | null) => Promise<void>;
  onAttachMedia?: (
    nodeId: string,
    mindMapId: string,
    file: File,
    onProgress: (pct: number) => void
  ) => Promise<MediaRecord>;
  onDeleteMedia?: (media: MediaRecord) => Promise<void>;
  onExpandNode?: (nodeId: string, label: string) => Promise<void>;
};

export type MindMapNode = Node<MindMapNodeData, "mindmapNode">;
export type MindMapEdge = Edge;
export type MindMapNodeProps = NodeProps<MindMapNode>;

export type MindMapGraph = {
  nodes: MindMapNodeRecord[];
  edges: MindMapEdgeRecord[];
};
