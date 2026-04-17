"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { trpc } from "@/lib/trpc/client";

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
  const [seedMessages, setSeedMessages] = useState<UIMessage[] | undefined>(undefined);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load latest conversation on mount
  const { data: latestConversation } = trpc.conversation.getLatest.useQuery(
    undefined,
    { enabled: !loaded }
  );

  useEffect(() => {
    if (latestConversation && !loaded) {
      setSeedMessages(latestConversation.messages as UIMessage[]);
      setConversationId(latestConversation.id);
      setLoaded(true);
    } else if (latestConversation === null && !loaded) {
      setLoaded(true);
    }
  }, [latestConversation, loaded]);

  const upsertMutation = trpc.conversation.upsert.useMutation({
    onSuccess: (data) => {
      if (!conversationId) setConversationId(data.id);
    },
  });

  const { messages, sendMessage: rawSendMessage, status } = useChat({
    transport: chatTransport,
    messages: seedMessages,
  });

  // Save messages when status transitions to "ready" (debounced)
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current !== "ready" && status === "ready" && messages.length > 0) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        upsertMutation.mutate({
          conversationId: conversationId ?? undefined,
          messages,
        });
      }, 1000);
    }
    prevStatusRef.current = status;
  }, [status, messages, conversationId, upsertMutation]);

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
