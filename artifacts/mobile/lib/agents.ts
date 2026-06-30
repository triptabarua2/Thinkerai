export type AgentType =
  | "ceo"
  | "planner"
  | "research"
  | "coding"
  | "browser"
  | "file"
  | "git"
  | "devops"
  | "memory"
  | "security"
  | "qa"
  | "video"
  | "image"
  | "music"
  | "canvas"
  | "automation"
  | "report";

export type AgentPlanTier = "free" | "pro";

export interface AgentDef {
  id: AgentType;
  name: string;
  shortName: string;
  icon: string;
  color: string;
  description: string;
  capability: string;
  placeholder: string;
  planTier: AgentPlanTier;
}

// Free (9): CEO, Coding, Research, Planner, Browser, File, QA, Canvas, Image
// Pro  (8): Git, Memory, Video, Music, DevOps, Security, Automation, Report
export const AGENTS: Record<AgentType, AgentDef> = {
  ceo: {
    id: "ceo",
    name: "CEO Agent",
    shortName: "CEO",
    icon: "activity",
    color: "#FFB800",
    description: "Orchestrating",
    capability: "Orchestrate & execute complex goals",
    placeholder: "What complex goal should I orchestrate for you?",
    planTier: "free",
  },
  planner: {
    id: "planner",
    name: "Planner Agent",
    shortName: "Planner",
    icon: "map",
    color: "#A0FF50",
    description: "Planning",
    capability: "Roadmaps, milestones & strategies",
    placeholder: "Describe the roadmap or strategy you need...",
    planTier: "free",
  },
  research: {
    id: "research",
    name: "Research Agent",
    shortName: "Research",
    icon: "search",
    color: "#00D4FF",
    description: "Researching",
    capability: "Deep research & knowledge synthesis",
    placeholder: "What topic should I research deeply?",
    planTier: "free",
  },
  coding: {
    id: "coding",
    name: "Coding Agent",
    shortName: "Coding",
    icon: "code",
    color: "#7B61FF",
    description: "Coding",
    capability: "Production-ready code in any language",
    placeholder: "Describe the app, feature, or bug to fix...",
    planTier: "free",
  },
  browser: {
    id: "browser",
    name: "Browser Agent",
    shortName: "Browser",
    icon: "globe",
    color: "#00D4AA",
    description: "Browsing",
    capability: "Web automation & scraping",
    placeholder: "Which website should I automate or scrape?",
    planTier: "free",
  },
  file: {
    id: "file",
    name: "File Agent",
    shortName: "Files",
    icon: "folder",
    color: "#FF9500",
    description: "Processing",
    capability: "Parse & transform any file format",
    placeholder: "Describe the file to parse or transform...",
    planTier: "free",
  },
  qa: {
    id: "qa",
    name: "QA Agent",
    shortName: "QA",
    icon: "check-circle",
    color: "#34C759",
    description: "Testing",
    capability: "Test suites & quality assurance",
    placeholder: "Describe the feature or code to test...",
    planTier: "free",
  },
  canvas: {
    id: "canvas",
    name: "Canvas Agent",
    shortName: "Canvas",
    icon: "pen-tool",
    color: "#30D158",
    description: "Drawing",
    capability: "Diagrams, mind maps & architecture",
    placeholder: "Describe the diagram or architecture to draw...",
    planTier: "free",
  },
  image: {
    id: "image",
    name: "Image Agent",
    shortName: "Image",
    icon: "image",
    color: "#BF5AF2",
    description: "Generating",
    capability: "Image generation prompts & visual design",
    placeholder: "Describe the image or visual you want...",
    planTier: "free",
  },
  // ── Pro agents ────────────────────────────────────────────────
  git: {
    id: "git",
    name: "Git Agent",
    shortName: "Git",
    icon: "git-branch",
    color: "#FF6B6B",
    description: "Version control",
    capability: "Git workflows & repository management",
    placeholder: "What git task or workflow do you need?",
    planTier: "pro",
  },
  memory: {
    id: "memory",
    name: "Memory Agent",
    shortName: "Memory",
    icon: "database",
    color: "#FF61DC",
    description: "Remembering",
    capability: "Knowledge base & context management",
    placeholder: "What should I remember or recall for you?",
    planTier: "pro",
  },
  video: {
    id: "video",
    name: "Video Agent",
    shortName: "Video",
    icon: "video",
    color: "#FF2D87",
    description: "Creating",
    capability: "Video scripts, editing & production",
    placeholder: "What video should I script or produce?",
    planTier: "pro",
  },
  music: {
    id: "music",
    name: "Music Agent",
    shortName: "Music",
    icon: "music",
    color: "#5E5CE6",
    description: "Composing",
    capability: "Music composition & audio production",
    placeholder: "What music or audio should I compose?",
    planTier: "pro",
  },
  devops: {
    id: "devops",
    name: "DevOps Agent",
    shortName: "DevOps",
    icon: "server",
    color: "#6C8EFF",
    description: "Deploying",
    capability: "Docker, CI/CD & cloud infrastructure",
    placeholder: "Describe your deployment or infra setup...",
    planTier: "pro",
  },
  security: {
    id: "security",
    name: "Security Agent",
    shortName: "Security",
    icon: "shield",
    color: "#FF3B30",
    description: "Securing",
    capability: "Security audits & vulnerability fixes",
    placeholder: "What system should I audit for vulnerabilities?",
    planTier: "pro",
  },
  automation: {
    id: "automation",
    name: "Automation Agent",
    shortName: "Automate",
    icon: "zap",
    color: "#FF6D00",
    description: "Automating",
    capability: "Workflows, scripts & pipelines",
    placeholder: "What workflow or process should I automate?",
    planTier: "pro",
  },
  report: {
    id: "report",
    name: "Report Agent",
    shortName: "Report",
    icon: "file-text",
    color: "#FFD60A",
    description: "Reporting",
    capability: "Reports, analysis & documentation",
    placeholder: "What report or document should I create?",
    planTier: "pro",
  },
};

export const AGENT_LIST: AgentDef[] = Object.values(AGENTS);

export const FREE_AGENTS = new Set<AgentType>(
  AGENT_LIST.filter((a) => a.planTier === "free").map((a) => a.id)
);

export const DOMAIN_LIST = [
  "general", "coding", "design", "devops", "security",
  "research", "writing", "music", "video", "automation",
  "marketing", "finance", "legal", "education", "healthcare", "analytics",
] as const;
export type Domain = (typeof DOMAIN_LIST)[number];

export const DOMAIN_META: Record<Domain, { icon: string; label: string; color: string }> = {
  general:    { icon: "activity",    label: "CEO Agent",        color: "#FFB800" },
  coding:     { icon: "code",        label: "Coding",           color: "#7B61FF" },
  devops:     { icon: "server",      label: "DevOps",           color: "#6C8EFF" },
  security:   { icon: "shield",      label: "Security",         color: "#FF3B30" },
  music:      { icon: "music",       label: "Music",            color: "#5E5CE6" },
  design:     { icon: "pen-tool",    label: "Design",           color: "#30D158" },
  analytics:  { icon: "bar-chart-2", label: "Data / Analytics", color: "#00D4FF" },
  marketing:  { icon: "trending-up", label: "Marketing",        color: "#FF6B6B" },
  finance:    { icon: "dollar-sign", label: "Finance",          color: "#34C759" },
  legal:      { icon: "file-text",   label: "Legal",            color: "#A0A0B0" },
  research:   { icon: "search",      label: "Research",         color: "#00D4AA" },
  education:  { icon: "book-open",   label: "Education",        color: "#FF9500" },
  healthcare: { icon: "heart",       label: "Healthcare",       color: "#FF2D87" },
  writing:    { icon: "edit-2",      label: "Writing",          color: "#BF5AF2" },
  video:      { icon: "video",       label: "Video",            color: "#FF6D00" },
  automation: { icon: "zap",         label: "Automation",       color: "#FFD60A" },
};

export function agentTypeToDomain(agentType: AgentType): Domain {
  const map: Record<AgentType, Domain> = {
    ceo: "general",
    planner: "general",
    research: "research",
    coding: "coding",
    browser: "coding",
    file: "general",
    git: "coding",
    devops: "devops",
    memory: "general",
    security: "security",
    qa: "coding",
    video: "video",
    image: "design",
    music: "music",
    canvas: "design",
    automation: "automation",
    report: "writing",
  };
  return map[agentType] ?? "general";
}

export function detectAgentType(message: string): AgentType {
  const lower = message.toLowerCase();
  if (/\b(secure|security|vulnerability|auth|encrypt|hack|pentest|owasp)\b/.test(lower))
    return "security";
  if (/\b(test|qa|quality|bug|assert|spec|jest|pytest|coverage|unit test)\b/.test(lower))
    return "qa";
  if (/\b(docker|kubernetes|deploy|ci.?cd|devops|aws|cloud|server|nginx|terraform)\b/.test(lower))
    return "devops";
  if (/\b(git|commit|push|pull request|branch|merge|github|gitlab|repo)\b/.test(lower))
    return "git";
  if (/\b(scrape|playwright|puppeteer|automate browser|web crawl|selenium)\b/.test(lower))
    return "browser";
  if (/\b(file|pdf|docx|csv|parse|read file|upload|document|convert)\b/.test(lower))
    return "file";
  if (/\b(diagram|flowchart|mindmap|architecture diagram|whiteboard|mermaid|draw)\b/.test(lower))
    return "canvas";
  if (/\b(report|dashboard|kpi|metrics|data visualization|analytics|insights)\b/.test(lower))
    return "report";
  if (/\b(video|script|subtitle|clip|youtube|tiktok|reel|edit video)\b/.test(lower))
    return "video";
  if (/\b(image|photo|generate image|midjourney|dall.?e|stable diffusion|design)\b/.test(lower))
    return "image";
  if (/\b(music|song|audio|melody|chord|compose|podcast|sound)\b/.test(lower))
    return "music";
  if (/\b(automate|automation|workflow|schedule|cron|pipeline|trigger|zapier)\b/.test(lower))
    return "automation";
  if (/\b(search|find|look up|research|information|what is|who is|when did|history of)\b/.test(lower))
    return "research";
  if (/\b(code|build|develop|create app|write code|program|function|class|debug|script|api|database)\b/.test(lower))
    return "coding";
  if (/\b(write|draft|create content|blog|article|essay|email|story|copy|marketing)\b/.test(lower))
    return "report";
  if (/\b(plan|strategy|roadmap|steps|breakdown|organize|goals|milestones)\b/.test(lower))
    return "planner";
  if (/\b(remember|memory|store|recall|knowledge|context|save)\b/.test(lower))
    return "memory";
  return "ceo";
}
