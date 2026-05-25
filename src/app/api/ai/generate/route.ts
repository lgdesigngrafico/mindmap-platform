import Groq from "groq-sdk";

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();

const SYSTEM_PROMPT =
  "Você é um especialista em criação de conteúdo visual e mapas mentais. Dado o tema do usuário, gere uma estrutura hierárquica com 8-15 nós onde CADA NÓ representa um SLIDE ou CARD de conteúdo visual (para carrosséis, posts, apresentações). Responda APENAS com JSON válido no formato: {\"nodes\": [{\"id\": \"1\", \"label\": \"TÍTULO DO SLIDE\", \"parentId\": null, \"subtitle\": \"Frase de apoio ou contexto\", \"notes\": \"Texto corpo completo do slide com detalhes práticos, instruções e exemplos. Escreva 50 a 150 palavras.\", \"image_suggestion\": \"Descrição da imagem ideal: ex. foto de pessoa feliz trabalhando em home office, fundo desfocado\"}]}. Regras: (1) label: título curto e impactante, 3-5 palavras. (2) subtitle: frase de apoio ou contexto, 1 linha. (3) notes: conteúdo PRÁTICO — O QUE FAZER, COMO FAZER, exemplos e métricas, 50-150 palavras. (4) image_suggestion: descrição visual clara e específica da imagem ideal para aquele card. (5) Crie hierarquia com 2-3 níveis de profundidade.";

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) {
      return Response.json(
        { error: "Limite de requisições atingido. Aguarde 1 minuto." },
        { status: 429 }
      );
    }
    entry.count++;
  } else {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
  }

  let prompt: string;
  try {
    const body = await req.json();
    prompt = body.prompt as string;
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "Prompt é obrigatório." }, { status: 400 });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "GROQ_API_KEY não configurada." }, { status: 500 });
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Tema: ${prompt.trim()}` }
      ],
      temperature: 0.7,
      max_tokens: 4000
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
      nodes: { id: string; label: string; parentId: string | null; subtitle?: string; notes?: string; image_suggestion?: string }[];
    };

    if (!Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
      return Response.json(
        { error: "Estrutura de mapa inválida retornada pela IA." },
        { status: 500 }
      );
    }

    return Response.json(parsed);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar a IA.";
    return Response.json({ error: message }, { status: 500 });
  }
}
