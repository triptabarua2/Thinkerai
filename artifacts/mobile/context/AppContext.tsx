import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { AgentType } from "@/lib/agents";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentType?: AgentType;
  timestamp: number;
  language?: string;
}

export interface DecisionMemoryEntry {
  rule: string;
  detectedAt: number;
  applies_to: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  agentType?: AgentType;
  pinnedAt?: number;
  detectedLanguage?: string;
  decisionMemory?: DecisionMemoryEntry[];
  medium_fix_count?: number;
  full_rebuild_count?: number;
}

interface AppContextValue {
  conversations: Conversation[];
  createConversation: (title?: string, agentType?: AgentType) => Promise<string>;
  updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
  pinConversation: (id: string, pinned: boolean) => Promise<void>;
  getConversation: (id: string) => Conversation | undefined;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  profileSheetOpen: boolean;
  setProfileSheetOpen: (open: boolean) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
const STORAGE_KEY = "@thinkai_conversations_v2";

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `conv-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileSheetOpen, setProfileSheetOpen] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          const parsed = JSON.parse(data) as Conversation[];
          setConversations(parsed);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback(async (convs: Conversation[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
  }, []);

  const createConversation = useCallback(
    async (title = "New Chat", agentType?: AgentType): Promise<string> => {
      const id = generateId();
      const now = Date.now();
      const conv: Conversation = {
        id,
        title,
        messages: [],
        createdAt: now,
        updatedAt: now,
        agentType,
        decisionMemory: [],
        medium_fix_count: 0,
        full_rebuild_count: 0,
      };
      setConversations((prev) => {
        const next = [conv, ...prev];
        persist(next);
        return next;
      });
      return id;
    },
    [persist]
  );

  const updateConversation = useCallback(
    async (id: string, updates: Partial<Conversation>) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === id ? { ...c, ...updates, updatedAt: Date.now() } : c
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const deleteConversation = useCallback(
    async (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const pinConversation = useCallback(
    async (id: string, pinned: boolean) => {
      setConversations((prev) => {
        const next = prev.map((c) =>
          c.id === id
            ? { ...c, pinnedAt: pinned ? Date.now() : undefined }
            : c
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const getConversation = useCallback(
    (id: string) => conversations.find((c) => c.id === id),
    [conversations]
  );

  return (
    <AppContext.Provider
      value={{
        conversations,
        createConversation,
        updateConversation,
        deleteConversation,
        pinConversation,
        getConversation,
        sidebarOpen,
        setSidebarOpen,
        profileSheetOpen,
        setProfileSheetOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
