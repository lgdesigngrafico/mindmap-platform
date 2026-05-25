import Groq from "groq-sdk";

const SYSTEM_PROMPT =
  "Você é um especialista em mapas mentais. Dado um nó de mapa mental, gere 3-5 subtópicos relevantes. Responda APENAS com JSON válido no formato: {\"subtopics\": [\"Subtópico 1\", \"Subtópico 2\", \"Subtópico 3\"]}. Cada subtópico deve ter texto curto (max 5 palavras).";

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
      max_tokens: 500
    });

    const content = completion.choices[0]?.message?.content ?? "";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return Response.json(
        { error: "A IA não retornou um formato válido. Tente novamente." },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as { subtopics: string[] };

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
