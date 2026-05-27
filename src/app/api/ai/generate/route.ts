import Groq from "groq-sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrandKitByClientId, buildBrandContext } from "@/lib/data/brand-kit";

export const runtime = "nodejs";

type RateLimitEntry = { count: number; resetAt: number };
const rateLimitMap = new Map<string, RateLimitEntry>();

const BASE_SYSTEM_PROMPT =
  "Você é um Social Media Strategist Sênior especializado em criação de carrosséis e conteúdo para redes sociais. " +
  "Dado um tema ou briefing, gere uma estrutura LIMPA de mapa mental para conteúdo de redes sociais. " +
  "REGRA ABSOLUTA: NUNCA crie sub-nós. A hierarquia é SEMPRE: 1 nó raiz → N nós filhos diretos (1 por slide). NÃO existe terceiro nível. " +
  "Cada nó filho representa UM slide completo e autossuficiente com todos os campos preenchidos. " +
  "Gere entre 5 a 8 slides por padrão (padrão Instagram). Se mencionarem 'reels' ou 'vídeo', adapte para roteiro com timing. " +
  "Slide 1 SEMPRE é hook de atenção (pergunta, dado chocante ou afirmação bold). " +
  "Último slide SEMPRE é CTA (chamar para ação: seguir, compartilhar, salvar, comentar). " +
  "Responda APENAS com JSON válido neste formato EXATO: " +
  "{\"nodes\": [" +
  "{\"id\": \"1\", \"label\": \"[Tema Central]\", \"parentId\": null, \"subtitle\": \"[resumo do carrossel em 1 linha]\", \"notes\": \"\", \"image_suggestion\": \"\"}," +
  "{\"id\": \"2\", \"label\": \"Slide 1: [título max 5 palavras]\", \"parentId\": \"1\", \"subtitle\": \"[conceito central do slide]\", \"notes\": \"[copy completa pronta pra postar: emojis, quebras de linha, linguagem de rede social, 50-150 palavras]\", \"image_suggestion\": \"[descrição do criativo visual ideal]\"}," +
  "{\"id\": \"3\", \"label\": \"Slide 2: [título max 5 palavras]\", \"parentId\": \"1\", \"subtitle\": \"...\", \"notes\": \"...\", \"image_suggestion\": \"...\"}," +
  "... mais slides com parentId sempre igual a '1' ]}. " +
  "REGRAS OBRIGATÓRIAS: " +
  "(1) APENAS 2 níveis: nó raiz (parentId: null) + slides filhos diretos (parentId: '1'). NUNCA crie parentId diferente de null ou '1'. " +
  "(2) Label é CURTO — máx 5 palavras — para o mapa ficar visualmente limpo. " +
  "(3) Notes contém a copy COMPLETA do slide: emojis, quebras de linha, linguagem de rede social. " +
  "(4) Subtitle é o conceito/hook central do slide em 1 linha. " +
  "(5) Image_suggestion descreve o criativo visual ideal para aquele slide. " +
  "(6) Pense como um estrategista: conteúdo persuasivo, prático e otimizado para engajamento máximo.";

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
