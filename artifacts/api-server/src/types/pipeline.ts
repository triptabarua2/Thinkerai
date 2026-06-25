export type IntentType = "chat" | "app" | "website" | "game" | "task";

export type ThinkingLevel = "low" | "medium" | "high" | "consensus";

export type NextAction = "proceed" | "retry" | "replan" | "clarify" | "escalate" | "direct_answer" | "halt";

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: "choice" | "boolean" | "text";
  options?: string[];
  layer?: "goal" | "problem" | "audience" | "mvp" | "success" | "constraint" | "assumption";
}

export interface PlanStep {
  id: string;
  description: string;
  outputType: "code" | "text" | "config" | "image";
  dependencies: string[];
  needsResearch: boolean;
}

export interface ResearchFinding {
  stepId: string;
  findings: string;
}

export interface BuilderOutput {
  artifactType: "code" | "content" | "config";
  content: string;
}

export interface ReviewIssue {
  description: string;
  severity: "low" | "medium" | "high";
}

export interface ReviewerResult {
  passed: boolean;
  issues: ReviewIssue[];
}

export interface CriticResult {
  concerns: ReviewIssue[];
  overallSeverity: "low" | "medium" | "high";
}

export interface JudgeScore {
  accuracy: number;
  feasibility: number;
  safety: number;
  cost: number;
  completeness: number;
}

export interface JudgeResult {
  scores: JudgeScore;
  totalScore: number;
  approved: boolean;
  borderline: boolean;
  reasoning: string;
}

export interface ConsensusVote {
  persona: string;
  verdict: "approve" | "reject";
  reasoning: string;
}

export interface ConsensusResult {
  votes: ConsensusVote[];
  finalVerdict: "approve" | "reject";
  approveCount: number;
}

export interface RoutingHistoryEntry {
  agent: string;
  next_action: NextAction;
  reason: string;
  model_used?: string;
  timestamp: number;
}

export interface FailoverLogEntry {
  agent: string;
  failed_model: string;
  replacement_model: string;
  timestamp: number;
  peer_audit_result?: string;
}

export interface AssumptionFlag {
  assumption: string;
  status: "confirmed" | "uncertain" | "flagged";
}

export interface ConstraintFindings {
  time?: string;
  budget?: string;
  skill?: string;
  network?: string;
  existingAssets?: string;
  [key: string]: string | undefined;
}

export type PlanTier = "free" | "pro" | "founder" | "enterprise";

export interface PipelineState {
  id: string;
  intentType: IntentType;
  thinkingLevel: ThinkingLevel;
  planTier: PlanTier;

  requirements: Record<string, string>;
  requirementsComplete: boolean;
  clarificationQuestions: ClarificationQuestion[];

  signatureQuestionResponse: string | null;
  signatureQuestionAnswered: boolean;

  constraintFindings: ConstraintFindings;
  assumptionFlags: AssumptionFlag[];
  clarificationDepth: number;
  clarificationLayers: string[];
  goalDiscoveryMode: boolean;

  plan: PlanStep[];
  strategyBrief: string | null;
  researchFindings: ResearchFinding[];
  builderOutput: BuilderOutput | null;
  reviewerResult: ReviewerResult | null;
  criticResult: CriticResult | null;
  judgeResult: JudgeResult | null;
  consensusResult: ConsensusResult | null;

  current_agent: string;
  routing_history: RoutingHistoryEntry[];
  loop_counts: Record<string, number>;
  failover_log: FailoverLogEntry[];
  peer_audit_flag: boolean;
  resume_from_agent: string | null;

  status: PipelineStatus;
  finalContent: string;

  thinkCreditsUsed: number;
  agentLogs: AgentLog[];
}

export interface AgentLog {
  agent_name: string;
  input_summary: string;
  output_summary: string;
  duration_ms: number;
  status: "success" | "failed" | "skipped";
  error_detail?: string;
  confidence?: number;
  retry_count: number;
  failover_cost: number;
}

export type PipelineStatus =
  | "classifying"
  | "clarifying"
  | "strategy"
  | "planning"
  | "researching"
  | "building"
  | "reviewing"
  | "critiquing"
  | "judging"
  | "consensus"
  | "complete"
  | "failed"
  | "halted"
  | "awaiting_signature";

export type PipelineEvent =
  | { type: "agent_start"; agent: string; label: string }
  | { type: "agent_done"; agent: string; data: unknown }
  | { type: "clarification_needed"; questions: ClarificationQuestion[]; intent: IntentType; layer?: string }
  | { type: "signature_question"; question: string }
  | { type: "strategy_brief"; brief: string; assessment: string; founderMode: boolean }
  | { type: "thinking_summary"; summary: string; thinkingLevel: ThinkingLevel; estimatedCredits: number }
  | { type: "content"; text: string }
  | { type: "pipeline_retry"; agent: string; attempt: number }
  | { type: "pipeline_halt"; reason: string; completedSteps: number; totalSteps: number }
  | { type: "failover"; agent: string; message: string }
  | { type: "credit_confirm"; action: string; credits: number; balance: number }
  | { type: "done"; status: "complete" | "failed" | "halted"; error?: string };
