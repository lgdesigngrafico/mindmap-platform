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
import { generateImageFromPrompt } from "@/lib/ai/generate-image";
import { formatForInstagram } from "@/lib/formatters/social-media";
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

async function exportMapToTasks(mindMapId: string) {
  const res = await fetch("/api/maps/export-to-tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mindMapId })
  });
  if (res.ok) {
    window.location.href = "/projects";
  } else {
    const data = await res.json() as { error?: string };
    window.alert(data.error ?? "Erro ao exportar tarefas.");
  }
}

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
      subtitle: node.subtitle,
      notes: node.notes,
      image_suggestion: node.image_suggestion,
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

  // ── Carousel copy state ──────────────────────────────────────────────────
  const [carouselCopied, setCarouselCopied] = useState(false);

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

  const handleSaveNotes = useCallback(async (nodeId: string, notes: string): Promise<void> => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, notes } }
          : node
      )
    );
    await updateNodeAction({ id: nodeId, notes });
  }, []);

  const handleSaveNodeDetail = useCallback(
    async (nodeId: string, subtitle: string | null, notes: string, image_suggestion: string | null): Promise<void> => {
      setNodes((currentNodes) =>
        currentNodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, subtitle, notes, image_suggestion } }
            : node
        )
      );
      await updateNodeAction({ id: nodeId, subtitle, notes, image_suggestion });
    },
    []
  );

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
    async (prompt: string, generateImages = false) => {
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
          nodes: { id: string; label: string; parentId: string | null; subtitle?: string; notes?: string; image_suggestion?: string }[];
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
            subtitle: aiNode.subtitle ?? null,
            notes: aiNode.notes ?? null,
            image_suggestion: aiNode.image_suggestion ?? null,
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

        // Detect and associate client from prompt
        try {
          const detectRes = await fetch("/api/ai/detect-client", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt })
          });
          if (detectRes.ok) {
            const detectData = await detectRes.json() as { client_id: string | null };
            if (detectData.client_id) {
              await fetch(`/api/maps/set-client`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mindMapId, client_id: detectData.client_id })
              });
            }
          }
        } catch {
          // ignore client detection errors
        }

        // Feature 1: Batch generate images for CRIATIVO REFERÊNCIA nodes
        if (generateImages) {
          const nodesWithImages = createdNodes.filter(
            (n) =>
              n.image_suggestion ||
              (n.label.toLowerCase().includes("criativo") && n.notes)
          );

          for (const node of nodesWithImages) {
            try {
              const imgPrompt = node.image_suggestion || node.notes || "";
              if (!imgPrompt) continue;
              const blob = await generateImageFromPrompt(imgPrompt);
              const file = new File([blob], "ai-generated.webp", { type: "image/webp" });
              await handleAttachMedia(node.id, mindMapId, file, () => {});
            } catch {
              // ignore individual generation failures
            }
          }
        }

        setIsAiModalOpen(false);
      } catch (err) {
        setAiError(err instanceof Error ? err.message : "Erro inesperado ao gerar mapa.");
      } finally {
        setIsAiGenerating(false);
      }
    },
    [nodes, mindMapId, currentRootNodeId, handleChangeLabel, handleAttachMedia]
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

      const data = (await res.json()) as {
        nodes: { id: string; label: string; parentId: string | null; notes?: string }[];
      };
      if (!Array.isArray(data.nodes) || data.nodes.length === 0) return;

      // Topological sort: roots (parentId null) first, then children
      const aiNodes = data.nodes;
      const sorted: typeof aiNodes = [];
      const remaining = [...aiNodes];
      const roots = remaining.filter((n) => n.parentId === null);
      sorted.push(...roots);
      for (const r of roots) remaining.splice(remaining.indexOf(r), 1);
      let safety = aiNodes.length * 2;
      while (remaining.length > 0 && safety-- > 0) {
        const processable = remaining.filter((n) => sorted.some((s) => s.id === n.parentId));
        if (processable.length === 0) break;
        for (const node of processable) {
          sorted.push(node);
          remaining.splice(remaining.indexOf(node), 1);
        }
      }
      sorted.push(...remaining);

      const positions = computeChildPositions(
        parentNode.position.x,
        parentNode.position.y,
        roots.length || sorted.length
      );

      const idMap = new Map<string, string>(); // aiId -> realDbId
      const createdNodes: MindMapNodeRecord[] = [];
      const createdEdges: MindMapEdgeRecord[] = [];

      for (let i = 0; i < sorted.length; i++) {
        const aiNode = sorted[i];
        // nodes with parentId null attach directly to the expanded node
        const realParentId = aiNode.parentId ? (idMap.get(aiNode.parentId) ?? null) : null;
        const attachTo = realParentId ?? nodeId;
        const posIdx = aiNode.parentId === null ? sorted.filter((n, j) => n.parentId === null && j <= i).length - 1 : i;
        const pos = positions[posIdx] ?? { x: parentNode.position.x + (i + 1) * 250, y: parentNode.position.y + (i + 1) * 80 };

        const created = await createNodeAction({
          mindMapId,
          parentNodeId: attachTo,
          label: aiNode.label,
          notes: aiNode.notes ?? null,
          position: pos,
          sortOrder: nodes.length + i + 1
        });
        idMap.set(aiNode.id, created.id);
        createdNodes.push(created);

        const edge = await createEdgeAction({
          mindMapId,
          sourceNodeId: attachTo,
          targetNodeId: created.id
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

  // ── Feature 3: Copy full carousel to Instagram ───────────────────────────
  const handleCopyCarousel = useCallback(() => {
    // Build source → children adjacency from edges
    const childrenMap = new Map<string, string[]>();
    for (const edge of edges) {
      const children = childrenMap.get(edge.source) ?? [];
      children.push(edge.target);
      childrenMap.set(edge.source, children);
    }

    // Find root node
    const rootNode = nodes.find((n) => n.id === currentRootNodeId || n.data.isRoot);
    if (!rootNode) {
      window.alert("Nenhum nó raiz encontrado.");
      return;
    }

    // Get slide children of root
    const slideIds = childrenMap.get(rootNode.id) ?? [];
    const slideNodes = slideIds
      .map((sid) => nodes.find((n) => n.id === sid))
      .filter(Boolean) as MindMapNode[];

    const slides: string[] = [];

    for (const slide of slideNodes) {
      const childIds = childrenMap.get(slide.id) ?? [];
      const childNodes = childIds
        .map((cid) => nodes.find((n) => n.id === cid))
        .filter(Boolean) as MindMapNode[];

      const tituloNode = childNodes.find((n) =>
        n.data.label.toUpperCase().startsWith("TÍTULO")
      );
      const subtituloNode = childNodes.find((n) =>
        n.data.label.toUpperCase().startsWith("SUBTÍTULO")
      );
      const textoNode = childNodes.find((n) =>
        n.data.label.toUpperCase().startsWith("TEXTO")
      );

      const title =
        tituloNode?.data.notes ||
        tituloNode?.data.label.replace(/^TÍTULO:\s*/i, "") ||
        slide.data.label;
      const subtitle =
        subtituloNode?.data.notes ||
        subtituloNode?.data.label.replace(/^SUBTÍTULO:\s*/i, "") ||
        "";
      const body = textoNode?.data.notes || "";

      slides.push(formatForInstagram(title, subtitle, body));
    }

    if (slides.length === 0) {
      window.alert("Nenhum slide encontrado para copiar. Gere um mapa com IA primeiro.");
      return;
    }

    const fullText = slides.join("\n\n---\n\n");
    navigator.clipboard.writeText(fullText).then(() => {
      setCarouselCopied(true);
      setTimeout(() => setCarouselCopied(false), 2000);
    });
  }, [edges, nodes, currentRootNodeId]);

  // ── Merge media + callbacks into nodes for React Flow ───────────────────
  const nodesForFlow = useMemo<MindMapNode[]>(
    () =>
      nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          mindMapId,
          mediaItems: mediaByNodeId[node.id] ?? [],
          onSaveNotes: handleSaveNotes as MindMapNodeData["onSaveNotes"],
          onSaveNodeDetail: handleSaveNodeDetail as MindMapNodeData["onSaveNodeDetail"],
          onAttachMedia: handleAttachMedia as MindMapNodeData["onAttachMedia"],
          onDeleteMedia: handleDeleteMedia as MindMapNodeData["onDeleteMedia"],
          onExpandNode: handleExpandNode as MindMapNodeData["onExpandNode"]
        }
      })),
    [nodes, mediaByNodeId, mindMapId, handleSaveNotes, handleSaveNodeDetail, handleAttachMedia, handleDeleteMedia, handleExpandNode]
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
          onExportToTasks={() => exportMapToTasks(mindMapId)}
          onCopyCarousel={handleCopyCarousel}
          carouselCopied={carouselCopied}
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
