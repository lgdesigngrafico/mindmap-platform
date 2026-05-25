"use client";

import { useRef, useState } from "react";

type ChatInputProps = {
  onSend: (text: string) => void;
  isStreaming: boolean;
};

export function ChatInput({ onSend, isStreaming }: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isStreaming) return;
    onSend(trimmed);
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as unknown as React.FormEvent);
    }
  }

  function handleInput(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <textarea
        ref={textareaRef}
        className="chat-input__textarea"
        placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={isStreaming}
      />
      <button
        type="submit"
        className="button button--primary chat-input__send"
        disabled={!value.trim() || isStreaming}
      >
        {isStreaming ? "..." : "Enviar"}
      </button>
    </form>
  );
}
