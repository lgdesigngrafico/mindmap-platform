"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type OnSelectionChangeParams
} from "@xyflow/react";
import { createEdge as createEdgeAction, deleteEdge as deleteEdgeAction } from "@/lib/actions/edges";
import {
  createNode as createNodeAction,
  deleteNode as deleteNodeAction,
  updateNode as updateNodeAction,
  updateNodePosition as updateNodePositionAction
} from "@/lib/actions/nodes";
import { deleteMedia as deleteMediaAction } from "@/lib/actions/media";
import { uploadMedia } from "@/lib/storage/media";
import { CustomNode } from "@/components/mindmap/custom-node";
import { NodeToolbar } from "@/components/mindmap/node-toolbar";
import type {
  MediaRecord,
  MindMapEdge,
  MindMapEdgeRecord,
  MindMapNode,
  MindMapNodeData,
  MindMapNodeRecord
} from "@/types/mindmap";
import "@xyflow/react/dist/style.css";

type MindMapCanvasProps = {
  mapTitle: string;
  mapDescription: string | null;
  createdAtLabel: string;
  updatedAtLabel: string;
  mindMapId: string;
  rootNodeId: string | null;
  initialNodes: MindMapNodeRecord[];
  initialEdges: MindMapEdgeRecord[];
  initialMediaByNodeId: Record<string, MediaRecord[]>;
};

const nodeTypes = {
  mindmapNode: CustomNode
};

function mapNodeRecordToFlowNode(
  node: MindMapNodeRecord,
  rootNodeId: string | null,
  onChangeLabel: (nodeId: string, label: string) => void
): MindMapNode {
  return {
    id: node.id,
    type: "mindmapNode",
    position: {
      x: node.pos_x,
      y: node.pos_y
    },
    data: {
      label: node.label,
      isRoot: node.id === rootNodeId,
      onChangeLabel
    }
  };
}

function mapEdgeRecordToFlowEdge(edge: MindMapEdgeRecord): MindMapEdge {
  return {
    id: edge.id,
    source: edge.source_node_id,
    target: edge.target_node_id,
    type: edge.edge_type,
    markerEnd: {
      type: MarkerType.ArrowClosed
    }
  };
}

export function MindMapCanvas({
  mapTitle,
  mapDescription,
  createdAtLabel,
  updatedAtLabel,
  mindMapId,
  rootNodeId,
  initialNodes,
  initialEdges,
  initialMediaByNodeId
}: MindMapCanvasProps) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ── Media state ──────────────────────────────────────────────────────────
  const [mediaByNodeId, setMediaByNodeId] = useState<Record<string, MediaRecord[]>>(
    () => initialMediaByNodeId
  );

  const handleAttachMedia = useCallback(
    async (
      nodeId: string,
      mapId: string,
      file: File,
      onProgress: (pct: number) => void
    ): Promise<MediaRecord> => {
      const record = await uploadMedia({ nodeId, mindMapId: mapId, file }, onProgress);
      setMediaByNodeId((prev) => ({
        ...prev,
        [nodeId]: [...(prev[nodeId] ?? []), record]
      }));
      return record;
    },
    []
  );

  const handleDeleteMedia = useCallback(async (media: MediaRecord): Promise<void> => {
    await deleteMediaAction(media.id);
    setMediaByNodeId((prev) => ({
      ...prev,
      [media.node_id]: (prev[media.node_id] ?? []).filter((m) => m.id !== media.id)
    }));
  }, []);

  // ── Label change ─────────────────────────────────────────────────────────
  const handleChangeLabel = useCallback((nodeId: string, label: string) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, label } }
          : node
      )
    );

    startTransition(async () => {
      await updateNodeAction({ id: nodeId, label });
    });
  }, []);

  const [nodes, setNodes] = useState<MindMapNode[]>(() =>
    initialNodes.map((node) => mapNodeRecordToFlowNode(node, rootNodeId, handleChangeLabel))
  );
  const [edges, setEdges] = useState<MindMapEdge[]>(() =>
    initialEdges.map(mapEdgeRecordToFlowEdge)
  );

  useEffect(() => {
    setNodes(
      initialNodes.map((node) => mapNodeRecordToFlowNode(node, rootNodeId, handleChangeLabel))
    );
  }, [handleChangeLabel, initialNodes, rootNodeId]);

  useEffect(() => {
    setEdges(initialEdges.map(mapEdgeRecordToFlowEdge));
  }, [initialEdges]);

  useEffect(() => {
    return () => {
      Object.values(debounceTimers.current).forEach((t) => clearTimeout(t));
    };
  }, []);

  // ── Merge media + callbacks into nodes for React Flow ───────────────────
  const nodesForFlow = useMemo<MindMapNode[]>(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          mindMapId,
          mediaItems: mediaByNodeId[node.id] ?? [],
          onAttachMedia: handleAttachMedia as MindMapNodeData["onAttachMedia"],
          onDeleteMedia: handleDeleteMedia as MindMapNodeData["onDeleteMedia"]
        }
      })),
    [nodes, mediaByNodeId, mindMapId, handleAttachMedia, handleDeleteMedia]
  );

  const nextNodeSortOrder = useMemo(() => nodes.length + 1, [nodes.length]);

  // ── React Flow handlers ──────────────────────────────────────────────────
  const onNodesChange = useCallback((changes: NodeChange<MindMapNode>[]) => {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes));

    changes.forEach((change) => {
      if (change.type !== "position" || !change.position || change.dragging) return;

      if (debounceTimers.current[change.id]) {
        clearTimeout(debounceTimers.current[change.id]);
      }

      const nextPosition = { x: change.position.x, y: change.position.y };
      debounceTimers.current[change.id] = setTimeout(() => {
        startTransition(async () => {
          await updateNodePositionAction({ id: change.id, position: nextPosition });
        });
      }, 500);
    });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange<MindMapEdge>[]) => {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const optimisticEdge: MindMapEdge = {
        id: `temp-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        markerEnd: { type: MarkerType.ArrowClosed }
      };

      setEdges((currentEdges) => addEdge(optimisticEdge, currentEdges));

      startTransition(async () => {
        const savedEdge: MindMapEdgeRecord = await createEdgeAction({
          mindMapId,
          sourceNodeId: connection.source,
          targetNodeId: connection.target
        });

        setEdges((currentEdges) => {
          const withoutOptimistic = currentEdges.filter((e) => e.id !== optimisticEdge.id);
          const alreadyExists = withoutOptimistic.some((e) => e.id === savedEdge.id);
          if (alreadyExists) return withoutOptimistic;
          return [
            ...withoutOptimistic,
            {
              id: savedEdge.id,
              source: savedEdge.source_node_id,
              target: savedEdge.target_node_id,
              type: savedEdge.edge_type,
              markerEnd: { type: MarkerType.ArrowClosed }
            }
          ];
        });
      });
    },
    [mindMapId]
  );

  const createNode = useCallback(() => {
    const selectedNode = nodes.find((node) => node.id === selectedNodeIds[0]) ?? nodes[0];
    const position = selectedNode
      ? { x: selectedNode.position.x + 240, y: selectedNode.position.y + 120 }
      : { x: 0, y: 0 };

    startTransition(async () => {
      const createdNode = await createNodeAction({
        mindMapId,
        parentNodeId: selectedNode?.id ?? rootNodeId ?? null,
        position,
        sortOrder: nextNodeSortOrder
      });

      setNodes((currentNodes) => [
        ...currentNodes,
        mapNodeRecordToFlowNode(createdNode, rootNodeId, handleChangeLabel)
      ]);
    });
  }, [handleChangeLabel, mindMapId, nextNodeSortOrder, nodes, rootNodeId, selectedNodeIds]);

  const deleteSelection = useCallback(() => {
    const selectedNodeId = selectedNodeIds[0];
    const selectedEdgeId = selectedEdgeIds[0];

    if (selectedNodeId) {
      const connectedEdgeIds = edges
        .filter((e) => e.source === selectedNodeId || e.target === selectedNodeId)
        .map((e) => e.id);

      setNodes((currentNodes) => currentNodes.filter((n) => n.id !== selectedNodeId));
      setEdges((currentEdges) =>
        currentEdges.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId)
      );

      startTransition(async () => {
        await deleteNodeAction({ id: selectedNodeId });
      });

      setSelectedNodeIds([]);
      setSelectedEdgeIds(connectedEdgeIds.length ? [] : selectedEdgeIds);
      return;
    }

    if (selectedEdgeId) {
      setEdges((currentEdges) => currentEdges.filter((e) => e.id !== selectedEdgeId));
      startTransition(async () => {
        await deleteEdgeAction({ id: selectedEdgeId });
      });
      setSelectedEdgeIds([]);
    }
  }, [edges, selectedEdgeIds, selectedNodeIds]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Delete") return;
      event.preventDefault();
      deleteSelection();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection]);

  const onSelectionChange = useCallback((selection: OnSelectionChangeParams) => {
    setSelectedNodeIds(selection.nodes.map((n) => n.id));
    setSelectedEdgeIds(selection.edges.map((e) => e.id));
  }, []);

  return (
    <section className="mindmap-editor">
      <div className="mindmap-editor__header">
        <div className="mindmap-editor__meta">
          <div
            className="mindmap-editor__title"
            title={
              mapDescription
                ? `${mapTitle}\n${mapDescription}\nCriado em ${createdAtLabel}\nAtualizado em ${updatedAtLabel}`
                : `${mapTitle}\nCriado em ${createdAtLabel}\nAtualizado em ${updatedAtLabel}`
            }
          >
            {mapTitle}
          </div>
          {isPending ? <p className="mindmap-editor__status">Salvando alterações…</p> : null}
        </div>
        <NodeToolbar
          onCreateNode={createNode}
          onDeleteSelection={deleteSelection}
          isDeletingDisabled={!selectedNodeIds.length && !selectedEdgeIds.length}
        />
      </div>
      <div className="mindmap-editor__canvas">
        <ReactFlow
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodes={nodesForFlow}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onSelectionChange={onSelectionChange}
          deleteKeyCode={null}
          defaultEdgeOptions={{
            markerEnd: { type: MarkerType.ArrowClosed }
          }}
        >
          <Background gap={24} size={1} color="rgba(148, 163, 184, 0.14)" />
          <MiniMap
            pannable
            zoomable
            position="bottom-right"
            style={{ width: 140, height: 90 }}
            nodeColor={() => "rgba(56, 189, 248, 0.8)"}
            maskColor="rgba(2, 6, 23, 0.4)"
          />
          <Controls position="bottom-left" />
        </ReactFlow>
      </div>
    </section>
  );
}
