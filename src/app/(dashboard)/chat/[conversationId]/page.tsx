import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getConversationById, getMessagesByConversationId } from "@/lib/data/chat";
import { ChatWindow } from "@/components/chat/chat-window";

type Props = {
  params: { conversationId: string };
};

export default async function ConversationPage({ params }: Props) {
  const user = await requireUser();
  const conversation = await getConversationById(params.conversationId, user.id);

  if (!conversation) notFound();

  const messages = await getMessagesByConversationId(conversation.id);

  return (
    <div className="chat-page">
      <div className="chat-page__header">
        <h2 className="chat-page__title">{conversation.title}</h2>
      </div>
      <ChatWindow
        conversationId={conversation.id}
        initialMessages={messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          created_at: m.created_at
        }))}
      />
    </div>
  );
}
