import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { getConversations } from "@/lib/data/chat";
import { createConversationAction } from "@/lib/actions/chat";

export default async function ChatPage() {
  const user = await requireUser();
  const conversations = await getConversations(user.id);

  if (conversations.length > 0) {
    redirect(`/chat/${conversations[0].id}`);
  }

  const newId = await createConversationAction();
  redirect(`/chat/${newId}`);
}
