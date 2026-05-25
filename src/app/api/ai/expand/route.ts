import Groq from "groq-sdk";

const SYSTEM_PROMPT =
  "Você é um especialista em criação de conteúdo visual e mapas mentais. Dado um nó de mapa mental, gere 3-5 subtópicos onde CADA UM representa um SLIDE ou CARD de conteúdo visual. Responda APENAS com JSON válido no formato: {\"subtopics\": [{\"label\": \"TÍTULO DO SLIDE\", \"subtitle\": \"Frase de apoio ou contexto\", \"notes\": \"Texto corpo completo do slide. Conteúdo PRÁTICO — O QUE FAZER, COMO FAZER, exemplos e métricas, 50-150 palavras.\", \"image_suggestion\": \"Descrição da imagem ideal para este card: ex. gráfico de crescimento com linha verde ascendente\"}]}. Regras: (1) label: título curto e impactante, 3-5 palavras. (2) subtitle: frase de apoio, 1 linha. (3) notes: conteúdo prático com exemplos concretos. (4) image_suggestion: descrição visual específica.";

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

    const parsed = JSON.parse(jsonMatch[0]) as { subtopics: { label: string; subtitle?: string; notes: string; image_suggestion?: string }[] };

    if (!Array.isArray(parsed.subtopics) || parsed.subtopics.length === 0) {
      return Response.json(
        { error: "Subtópicos inválidos retornados pela IA." },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar a IA.";
    return Response.json({ error: message }, { status: 500 });
  }
}
