import Groq from "groq-sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrandKitByClientId, buildBrandContext } from "@/lib/data/brand-kit";

export const runtime = "nodejs";

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();

const BASE_SYSTEM_PROMPT =
  "Você é um Social Media Strategist especializado em criação de carrosséis, posts e conteúdo para redes sociais. " +
  "Dado o tema do usuário, gere uma estrutura hierárquica FIXA para conteúdo de redes sociais. " +
  "SEMPRE siga esta estrutura EXATA: 1 nó raiz (tema central) + grupos de slides onde CADA SLIDE tem EXATAMENTE 4 nós filhos. " +
  "Gere entre 4 a 7 slides por padrão, a menos que o usuário especifique outro número. " +
  "Responda APENAS com JSON válido neste formato exato: " +
  "{\"nodes\": [" +
  "{\"id\": \"1\", \"label\": \"Tema Central: [tema]\", \"parentId\": null, \"notes\": \"\"}," +
  "{\"id\": \"2\", \"label\": \"Slide 1\", \"parentId\": \"1\", \"notes\": \"\"}," +
  "{\"id\": \"3\", \"label\": \"TÍTULO: [headline impactante, máx 10 palavras]\", \"parentId\": \"2\", \"notes\": \"[headline completo e impactante]\"}," +
  "{\"id\": \"4\", \"label\": \"SUBTÍTULO: [frase de apoio]\", \"parentId\": \"2\", \"notes\": \"[frase de apoio ou contexto, 1 linha]\"}," +
  "{\"id\": \"5\", \"label\": \"TEXTO CORPO\", \"parentId\": \"2\", \"notes\": \"[copy completa do slide, 50-150 palavras, conteúdo PRÁTICO com o que fazer, como fazer, exemplos e métricas]\"}," +
  "{\"id\": \"6\", \"label\": \"CRIATIVO REFERÊNCIA\", \"parentId\": \"2\", \"notes\": \"[descrição detalhada da imagem ou vídeo ideal para este slide, ex: foto de pessoa sorrindo em frente ao computador, fundo minimalista branco]\"}," +
  "{\"id\": \"7\", \"label\": \"Slide 2\", \"parentId\": \"1\", \"notes\": \"\"}," +
  "... continuar o padrão para todos os slides ]}. " +
  "REGRAS OBRIGATÓRIAS: (1) NUNCA omita nenhum dos 4 elementos por slide (TÍTULO, SUBTÍTULO, TEXTO CORPO, CRIATIVO REFERÊNCIA). " +
  "(2) Cada slide DEVE ter exatamente 4 nós filhos. " +
  "(3) O nó TÍTULO deve ter o prefixo 'TÍTULO:' no label. " +
  "(4) O nó SUBTÍTULO deve ter o prefixo 'SUBTÍTULO:' no label. " +
  "(5) Os nós TEXTO CORPO e CRIATIVO REFERÊNCIA têm o conteúdo apenas no campo notes. " +
  "(6) Pense como um estrategista de redes sociais: conteúdo persuasivo, prático e otimizado para engajamento.";

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
  let clientId: string | undefined;
  try {
    const body = await req.json();
    prompt = body.prompt as string;
    clientId = body.clientId as string | undefined;
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

  // Build system prompt, optionally injecting brand kit context
  let systemPrompt = BASE_SYSTEM_PROMPT;
  if (clientId) {
    try {
      const user = await getCurrentUser();
      if (user) {
        const brandKit = await getBrandKitByClientId(clientId);
        if (brandKit && brandKit.user_id === user.id) {
          const brandContext = await buildBrandContext(brandKit);
          if (brandContext) {
            systemPrompt =
              systemPrompt +
              "\n\nINFORMAÇÕES DA MARCA DO CLIENTE (use para personalizar o conteúdo):\n" +
              brandContext;
          }
        }
      }
    } catch {
      // ignore brand kit errors, continue without it
    }
  }

  try {
    const groq = new Groq({ apiKey });

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
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
