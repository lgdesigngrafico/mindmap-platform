import Groq from "groq-sdk";

const SYSTEM_PROMPT =
  "Você é um Social Media Strategist Sênior especializado em criação de carrosséis e conteúdo para redes sociais. " +
  "Dado um nó de mapa mental, gere variações ou sub-slides — sempre em estrutura PLANA (filhos diretos, sem sub-nós). " +
  "REGRA ABSOLUTA: máximo 2 níveis total. Os novos nós são SEMPRE filhos diretos do nó expandido (parentId: null na resposta). " +
  "Gere 3 a 5 variações/sub-slides, cada um autossuficiente com todos os campos preenchidos. " +
  "Responda APENAS com JSON válido neste formato EXATO: " +
  "{\"nodes\": [" +
  "{\"id\": \"1\", \"label\": \"Slide 1: [título max 5 palavras]\", \"parentId\": null, \"subtitle\": \"[conceito central]\", \"notes\": \"[copy completa pronta pra postar: emojis, quebras de linha, linguagem de rede social]\", \"image_suggestion\": \"[descrição do criativo visual ideal]\"}," +
  "{\"id\": \"2\", \"label\": \"Slide 2: [título max 5 palavras]\", \"parentId\": null, \"subtitle\": \"...\", \"notes\": \"...\", \"image_suggestion\": \"...\"}," +
  "... mais slides ]}. " +
  "REGRAS: (1) parentId SEMPRE null — os filhos serão vinculados ao nó expandido pelo sistema. (2) Label curto (máx 5 palavras). (3) Notes com copy completa, emojis e linguagem de rede social. (4) NUNCA crie hierarquia profunda — apenas 1 nível de filhos.";

export async function POST(req: Request) {
  let nodeLabel: string;
  let mapContext: string | undefined;

  try {
    const body = await req.json();
    nodeLabel = body.nodeLabel as string;
    mapContext = body.mapContext as string | undefined;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!nodeLabel || typeof nodeLabel !== "string" || nodeLabel.trim().length === 0) {
    return Response.json({ error: "nodeLabel é obrigatório." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GROQ_API_KEY não configurada." }, { status: 500 });
  }

  try {
    const groq = new Groq({ apiKey });

    const userContent = mapContext
      ? `Nó: ${nodeLabel.trim()}\nContexto do mapa: ${mapContext}`
      : `Nó: ${nodeLabel.trim()}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "A IA não retornou um formato válido. Tente novamente." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      nodes?: { id: string; label: string; parentId: string | null; subtitle?: string; notes?: string; image_suggestion?: string }[];
      subtopics?: { label: string; notes?: string }[];
    };

    // Support both new nodes format and legacy subtopics format
    if (Array.isArray(parsed.nodes) && parsed.nodes.length > 0) {
      return Response.json({ nodes: parsed.nodes });
    }

    if (Array.isArray(parsed.subtopics) && parsed.subtopics.length > 0) {
      return Response.json({ nodes: parsed.subtopics.map((s, i) => ({ id: String(i + 1), label: s.label, parentId: null, notes: s.notes ?? "" })) });
    }

    return Response.json(
      { error: "Estrutura inválida retornada pela IA." },
      { status: 500 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar a IA.";
    return Response.json({ error: message }, { status: 500 });
  }
}
