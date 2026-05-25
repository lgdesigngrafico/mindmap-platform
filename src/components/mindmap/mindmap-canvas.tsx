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
import { AiGenerateModal } from "@/components/mindmap/ai-generate-modal";
import { computeTreeLayout, computeChildPositions } from "@/lib/mindmap/auto-layout";
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

  // ── AI state ──────────────────────────────────────────────────────────────
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [currentRootNodeId, setCurrentRootNodeId] = useState<string | null>(rootNodeId);

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

  // ── AI: generate full map ─────────────────────────────────────────────────
  const handleGenerateMap = useCallback(
    async (prompt: string) => {
      setAiError(null);
      setIsAiGenerating(true);

      try {
        // Ask user whether to replace or add
        let replaceExisting = false;
        if (nodes.length > 0) {
          replaceExisting = window.confirm(
            "O mapa já contém nós.\n\nClique em OK para substituir o conteúdo existente.\nClique em Cancelar para adicionar ao mapa atual."
          );
        }

        const res = await fetch("/api/ai/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt })
        });

        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          setAiError(data.error ?? "Falha ao gerar mapa.");
          return;
        }

        const data = (await res.json()) as {
          nodes: { id: string; label: string; parentId: string | null }[];
        };

        if (!Array.isArray(data.nodes) || data.nodes.length === 0) {
          setAiError("A IA retornou uma estrutura inválida.");
          return;
        }

        // Delete existing nodes if replacing
        if (replaceExisting && nodes.length > 0) {
          const nodesToDelete = [...nodes];
          await Promise.all(nodesToDelete.map((n) => deleteNodeAction({ id: n.id })));
          setNodes([]);
          setEdges([]);
        }

        // Compute layout positions
        const positioned = computeTreeLayout(data.nodes);

        // Topological sort: roots first, then children
        const aiNodes = data.nodes;
        const sorted: typeof aiNodes = [];
        const remaining = [...aiNodes];

        // Add roots first
        const roots = remaining.filter((n) => n.parentId === null);
        sorted.push(...roots);
        for (const r of roots) {
          remaining.splice(remaining.indexOf(r), 1);
        }

        // BFS to add children in order
        let safetyLimit = aiNodes.length * 2;
        while (remaining.length > 0 && safetyLimit-- > 0) {
          const processable = remaining.filter((n) =>
            sorted.some((s) => s.id === n.parentId)
          );
          if (processable.length === 0) break;
          for (const node of processable) {
            sorted.push(node);
            remaining.splice(remaining.indexOf(node), 1);
          }
        }
        // Append any orphaned nodes at the end
        sorted.push(...remaining);

        // Create nodes in DB
        const idMap = new Map<string, string>(); // aiId -> realDbId
        const createdNodes: MindMapNodeRecord[] = [];
        let newRootId: string | null = currentRootNodeId;
        let firstRoot = true;

        for (let i = 0; i < sorted.length; i++) {
          const aiNode = sorted[i];
          const pos = positioned.find((p) => p.id === aiNode.id) ?? { x: i * 250, y: 0 };
          const realParentId = aiNode.parentId ? (idMap.get(aiNode.parentId) ?? null) : null;
          const isRoot = aiNode.parentId === null && firstRoot;
          if (isRoot) firstRoot = false;

          const created = await createNodeAction({
            mindMapId,
            parentNodeId: realParentId,
            label: aiNode.label,
            position: { x: pos.x, y: pos.y },
            sortOrder: i + 1,
            setAsRoot: isRoot
          });

          idMap.set(aiNode.id, created.id);
          createdNodes.push(created);
          if (isRoot) newRootId = created.id;
        }

        // Create edges in DB
        const createdEdges: MindMapEdgeRecord[] = [];
        for (const aiNode of sorted) {
          if (aiNode.parentId === null) continue;
          const sourceId = idMap.get(aiNode.parentId);
          const targetId = idMap.get(aiNode.id);
          if (!sourceId || !targetId) continue;

          const edge = await createEdgeAction({
            mindMapId,
            sourceNodeId: sourceId,
            targetNodeId: targetId
          });
          createdEdges.push(edge);
        }

        // Update canvas state
        setCurrentRootNodeId(newRootId);
        setNodes(
          createdNodes.map((n) => mapNodeRecordToFlowNode(n, newRootId, handleChangeLabel))
        );
        setEdges(createdEdges.map(mapEdgeRecordToFlowEdge));
        setIsAiModalOpen(false);
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Erro inesperado ao gerar mapa.");
      } finally {
        setIsAiGenerating(false);
      }
    },
    [nodes, mindMapId, currentRootNodeId, handleChangeLabel]
  );

  // ── AI: expand node ───────────────────────────────────────────────────────
  const handleExpandNode = useCallback(
    async (nodeId: string, label: string): Promise<void> => {
      const parentNode = nodes.find((n) => n.id === nodeId);
      if (!parentNode) return;

      const mapContext = nodes.map((n) => n.data.label).join(", ");

      const res = await fetch("/api/ai/expand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodeLabel: label, mapContext })
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        window.alert(data.error ?? "Falha ao expandir nó.");
        return;
      }

      const data = (await res.json()) as { subtopics: string[] };
      if (!Array.isArray(data.subtopics) || data.subtopics.length === 0) return;

      const positions = computeChildPositions(
        parentNode.position.x,
        parentNode.position.y,
        data.subtopics.length
      );

      const createdNodes: MindMapNodeRecord[] = [];
      for (let i = 0; i < data.subtopics.length; i++) {
        const created = await createNodeAction({
          mindMapId,
          parentNodeId: nodeId,
          label: data.subtopics[i],
          position: positions[i],
          sortOrder: nodes.length + i + 1
        });
        createdNodes.push(created);
      }

      const createdEdges: MindMapEdgeRecord[] = [];
      for (const child of createdNodes) {
        const edge = await createEdgeAction({
          mindMapId,
          sourceNodeId: nodeId,
          targetNodeId: child.id
        });
        createdEdges.push(edge);
      }

      setNodes((prev) => [
        ...prev,
        ...createdNodes.map((n) => mapNodeRecordToFlowNode(n, currentRootNodeId, handleChangeLabel))
      ]);
      setEdges((prev) => [
        ...prev,
        ...createdEdges.map(mapEdgeRecordToFlowEdge)
      ]);
    },
    [nodes, mindMapId, currentRootNodeId, handleChangeLabel]
  );

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
          onDeleteMedia: handleDeleteMedia as MindMapNodeData["onDeleteMedia"],
          onExpandNode: handleExpandNode as MindMapNodeData["onExpandNode"]
        }
      })),
    [nodes, mediaByNodeId, mindMapId, handleAttachMedia, handleDeleteMedia, handleExpandNode]
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
        parentNodeId: selectedNode?.id ?? currentRootNodeId ?? null,
        position,
        sortOrder: nextNodeSortOrder
      });

      setNodes((currentNodes) => [
        ...currentNodes,
        mapNodeRecordToFlowNode(createdNode, currentRootNodeId, handleChangeLabel)
      ]);
    });
  }, [handleChangeLabel, mindMapId, nextNodeSortOrder, nodes, currentRootNodeId, selectedNodeIds]);

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
          {isPending || isAiGenerating ? (
            <p className="mindmap-editor__status">
              {isAiGenerating ? "Gerando mapa..." : "Salvando alterações…"}
            </p>
          ) : null}
        </div>
        <NodeToolbar
          onCreateNode={createNode}
          onDeleteSelection={deleteSelection}
          isDeletingDisabled={!selectedNodeIds.length && !selectedEdgeIds.length}
          onGenerateWithAI={() => { setAiError(null); setIsAiModalOpen(true); }}
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

      {isAiModalOpen && (
        <AiGenerateModal
          onClose={() => setIsAiModalOpen(false)}
          onGenerate={handleGenerateMap}
          isGenerating={isAiGenerating}
          error={aiError}
        />
      )}
    </section>
  );
}
