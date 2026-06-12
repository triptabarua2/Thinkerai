export type AgentType =
  | "ceo"
  | "research"
  | "coding"
  | "content"
  | "analysis"
  | "automation"
  | "planner";

export interface AgentDef {
  id: AgentType;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  systemHint: string;
}

export const AGENTS: Record<AgentType, AgentDef> = {
  ceo: {
    id: "ceo",
    name: "CEO Agent",
    shortName: "CEO",
    icon: "activity",
    color: "#FFB800",
    description: "Orchestrating",
    systemHint: "You are orchestrating this task. Break it into clear steps and execute methodically.",
  },
  research: {
    id: "research",
    name: "Research Agent",
    shortName: "Research",
    icon: "search",
    color: "#00D4FF",
    description: "Researching",
    systemHint: "You are in research mode. Provide thorough, well-structured information with clear sources and analysis.",
  },
  coding: {
    id: "coding",
    name: "Coding Agent",
    shortName: "Coding",
    icon: "code",
    color: "#7B61FF",
    description: "Coding",
    systemHint: "You are in coding mode. Write clean, well-commented, production-ready code with explanations.",
  },
  content: {
    id: "content",
    name: "Content Agent",
    shortName: "Content",
    icon: "edit-3",
    color: "#00D48A",
    description: "Writing",
    systemHint: "You are in content creation mode. Craft engaging, polished, and purposeful content.",
  },
  analysis: {
    id: "analysis",
    name: "Analysis Agent",
    shortName: "Analysis",
    icon: "bar-chart-2",
    color: "#FF6B35",
    description: "Analyzing",
    systemHint: "You are in analysis mode. Provide structured insights, data-driven conclusions, and actionable recommendations.",
  },
  automation: {
    id: "automation",
    name: "Automation Agent",
    shortName: "Automate",
    icon: "zap",
    color: "#FF4757",
    description: "Automating",
    systemHint: "You are in automation mode. Design efficient workflows, scripts, and automated pipelines.",
  },
  planner: {
    id: "planner",
    name: "Planner Agent",
    shortName: "Planner",
    icon: "map",
    color: "#A0FF50",
    description: "Planning",
    systemHint: "You are in planning mode. Create detailed, actionable plans with milestones and clear next steps.",
  },
};

export function detectAgentType(message: string): AgentType {
  const lower = message.toLowerCase();
  if (/\b(search|find|look up|research|information|what is|who is|when did|where is|history of)\b/.test(lower))
    return "research";
  if (/\b(code|build|develop|create app|write code|program|function|class|debug|script|api|database)\b/.test(lower))
    return "coding";
  if (/\b(write|draft|create|generate content|blog|article|essay|email|story|copy|marketing)\b/.test(lower))
    return "content";
  if (/\b(analyze|analysis|summarize|review|compare|evaluate|data|metrics|insights|report)\b/.test(lower))
    return "analysis";
  if (/\b(automate|automation|workflow|schedule|task|repeat|trigger|pipeline|process)\b/.test(lower))
    return "automation";
  if (/\b(plan|strategy|roadmap|steps|breakdown|organize|goals|milestones)\b/.test(lower))
    return "planner";
  return "ceo";
}
