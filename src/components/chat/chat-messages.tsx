"use client";

import { useEffect, useRef } from "react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatMessagesProps = {
  messages: Message[];
  streamingContent?: string;
  onCreateMap?: (content: string) => void;
};

export function ChatMessages({ messages, streamingContent, onCreateMap }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  if (messages.length === 0 && !streamingContent) {
    return (
      <div className="chat-messages chat-messages--empty">
        <div className="chat-empty">
          <p className="chat-empty__title">Como posso ajudar?</p>
          <p className="chat-empty__hint">
            Pergunte qualquer coisa. Após a resposta, você pode criar um mapa mental com o conteúdo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((msg, idx) => (
        <div key={msg.id} className={`chat-bubble chat-bubble--${msg.role}`}>
          <p className="chat-bubble__text">{msg.content}</p>
          {msg.role === "assistant" && onCreateMap && idx === messages.length - 1 && !streamingContent && (
            <button
              type="button"
              className="button button--ai-toolbar button--sm chat-bubble__map-btn"
              onClick={() => onCreateMap(msg.content)}
            >
              ✨ Criar Mapa Mental
            </button>
          )}
        </div>
      ))}
      {streamingContent && (
        <div className="chat-bubble chat-bubble--assistant">
          <p className="chat-bubble__text">
            {streamingContent}
            <span className="chat-cursor">|</span>
          </p>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
