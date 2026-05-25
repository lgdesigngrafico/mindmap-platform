export type HierarchicalNode = {
  id: string;
  label: string;
  parentId: string | null;
};

export type PositionedNode = HierarchicalNode & {
  x: number;
  y: number;
};

const H_SPACING = 250;
const V_SPACING = 150;

/**
 * Computes x/y positions for a tree of hierarchical nodes.
 * Root nodes sit at y=0 and are centered; children expand downward.
 */
export function computeTreeLayout(nodes: HierarchicalNode[]): PositionedNode[] {
  const childrenMap = new Map<string, string[]>();
  const nodeMap = new Map<string, HierarchicalNode>();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    if (!childrenMap.has(node.id)) {
      childrenMap.set(node.id, []);
    }
    if (node.parentId !== null) {
      const siblings = childrenMap.get(node.parentId) ?? [];
      siblings.push(node.id);
      childrenMap.set(node.parentId, siblings);
    }
  }

  function subtreeWidth(id: string): number {
    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return 1;
    return children.reduce((sum, cId) => sum + subtreeWidth(cId), 0);
  }

  const positioned: PositionedNode[] = [];

  function layout(id: string, x: number, depth: number): void {
    const node = nodeMap.get(id);
    if (!node) return;
    positioned.push({ ...node, x, y: depth * V_SPACING });

    const children = childrenMap.get(id) ?? [];
    if (children.length === 0) return;

    const totalWidth = children.reduce((sum, cId) => sum + subtreeWidth(cId), 0);
    let currentX = x - ((totalWidth - 1) / 2) * H_SPACING;

    for (const childId of children) {
      const w = subtreeWidth(childId);
      layout(childId, currentX + ((w - 1) / 2) * H_SPACING, depth + 1);
      currentX += w * H_SPACING;
    }
  }

  const roots = nodes.filter((n) => n.parentId === null);
  const totalRootWidth = roots.reduce((sum, r) => sum + subtreeWidth(r.id), 0);
  let rootX = -((totalRootWidth - 1) / 2) * H_SPACING;

  for (const root of roots) {
    const w = subtreeWidth(root.id);
    layout(root.id, rootX + ((w - 1) / 2) * H_SPACING, 0);
    rootX += w * H_SPACING;
  }

  return positioned;
}

/**
 * Computes positions for N child nodes fanned out below a parent.
 */
export function computeChildPositions(
  parentX: number,
  parentY: number,
  count: number
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const totalWidth = (count - 1) * H_SPACING;
  const startX = parentX - totalWidth / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + i * H_SPACING,
      y: parentY + V_SPACING
    });
  }

  return positions;
}
