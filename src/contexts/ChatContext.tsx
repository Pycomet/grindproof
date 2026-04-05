"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";

const chatTransport = new DefaultChatTransport({ api: "/api/ai/chat" });

interface ChatContextType {
  messages: ReturnType<typeof useChat>["messages"];
  sendMessage: (text: string) => void;
  status: ReturnType<typeof useChat>["status"];
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  input: string;
  setInput: (input: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");

  const { messages, sendMessage: rawSendMessage, status } = useChat({
    transport: chatTransport,
  });

  const sendMessage = useCallback(
    (text: string) => {
      rawSendMessage({ text });
    },
    [rawSendMessage]
  );

  return (
    <ChatContext.Provider
      value={{ messages, sendMessage, status, isOpen, setIsOpen, input, setInput }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (!context)
    throw new Error("useChatContext must be used within ChatProvider");
  return context;
}
