"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveMessageAction } from "@/lib/actions/chat";
import { ChatMessages } from "./chat-messages";
import { ChatInput } from "./chat-input";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type ChatWindowProps = {
  conversationId: string;
  initialMessages: Message[];
};

let msgCounter = 0;
function tempId() {
  return `tmp-${++msgCounter}-${Date.now()}`;
}

export function ChatWindow({ conversationId, initialMessages }: ChatWindowProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  async function handleSend(text: string) {
    const userMsg: Message = {
      id: tempId(),
      role: "user",
      content: text,
      created_at: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsStreaming(true);
    setStreamingContent("");

    await saveMessageAction(conversationId, "user", text);

    const payload = updatedMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, messages: payload })
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido." }));
        setMessages((prev) => [
          ...prev,
          {
            id: tempId(),
            role: "assistant",
            content: (err as { error?: string }).error ?? "Erro ao chamar a IA.",
            created_at: new Date().toISOString()
          }
        ]);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (raw === "[DONE]") continue;
          try {
            const parsed = JSON.parse(raw) as { token?: string; error?: string };
            if (parsed.error) {
              accumulated = parsed.error;
              break;
            }
            if (parsed.token) {
              accumulated += parsed.token;
              setStreamingContent(accumulated);
            }
          } catch {
            // ignore malformed
          }
        }
      }

      const assistantMsg: Message = {
        id: tempId(),
        role: "assistant",
        content: accumulated,
        created_at: new Date().toISOString()
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setStreamingContent("");

      await saveMessageAction(conversationId, "assistant", accumulated);
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleCreateMap(content: string) {
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: content.slice(0, 1000) })
      });

      if (!res.ok) {
        const err = await res.json() as { error?: string };
        alert(err.error ?? "Erro ao gerar mapa.");
        return;
      }

      const data = await res.json() as {
        nodes: { id: string; label: string; parentId: string | null; notes?: string }[];
      };

      const supaRes = await fetch("/api/maps/create-from-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: data.nodes, title: content.slice(0, 60) })
      });

      if (supaRes.ok) {
        const { mapId } = await supaRes.json() as { mapId: string };
        router.push(`/maps/${mapId}`);
      } else {
        router.push("/maps");
      }
    } catch {
      alert("Falha ao criar mapa mental.");
    }
  }

  return (
    <div className="chat-window">
      <ChatMessages
        messages={messages}
        streamingContent={streamingContent}
        onCreateMap={handleCreateMap}
      />
      <ChatInput onSend={handleSend} isStreaming={isStreaming} />
    </div>
  );
}
