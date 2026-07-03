import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export interface Workflow {
  id: string;
  name: string;
  prompt: string;
  createdAt: number;
  updatedAt: number;
}

interface WorkflowContextValue {
  workflows: Workflow[];
  createWorkflow: (name: string, prompt: string) => Promise<Workflow>;
  updateWorkflow: (id: string, name: string, prompt: string) => Promise<void>;
  deleteWorkflow: (id: string) => Promise<void>;
  getWorkflow: (id: string) => Workflow | undefined;
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);
const STORAGE_KEY = "@thinkai_workflows_v1";

let idCounter = 0;
function generateId(): string {
  idCounter++;
  return `wf-${Date.now()}-${idCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((data) => {
      if (data) {
        try {
          setWorkflows(JSON.parse(data) as Workflow[]);
        } catch {}
      }
    });
  }, []);

  const persist = useCallback(async (wfs: Workflow[]) => {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(wfs));
  }, []);

  const createWorkflow = useCallback(
    async (name: string, prompt: string): Promise<Workflow> => {
      const now = Date.now();
      const wf: Workflow = { id: generateId(), name: name.trim(), prompt: prompt.trim(), createdAt: now, updatedAt: now };
      setWorkflows((prev) => {
        const next = [wf, ...prev];
        persist(next);
        return next;
      });
      return wf;
    },
    [persist]
  );

  const updateWorkflow = useCallback(
    async (id: string, name: string, prompt: string) => {
      setWorkflows((prev) => {
        const next = prev.map((w) =>
          w.id === id ? { ...w, name: name.trim(), prompt: prompt.trim(), updatedAt: Date.now() } : w
        );
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const deleteWorkflow = useCallback(
    async (id: string) => {
      setWorkflows((prev) => {
        const next = prev.filter((w) => w.id !== id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const getWorkflow = useCallback(
    (id: string) => workflows.find((w) => w.id === id),
    [workflows]
  );

  return (
    <WorkflowContext.Provider value={{ workflows, createWorkflow, updateWorkflow, deleteWorkflow, getWorkflow }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflows() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error("useWorkflows must be used within WorkflowProvider");
  return ctx;
}
