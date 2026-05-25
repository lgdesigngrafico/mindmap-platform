import Link from "next/link";
import { notFound } from "next/navigation";
import { MindMapCanvas } from "@/components/mindmap/mindmap-canvas";
import { requireUser } from "@/lib/auth/session";
import { getMindMapGraph } from "@/lib/data/mind-maps";
import { getMediaByMindMapId } from "@/lib/data/media";
import type { MediaRecord } from "@/types/mindmap";

type MindMapDetailsPageProps = {
  params: {
    id: string;
  };
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "short"
  }).format(new Date(date));
}

export default async function MindMapDetailsPage({ params }: MindMapDetailsPageProps) {
  const user = await requireUser();
  const result = await getMindMapGraph(params.id, user.id);

  if (!result) {
    notFound();
  }

  const map = result.map;
  const nodes = result.nodes;
  const edges = result.edges;

  const mediaList = await getMediaByMindMapId(map.id);

  const initialMediaByNodeId: Record<string, MediaRecord[]> = {};
  for (const media of mediaList) {
    if (!initialMediaByNodeId[media.node_id]) {
      initialMediaByNodeId[media.node_id] = [];
    }
    initialMediaByNodeId[media.node_id].push(media);
  }

  return (
    <div className="page page--editor">
      <section className="page-body page-body--editor">
        <MindMapCanvas
          mapTitle={map.title}
          mapDescription={map.description}
          createdAtLabel={formatDate(map.created_at)}
          updatedAtLabel={formatDate(map.updated_at)}
          mindMapId={map.id}
          rootNodeId={map.root_node_id}
          initialNodes={nodes}
          initialEdges={edges}
          initialMediaByNodeId={initialMediaByNodeId}
        />
        <div className="page-body__footer">
          <Link className="button button--secondary" href="/maps">
            Voltar para mapas
          </Link>
        </div>
      </section>
    </div>
  );
}
