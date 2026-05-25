"use client";

import { useRouter } from "next/navigation";
import { createConversationAction } from "@/lib/actions/chat";
import { ConversationList } from "@/components/chat/conversation-list";
import type { ReactNode } from "react";

type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

type ChatLayoutClientProps = {
  conversations: Conversation[];
  children: ReactNode;
};

export function ChatLayoutClient({ conversations, children }: ChatLayoutClientProps) {
  const router = useRouter();

  async function handleNewChat() {
    const id = await createConversationAction();
    router.push(`/chat/${id}`);
  }

  return (
    <div className="chat-layout">
      <ConversationList conversations={conversations} onNewChat={handleNewChat} />
      <div className="chat-main">{children}</div>
    </div>
  );
}
