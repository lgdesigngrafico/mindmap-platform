import Groq from "groq-sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrandKitByClientId, buildBrandContext } from "@/lib/data/brand-kit";

export const runtime = "nodejs";

const BASE_SYSTEM_PROMPT =
  "Você é um Social Media Strategist especializado em criação de conteúdo para redes sociais, carrosséis, posts e campanhas digitais. " +
  "Pense sempre como um estrategista de conteúdo: foque em engajamento, persuasão, clareza e valor prático para o público. " +
  "Quando o usuário pedir ideias de conteúdo, estruture as respostas com a lógica de carrossel/slides: " +
  "Slide 1 (gancho/capa), slides intermediários (conteúdo/valor), slide final (CTA). " +
  "Para cada slide sugira: Título impactante, Subtítulo de apoio, Copy do corpo e referência de criativo visual. " +
  "Responda de forma clara, objetiva e em português do Brasil. " +
  "Quando fizer sentido, use listas e tópicos para facilitar a organização em mapas mentais.";

export async function POST(req: Request) {
  let body: { conversationId: string; messages: { role: string; content: string }[]; clientId?: string };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Requisição inválida." }, { status: 400 });
  }

  const { messages, clientId } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return Response.json({ error: "Mensagens inválidas." }, { status: 400 });
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
              "\n\nINFORMAÇÕES DA MARCA DO CLIENTE (adapte o conteúdo de acordo):\n" +
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

    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      ],
      temperature: 0.7,
      max_tokens: 2048,
      stream: true
    });

    const encoder = new TextEncoder();

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const token = chunk.choices[0]?.delta?.content ?? "";
            if (token) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: err instanceof Error ? err.message : "Erro no stream." })}\n\n`
            )
          );
        } finally {
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao chamar a IA.";
    return Response.json({ error: message }, { status: 500 });
  }
}
