import Groq from "groq-sdk";

const SYSTEM_PROMPT =
  "Você é um Social Media Strategist especializado em criação de carrosséis e posts para redes sociais. " +
  "Dado um nó de mapa mental, gere 3 a 5 slides de conteúdo, cada um seguindo a estrutura FIXA de 4 elementos. " +
  "Responda APENAS com JSON válido neste formato exato: " +
  "{\"nodes\": [" +
  "{\"id\": \"1\", \"label\": \"Slide 1\", \"parentId\": null, \"notes\": \"\"}," +
  "{\"id\": \"2\", \"label\": \"TÍTULO: [headline impactante]\", \"parentId\": \"1\", \"notes\": \"[headline completo]\"}," +
  "{\"id\": \"3\", \"label\": \"SUBTÍTULO: [frase de apoio]\", \"parentId\": \"1\", \"notes\": \"[frase de apoio ou contexto]\"}," +
  "{\"id\": \"4\", \"label\": \"TEXTO CORPO\", \"parentId\": \"1\", \"notes\": \"[copy completa do slide, 50-150 palavras, conteúdo prático]\"}," +
  "{\"id\": \"5\", \"label\": \"CRIATIVO REFERÊNCIA\", \"parentId\": \"1\", \"notes\": \"[descrição detalhada da imagem ou vídeo ideal]\"}," +
  "{\"id\": \"6\", \"label\": \"Slide 2\", \"parentId\": null, \"notes\": \"\"}," +
  "... continuar para todos os slides ]}. " +
  "REGRAS: (1) parentId null = slide pai direto do nó expandido. (2) Cada slide tem EXATAMENTE 4 filhos: TÍTULO, SUBTÍTULO, TEXTO CORPO, CRIATIVO REFERÊNCIA. (3) NUNCA omita nenhum dos 4 elementos.";

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
      nodes?: { id: string; label: string; parentId: string | null; notes?: string }[];
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
