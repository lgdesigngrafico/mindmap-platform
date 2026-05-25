import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/data/chat";
import { ChatLayoutClient } from "@/components/chat/chat-layout-client";

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const conversations = await getConversations(user.id);

  return (
    <ChatLayoutClient conversations={conversations}>
      {children}
    </ChatLayoutClient>
  );
}
