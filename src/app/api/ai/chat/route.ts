import Groq from "groq-sdk";
import { getCurrentUser } from "@/lib/auth/session";
import { getBrandKitByClientId, buildBrandContext } from "@/lib/data/brand-kit";

export const runtime = "nodejs";

const BASE_SYSTEM_PROMPT =
  "Você é um Estrategista Digital Sênior especializado em Social Media. Você cria conteúdo profissional pronto para publicação. " +
  "Suas respostas são DIRETAS e PRÁTICAS — você entrega conteúdo pronto, não ideias vagas. " +
  "Você domina: copywriting para redes sociais, storytelling, hooks de atenção, CTAs eficientes, tendências de engajamento 2025-2026. " +
  "Quando criar conteúdo, estruture por slides numerados. Cada slide deve ter: título do slide, copy completa (com emojis, formatação, linguagem de rede social) e descrição do criativo visual. " +
  "Slide 1 = sempre hook de atenção (pergunta, dado chocante ou afirmação bold). Último slide = sempre CTA. " +
  "Se o usuário mencionar uma plataforma específica, adapte o formato: carrossel Instagram = 5-10 slides, Reels = roteiro com timing (hook 3s, desenvolvimento, CTA), LinkedIn = tom profissional. " +
  "Se tem informações da marca do cliente, adapte tom de voz automaticamente. " +
  "Seja objetivo. Entregue conteúdo que o social media manager pode copiar e postar HOJE.";

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
