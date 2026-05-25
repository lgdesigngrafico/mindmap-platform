import Groq from "groq-sdk";

const SYSTEM_PROMPT =
  "Você é um especialista em mapas mentais. Dado um nó de mapa mental, gere 3-5 subtópicos relevantes. Responda APENAS com JSON válido no formato: {\"subtopics\": [{\"label\": \"Subtópico 1\", \"notes\": \"Instrução prática e acionável explicando o que fazer, como fazer e exemplos ou métricas relevantes. Escreva 50 a 150 palavras.\"}]}. Regras: (1) label: texto curto, 3-5 palavras. (2) notes: conteúdo PRÁTICO explicando O QUE FAZER e COMO FAZER com exemplos concretos.";

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

    const parsed = JSON.parse(jsonMatch[0]) as { subtopics: { label: string; notes: string }[] };

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
