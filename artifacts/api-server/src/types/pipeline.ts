export type IntentType = "chat" | "app" | "website" | "game" | "task";

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: "choice" | "boolean" | "text";
  options?: string[];
}

export interface PlanStep {
  id: string;
  description: string;
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

export type PipelineStatus =
  | "classifying"
  | "clarifying"
  | "planning"
  | "researching"
  | "building"
  | "reviewing"
  | "critiquing"
  | "judging"
  | "consensus"
  | "complete"
  | "failed";

export interface PipelineState {
  id: string;
  intentType: IntentType;
  requirements: Record<string, string>;
  requirementsComplete: boolean;
  clarificationQuestions: ClarificationQuestion[];
  plan: PlanStep[];
  researchFindings: ResearchFinding[];
  builderOutput: BuilderOutput | null;
  reviewerResult: ReviewerResult | null;
  criticResult: CriticResult | null;
  judgeResult: JudgeResult | null;
  consensusResult: ConsensusResult | null;
  status: PipelineStatus;
  finalContent: string;
}

export type PipelineEvent =
  | { type: "agent_start"; agent: string; label: string }
  | { type: "agent_done"; agent: string; data: unknown }
  | { type: "clarification_needed"; questions: ClarificationQuestion[]; intent: IntentType }
  | { type: "content"; text: string }
  | { type: "pipeline_retry"; agent: string; attempt: number }
  | { type: "done"; status: "complete" | "failed"; error?: string };
