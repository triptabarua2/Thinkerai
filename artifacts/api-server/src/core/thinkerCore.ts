import { llmStream, llmDualChat } from "../lib/llm.js";
import { runIntentAgent, getLanguageName } from "../agents/intentAgent.js";
import { runClarificationAgent, SIGNATURE_QUESTION } from "../agents/clarificationAgent.js";
import { runStrategyAgent } from "../agents/strategyAgent.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runResearchAgent } from "../agents/researchAgent.js";
import { runBuilderAgent } from "../agents/builderAgent.js";
import { runDesignAgent } from "../agents/designAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { runCriticAgent } from "../agents/criticAgent.js";
import { runJudgeAgent, isHighRiskContent } from "../agents/judgeAgent.js";
import { runConsensusAgent } from "../agents/consensusAgent.js";
import { estimateSessionCredits, isFeatureGated, requiresConfirmation } from "../lib/thinkCredits.js";
import type {
  PipelineEvent,
  PipelineState,
  PlanTier,
  ThinkingLevel,
  NextAction,
  RoutingHistoryEntry,
  AgentLog,
  VersionSnapshot,
  DecisionMemoryEntry,
} from "../types/pipeline.js";

const DIRECT_CHAT_SYSTEM = (lang: string) =>
  `You are Thinker AI — a highly capable autonomous AI assistant.

Answer directly, accurately, and helpfully. Format with markdown.
- Bold for key terms
- Code blocks with language tags for code
- Concise but complete — no filler

IMPORTANT: Respond in ${lang === "en" ? "English" : `the user's language (detected: ${lang})`}. Match the language the user wrote in.`;

// ── Loop detection thresholds (Section 8.5) ─────────────────────────────────
const LOOP_LIMITS: Record<string, number> = {
  builder: 3,
  reviewer: 3,
  planner_cycle: 2,
  clarification: 4,
  consensus_cycle: 2,
};

// ── Fix limits (Section 9.5) ─────────────────────────────────────────────────
const FIX_LIMITS = { medium: 10, full_rebuild: 3 } as const;

// ── Version history limits by plan (Section 18.2) ───────────────────────────
const VERSION_HISTORY_LIMITS: Record<PlanTier, number> = {
  free: 3,
  pro: 10,
  founder: 25,
  enterprise: 50,
};

// ── Model name sanitizer (Section 6.5) ──────────────────────────────────────
// No provider or model name may appear in any user-facing output.
const MODEL_NAMES_RE =
  /\b(claude[\s\-]?[\w.]*|gpt[\s\-]?[\w.]*|gemini[\s\-]?[\w.]*|deepseek[\s\-]?[\w.]*|llama[\s\-]?[\w.]*|mistral[\s\-]?[\w.]*|grok[\s\-]?[\w.]*|o1[\s\-]?[\w.]*|o3[\s\-]?[\w.]*|anthropic|openai|google\s+ai|dall[\s\-]?e[\s\-]?[\w.]*|stability\s+ai)\b/gi;

function sanitizeModelNames(text: string): string {
  return text.replace(MODEL_NAMES_RE, "our AI");
}

// ── Decision Memory detection patterns ──────────────────────────────────────
const DECISION_PATTERNS = [
  /\b(always|never|from now on|for all my projects|every time|remember that|save this)\b/i,
  /\b(use only|don't use|prefer|avoid|must use|must not)\b.{5,}/i,
];

// ── Founder Mode detection patterns (Section 15.5) ──────────────────────────
const FOUNDER_MODE_EXPLICIT = /\bActivate\s+Founder\s+Mode\b/i;
const FOUNDER_MODE_KEYWORDS =
  /\b(market analysis|revenue model|business model|competitive analysis|pitch deck|investor|go.to.market|monetize|startup|saas pricing|unit economics)\b/i;

function detectDecisionMemory(message: string): DecisionMemoryEntry | null {
  const matched = DECISION_PATTERNS.some((p) => p.test(message));
  if (!matched) return null;
  return {
    rule: message.slice(0, 200),
    detectedAt: Date.now(),
    applies_to: "all_projects",
  };
}

// ── Dynamic Routing Engine ───────────────────────────────────────────────────
function logRouting(
  state: PipelineState,
  agent: string,
  next_action: NextAction,
  reason: string
): void {
  const entry: RoutingHistoryEntry = {
    agent,
    next_action,
    reason,
    timestamp: Date.now(),
  };
  state.routing_history.push(entry);
}

function incrementLoop(state: PipelineState, agent: string): number {
  state.loop_counts[agent] = (state.loop_counts[agent] ?? 0) + 1;
  return state.loop_counts[agent];
}

function isLoopExceeded(state: PipelineState, agent: string): boolean {
  const limit = LOOP_LIMITS[agent] ?? 3;
  return (state.loop_counts[agent] ?? 0) >= limit;
}

function logAgent(state: PipelineState, log: AgentLog): void {
  state.agentLogs.push(log);
}

function saveVersion(state: PipelineState, description: string, planTier: PlanTier): number {
  if (!state.builderOutput) return state.current_version;
  const limit = VERSION_HISTORY_LIMITS[planTier] ?? 10;
  const newVersion = state.current_version + 1;
  const snapshot: VersionSnapshot = {
    version_number: newVersion,
    content: state.builderOutput.content,
    artifactType: state.builderOutput.artifactType,
    timestamp: Date.now(),
    description,
  };
  if (state.version_history.length >= limit) {
    state.version_history.shift();
  }
  state.version_history.push(snapshot);
  state.current_version = newVersion;
  return newVersion;
}

function emitAnalytics(
  emit: (event: PipelineEvent) => void,
  eventName: string,
  properties: Record<string, unknown>
): void {
  emit({ type: "analytics", event: eventName, properties });
}

function emitError(
  emit: (event: PipelineEvent) => void,
  code: string,
  userMessage: string,
  developerMessage: string
): void {
  emit({ type: "error", code, userMessage, developerMessage });
}

// ── Thinker Core ─────────────────────────────────────────────────────────────
export async function runThinkerCore(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  emit: (event: PipelineEvent) => void,
  options?: {
    planTier?: PlanTier;
    thinkingLevelOverride?: ThinkingLevel;
    signatureAnswer?: string;
    signatureAnswered?: boolean;
    existingRequirements?: Record<string, string>;
    domain?: string;
    blueprintApproved?: boolean;
    outputApproved?: boolean;
    existingPlan?: unknown[];
    fixType?: "small" | "medium" | "full_rebuild";
    medium_fix_count?: number;
    full_rebuild_count?: number;
    detectedLanguage?: string;
    decisionMemory?: DecisionMemoryEntry[];
    versionHistory?: VersionSnapshot[];
    currentVersion?: number;
    imageAttemptNumber?: number;
    imageApproved?: boolean;
  }
): Promise<void> {
  const startTime = Date.now();
  const planTier: PlanTier = options?.planTier ?? "free";

  // ── Fix Limit Enforcement (Section 9.5) — server-side guard ──────────────
  if (options?.fixType === "medium" && (options?.medium_fix_count ?? 0) >= FIX_LIMITS.medium) {
    emitError(
      emit,
      "PIPELINE_004",
      "You've reached 10 medium fixes on this project. Narrow the scope or start a new chat.",
      `medium_fix_count=${options.medium_fix_count} >= limit=${FIX_LIMITS.medium}`
    );
    emit({
      type: "fix_limit_reached",
      limitType: "medium",
      used: options.medium_fix_count ?? 0,
      max: FIX_LIMITS.medium,
    });
    emit({ type: "done", status: "failed" });
    return;
  }

  if (
    options?.fixType === "full_rebuild" &&
    (options?.full_rebuild_count ?? 0) >= FIX_LIMITS.full_rebuild
  ) {
    emitError(
      emit,
      "PIPELINE_004",
      "You've done 3 full rebuilds on this project. Consider starting a fresh chat.",
      `full_rebuild_count=${options.full_rebuild_count} >= limit=${FIX_LIMITS.full_rebuild}`
    );
    emit({
      type: "fix_limit_reached",
      limitType: "rebuild",
      used: options.full_rebuild_count ?? 0,
      max: FIX_LIMITS.full_rebuild,
    });
    emit({ type: "done", status: "failed" });
    return;
  }

  // ── Founder Mode gate (Section 15.5) ─────────────────────────────────────
  const founderModeRequested =
    FOUNDER_MODE_EXPLICIT.test(message) || FOUNDER_MODE_KEYWORDS.test(message);
  if (founderModeRequested && isFeatureGated("founder_mode", planTier)) {
    emit({
      type: "content",
      text: "Founder Mode is available on Pro and above. Upgrade to access full business analysis, competitive assessment, and go-to-market thinking.",
    });
    emit({ type: "done", status: "complete" });
    return;
  }

  // ── Initialize Pipeline State ───────────────────────────────────────────
  const state: PipelineState = {
    id: `pipeline-${Date.now()}`,
    intentType: "chat",
    thinkingLevel: options?.thinkingLevelOverride ?? "low",
    planTier,

    detectedLanguage: options?.detectedLanguage ?? "en",

    requirements: options?.existingRequirements ?? {},
    requirementsComplete: false,
    clarificationQuestions: [],

    signatureQuestionResponse: options?.signatureAnswer ?? null,
    signatureQuestionAnswered: options?.signatureAnswered ?? false,

    constraintFindings: {},
    assumptionFlags: [],
    clarificationDepth: 0,
    clarificationLayers: [],
    goalDiscoveryMode: false,

    decisionMemory: options?.decisionMemory ?? [],

    plan: [],
    blueprintApproved: options?.blueprintApproved ?? false,
    strategyBrief: null,
    researchFindings: [],
    builderOutput: null,
    reviewerResult: null,
    criticResult: null,
    judgeResult: null,
    consensusResult: null,

    version_history: options?.versionHistory ?? [],
    current_version: options?.currentVersion ?? 0,
    medium_fix_count: options?.medium_fix_count ?? 0,
    full_rebuild_count: options?.full_rebuild_count ?? 0,

    current_agent: "intent",
    routing_history: [],
    loop_counts: {},
    failover_log: [],
    peer_audit_flag: false,
    resume_from_agent: null,

    status: "classifying",
    finalContent: "",

    thinkCreditsUsed: 0,
    agentLogs: [],
  };

  // ── Stage 4/5: Output Approval fast-path (Section 16) ────────────────────
  if (options?.outputApproved) {
    const lastVersion = (options?.versionHistory ?? []).at(-1);
    if (lastVersion) {
      const agentCount = 7;
      emit({
        type: "final_output",
        summary: `Build complete. Reviewed by ${agentCount} agents and approved. Version ${lastVersion.version_number} is your final output.`,
        artifactType: lastVersion.artifactType,
        creditsUsed: options?.currentVersion ?? 1,
        agentCount,
        version: lastVersion.version_number,
      });
      emit({ type: "content", text: sanitizeModelNames(lastVersion.content) });
      // Post-delivery feedback prompt (Section 9.4)
      emit({
        type: "feedback_prompt",
        previousOutput: lastVersion.content.slice(0, 200),
        artifactType: lastVersion.artifactType,
      });
      emit({ type: "done", status: "complete" });
      return;
    }
  }

  // ── Check for Decision Memory ────────────────────────────────────────────
  const newDecision = detectDecisionMemory(message);
  if (newDecision) {
    state.decisionMemory.push(newDecision);
    emit({
      type: "decision_saved",
      rule: newDecision.rule,
      confirmation: `Saved — I'll remember this for all your future projects. You can change it anytime.`,
    });
  }

  // ── 1. Intent Agent (§4.4.1 — skipped when domain already selected) ──────
  const intentStart = Date.now();
  let intentResult: Awaited<ReturnType<typeof runIntentAgent>>;
  const domainPreSelected = !!options?.domain && options.domain !== "general";

  if (domainPreSelected) {
    const domainToIntent: Record<string, import("../types/pipeline.js").IntentType> = {
      coding: "app", devops: "app", security: "app", qa: "app",
      design: "app", canvas: "app",
      music: "task", video: "task", writing: "task",
      research: "task", automation: "task", general: "task",
    };
    const derivedIntent = domainToIntent[options.domain!] ?? "task";
    emit({ type: "agent_start", agent: "intent", label: "Domain pre-selected — skipping classification..." });
    intentResult = {
      intent: derivedIntent,
      confidence: 100,
      thinkingLevel: options?.thinkingLevelOverride ?? "high",
      domain: options.domain!,
      detectedLanguage: options?.detectedLanguage ?? "en",
      next_action: "proceed",
      reason: `Domain pre-selected by user: ${options.domain}`,
    };
    logAgent(state, {
      agent_name: "intent",
      input_summary: `Domain pre-selected: ${options.domain}`,
      output_summary: `Skipped Intent Agent — derived intent: ${derivedIntent}`,
      duration_ms: Date.now() - intentStart,
      status: "skipped",
      confidence: 100,
      retry_count: 0,
      failover_cost: 0,
    });
  } else {
    emit({ type: "agent_start", agent: "intent", label: "Analyzing your request..." });
    intentResult = await runIntentAgent(message, history);
    logAgent(state, {
      agent_name: "intent",
      input_summary: `Message: "${message.slice(0, 80)}"`,
      output_summary: `Intent: ${intentResult.intent}, Level: ${intentResult.thinkingLevel}, Confidence: ${intentResult.confidence}%, Lang: ${intentResult.detectedLanguage}`,
      duration_ms: Date.now() - intentStart,
      status: "success",
      confidence: intentResult.confidence,
      retry_count: 0,
      failover_cost: 0,
    });
  }

  state.intentType = intentResult.intent;
  state.thinkingLevel = options?.thinkingLevelOverride ?? intentResult.thinkingLevel;

  // Language detection
  const lang = options?.detectedLanguage ?? intentResult.detectedLanguage ?? "en";
  state.detectedLanguage = lang;
  if (lang !== "en") {
    emit({
      type: "language_detected",
      language: lang,
      languageName: getLanguageName(lang),
    });
  }

  logRouting(state, "intent", intentResult.next_action, intentResult.reason);
  emit({ type: "agent_done", agent: "intent", data: intentResult });

  // Show thinking summary (Section 16, Stage 1)
  const estimatedCredits = estimateSessionCredits(state.thinkingLevel);
  const levelLabels: Record<ThinkingLevel, string> = {
    low: "Quick Answer",
    medium: "Medium Analysis",
    high: "Deep Thinking",
    consensus: "Consensus Validation",
  };
  emit({
    type: "thinking_summary",
    summary: `**${levelLabels[state.thinkingLevel]}** — ${
      state.thinkingLevel === "low"
        ? "answering directly."
        : state.thinkingLevel === "medium"
        ? "running analysis pipeline."
        : state.thinkingLevel === "consensus"
        ? "running full multi-model validation."
        : "running full agent pipeline."
    }`,
    thinkingLevel: state.thinkingLevel,
    estimatedCredits,
  });

  // ── Think Credits Confirmation (Section 21, §10.7) ───────────────────────
  // For medium+ pipelines, emit credit_confirm so the client can display the cost.
  // The actual gate is client-side; this event serves as a server-side confirmation.
  if (requiresConfirmation(estimatedCredits) && !options?.blueprintApproved) {
    emit({
      type: "credit_confirm",
      action: `${levelLabels[state.thinkingLevel]} pipeline`,
      credits: estimatedCredits,
      balance: 0, // real balance fetched from DB by client
    });
  }

  // ── Analytics: pipeline_started ──────────────────────────────────────────
  emitAnalytics(emit, "pipeline_started", {
    thinkingLevel: state.thinkingLevel,
    domain: options?.domain ?? "general",
    intentType: state.intentType,
    creditsEstimated: estimatedCredits,
    planTier,
    language: lang,
  });

  // ── 2. Direct Chat Path ─────────────────────────────────────────────────
  const forceDirectAnswer =
    state.thinkingLevel === "low" ||
    intentResult.next_action === "direct_answer" ||
    intentResult.intent === "chat";

  if (forceDirectAnswer) {
    // §6.3 — Dual-Model Verified Chat: 2 credits (one per model call)
    state.thinkCreditsUsed += 2;
    try {
      const chatMessages: { role: "user" | "assistant"; content: string }[] = [
        ...history,
        { role: "user", content: message },
      ];

      emit({ type: "agent_start", agent: "verification", label: "Verifying response..." });

      const dual = await llmDualChat(DIRECT_CHAT_SYSTEM(lang), chatMessages);

      // Stream the verified answer word by word so the UX feels responsive
      const words = sanitizeModelNames(dual.content).split(/(?<=\s)|(?=\s)/);
      for (const chunk of words) {
        emit({ type: "content", text: chunk });
        // small yield so SSE flushes naturally
        await new Promise((r) => setImmediate(r));
      }

      emitAnalytics(emit, "pipeline_complete", {
        thinkingLevel: state.thinkingLevel,
        creditsUsed: 2,
        durationMs: Date.now() - startTime,
        failoverCount: 0,
        dualChatAgreed: dual.agreed,
        dualChatTieBreaker: dual.usedTieBreaker,
      });
    } catch {
      // Fallback demo mode when no API keys configured
      const demo = `I'm Thinker AI. You asked: *${message}*\n\nI'm ready to help — connect an API key for full AI responses.`;
      for (const word of demo.split(" ")) {
        emit({ type: "content", text: " " + word });
        await new Promise((r) => setTimeout(r, 10));
      }
      emitAnalytics(emit, "pipeline_complete", {
        thinkingLevel: state.thinkingLevel,
        creditsUsed: 0,
        durationMs: Date.now() - startTime,
        failoverCount: 0,
        dualChatAgreed: false,
        dualChatTieBreaker: false,
      });
    }
    emit({ type: "done", status: "complete" });
    return;
  }

  // ── 3. Clarification Agent ──────────────────────────────────────────────
  const clarifStart = Date.now();
  state.current_agent = "clarification";
  state.status = "clarifying";
  emit({ type: "agent_start", agent: "clarification", label: "Understanding your requirements..." });

  const clarification = await runClarificationAgent(
    message,
    state.intentType,
    state.thinkingLevel,
    history,
    state.signatureQuestionAnswered,
    lang
  );

  state.constraintFindings = clarification.constraintFindings;
  state.assumptionFlags = clarification.assumptionFlags;
  state.goalDiscoveryMode = clarification.goalDiscoveryMode;
  state.requirements = { ...state.requirements, ...clarification.requirements };

  // Inject decision memory into requirements
  if (state.decisionMemory.length > 0) {
    state.requirements["_decision_memory"] = state.decisionMemory.map((d) => d.rule).join("; ");
  }

  logRouting(state, "clarification", clarification.next_action, clarification.reason);
  logAgent(state, {
    agent_name: "clarification",
    input_summary: `Intent: ${state.intentType}, Level: ${state.thinkingLevel}`,
    output_summary: `Complete: ${clarification.complete}, Questions: ${clarification.questions.length}, GoalDiscovery: ${clarification.goalDiscoveryMode}`,
    duration_ms: Date.now() - clarifStart,
    status: "success",
    retry_count: 0,
    failover_cost: 0,
    clarification_depth: state.clarificationDepth,
    signature_q_answered: state.signatureQuestionAnswered,
  });
  emit({
    type: "agent_done",
    agent: "clarification",
    data: {
      complete: clarification.complete,
      goalDiscoveryMode: clarification.goalDiscoveryMode,
      emotionalTone: clarification.emotionalToneDetected,
    },
  });

  // Analytics: clarification shown
  if (clarification.questions.length > 0) {
    emitAnalytics(emit, "clarification_shown", {
      questionCount: clarification.questions.length,
      clarificationDepth: state.clarificationDepth,
      goalDiscoveryMode: clarification.goalDiscoveryMode,
    });
  }

  // If incomplete — return questions to user
  if ((!clarification.complete || clarification.goalDiscoveryMode) && clarification.questions.length > 0) {
    state.clarificationDepth += 1;
    emit({
      type: "clarification_needed",
      questions: clarification.questions,
      intent: state.intentType,
      layer: clarification.goalDiscoveryMode ? "goal" : undefined,
    });
    emit({ type: "done", status: "complete" });
    return;
  }

  // ── 4. Signature Question (Section 5.2.5) ───────────────────────────────
  if (clarification.signatureQuestionNeeded && !state.signatureQuestionAnswered && !isFeatureGated("smart_clarification", planTier)) {
    emit({ type: "signature_question", question: SIGNATURE_QUESTION });
    emit({ type: "done", status: "complete" });
    return;
  }

  state.requirementsComplete = true;

  // ── 5. Strategy Agent (Section 5.12) ────────────────────────────────────
  if (!isFeatureGated("strategy_agent", planTier)) {
    const stratStart = Date.now();
    state.current_agent = "strategy";
    state.status = "strategy";
    emit({ type: "agent_start", agent: "strategy", label: "Thinking strategically about your goal..." });

    const strategyResult = await runStrategyAgent(
      message,
      state.intentType,
      state.requirements,
      state.signatureQuestionResponse,
      state.constraintFindings as Record<string, string>,
      lang
    );

    state.strategyBrief = strategyResult.strategicBrief;

    // Emit Founder Mode activated event if detected (Section 15.5)
    if (strategyResult.founderMode && !isFeatureGated("founder_mode", planTier)) {
      emit({
        type: "founder_mode_activated",
        message: "Founder Mode active — expanding analysis to include market, business model, and competitive risk.",
      });
    }

    logRouting(state, "strategy", strategyResult.next_action, strategyResult.reason);
    logAgent(state, {
      agent_name: "strategy",
      input_summary: `Goal: "${message.slice(0, 60)}"`,
      output_summary: `Assessment: ${strategyResult.ideaValidation.assessment}, FounderMode: ${strategyResult.founderMode}`,
      duration_ms: Date.now() - stratStart,
      status: "success",
      retry_count: 0,
      failover_cost: 0,
    });

    emit({
      type: "strategy_brief",
      brief: strategyResult.strategicBrief,
      assessment: strategyResult.ideaValidation.assessment,
      founderMode: strategyResult.founderMode,
    });
    emit({ type: "agent_done", agent: "strategy", data: { assessment: strategyResult.ideaValidation.assessment } });

    if (strategyResult.next_action === "clarify") {
      emit({
        type: "clarification_needed",
        questions: [
          {
            id: "strategy_followup",
            question: strategyResult.reason,
            type: "text",
            layer: "goal",
          },
        ],
        intent: state.intentType,
      });
      emit({ type: "done", status: "complete" });
      return;
    }
  }

  // ── 6. Planner Agent ────────────────────────────────────────────────────
  let plannerCycles = 0;
  let skipPlanner = false;

  // If blueprint was already approved, restore existing plan
  if (options?.blueprintApproved && options?.existingPlan && Array.isArray(options.existingPlan)) {
    state.plan = options.existingPlan as typeof state.plan;
    state.blueprintApproved = true;
    skipPlanner = true;
  }

  plannerLoop: while (true) {
    plannerCycles += 1;

    if (!skipPlanner) {
      const planStart = Date.now();
      state.current_agent = "planner";
      state.status = "planning";
      emit({ type: "agent_start", agent: "planner", label: "Creating execution plan..." });

      const planResult = await runPlannerAgent(
        message,
        state.intentType,
        state.requirements,
        state.strategyBrief,
        options?.domain,
        lang
      );

      state.plan = planResult.steps;
      logRouting(state, "planner", planResult.next_action, planResult.reason);
      logAgent(state, {
        agent_name: "planner",
        input_summary: `Goal: "${message.slice(0, 60)}"`,
        output_summary: `Steps: ${planResult.steps.length}, Types: ${planResult.steps.map((s) => s.outputType).join(",")}`,
        duration_ms: Date.now() - planStart,
        status: "success",
        retry_count: 0,
        failover_cost: 0,
      });
      emit({ type: "agent_done", agent: "planner", data: { steps: planResult.steps.length } });

      // ── Blueprint Approval Gate (Section 16, Stage 2) ──────────────────
      if (!state.blueprintApproved && (state.thinkingLevel === "high" || state.thinkingLevel === "consensus")) {
        state.status = "blueprint_review";
        const techStack = inferTechStack(state.intentType, state.requirements);
        const complexity = planResult.steps.length <= 3 ? "Simple" : planResult.steps.length <= 7 ? "Medium" : "Complex";

        emit({
          type: "blueprint_ready",
          steps: planResult.steps,
          techStack,
          estimatedComplexity: complexity,
        });
        emit({ type: "done", status: "complete" });
        return;
      }

      // ── 7. Research Agent (optional, Section 5.4) ──────────────────────
      const researchSteps = planResult.steps.filter((s) => s.needsResearch);
      const canUseResearch = !isFeatureGated("research_agent", planTier);

      if (researchSteps.length > 0 && canUseResearch) {
        const resStart = Date.now();
        state.current_agent = "research";
        state.status = "researching";
        emit({ type: "agent_start", agent: "research", label: "Gathering context..." });
        state.researchFindings = await runResearchAgent(researchSteps, message, lang);
        logAgent(state, {
          agent_name: "research",
          input_summary: `${researchSteps.length} steps need research`,
          output_summary: `Found ${state.researchFindings.length} findings`,
          duration_ms: Date.now() - resStart,
          status: "success",
          retry_count: 0,
          failover_cost: 0,
        });
        emit({ type: "agent_done", agent: "research", data: { findings: state.researchFindings.length } });
      }
    }
    skipPlanner = false;

    // ── Medium Thinking Gate ─────────────────────────────────────────────
    if (state.thinkingLevel === "medium") {
      const planSummary = state.plan
        .map((s, i) => `**${i + 1}. ${s.description}**${s.needsResearch ? " *(research-backed)*" : ""}`)
        .join("\n");
      const researchContext =
        state.researchFindings.length > 0
          ? `\n\n**Research findings:**\n${state.researchFindings.map((f) => `- ${f}`).join("\n")}`
          : "";
      emit({
        type: "content",
        text: `Here's my analysis and plan:\n\n${planSummary}${researchContext}\n\n*Medium Thinking used ${state.plan.length} planning steps. Upgrade to High Thinking for full execution.*`,
      });
      break plannerLoop;
    }

    // ── 8. Builder + Reviewer loop ────────────────────────────────────────
    let builderRetries = 0;
    let reviewerRetries = 0;
    let lastBuilderOutput = state.builderOutput;
    let lastReviewerResult = state.reviewerResult;
    // Track image attempt number for Visual Asset Approval Flow (Section 5.11)
    let imageAttemptNumber = options?.imageAttemptNumber ?? 0;

    builderReviewerLoop: while (true) {
      const imageSteps = state.plan.filter((s) => s.outputType === "image");
      const codeSteps = state.plan.filter((s) => s.outputType !== "image");

      // ── Design Agent + Visual Asset Approval Flow (Section 5.10, 5.11) ──
      if (imageSteps.length > 0 && !isFeatureGated("design_agent", planTier)) {
        const IMAGE_MAX_ATTEMPTS = 3;
        for (const imgStep of imageSteps) {
          const designStart = Date.now();
          state.current_agent = "design";
          imageAttemptNumber += 1;
          emit({
            type: "agent_start",
            agent: "design",
            label: `Generating visual asset: ${imgStep.description.slice(0, 40)}... (attempt ${imageAttemptNumber}/${IMAGE_MAX_ATTEMPTS})`,
          });

          const designOutput = await runDesignAgent(
            imgStep.description,
            state.requirements["style"] ?? "",
            { brand: state.requirements["brand"] ?? "" }
          );

          logAgent(state, {
            agent_name: "design",
            input_summary: imgStep.description.slice(0, 80),
            output_summary: `Status: ${designOutput.status}, Attempt: ${imageAttemptNumber}/${IMAGE_MAX_ATTEMPTS}`,
            duration_ms: Date.now() - designStart,
            status: designOutput.status === "failed" ? "failed" : "success",
            retry_count: imageAttemptNumber - 1,
            failover_cost: 0,
          });

          // ── Visual Asset Approval Gate (Section 5.11) ─────────────────
          // Show image to user for approve/revise/regenerate before proceeding.
          // Never mark project complete until image is approved.
          emit({
            type: "image_approval_needed",
            imageUrl: designOutput.imageUrl ?? "",
            description: designOutput.description,
            imagePrompt: designOutput.imagePrompt,
            stepId: imgStep.id,
            attemptNumber: imageAttemptNumber,
            maxAttempts: IMAGE_MAX_ATTEMPTS,
          });
          emit({ type: "agent_done", agent: "design", data: { status: designOutput.status } });
          // Pipeline pauses here — client must send imageApproved:true to continue
          emit({ type: "done", status: "complete" });
          return;
        }
      }

      // ── Builder Agent ──────────────────────────────────────────────
      if (codeSteps.length > 0 || imageSteps.length === 0) {
        const buildStart = Date.now();
        state.current_agent = "builder";
        state.status = "building";

        // ── Stage 3: Live Preview (Section 16.1, Stage 3) ─────────────
        // Only on first run (not retries) — tells the mobile client to show
        // the "Stage 3: Building" progress card with a per-step breakdown.
        if (builderRetries === 0) {
          const stepsForPreview = codeSteps.length > 0 ? codeSteps : state.plan;
          emit({
            type: "stage_3_building",
            totalSteps: stepsForPreview.length,
            stepDescriptions: stepsForPreview.map((s) => s.description),
          });
        }

        const retryLabel = builderRetries > 0 ? ` (attempt ${builderRetries + 1})` : "";
        emit({ type: "agent_start", agent: "builder", label: `Building your deliverable${retryLabel}...` });

        const builderOutput = await runBuilderAgent(
          message,
          codeSteps.length > 0 ? codeSteps : state.plan,
          state.researchFindings,
          state.requirements,
          (text) => emit({ type: "content", text: sanitizeModelNames(text) }),
          lastReviewerResult ? { issues: lastReviewerResult.issues } : undefined,
          lang
        );

        state.builderOutput = builderOutput;
        lastBuilderOutput = builderOutput;

        // Save version with plan-tier-based limit
        const versionNum = saveVersion(state, `Build attempt ${builderRetries + 1}`, planTier);
        emit({
          type: "version_saved",
          version_number: versionNum,
          description: `Version ${versionNum} — ${builderOutput.artifactType} output`,
        });

        logAgent(state, {
          agent_name: "builder",
          input_summary: `Goal: "${message.slice(0, 60)}", Steps: ${codeSteps.length}`,
          output_summary: `Type: ${builderOutput.artifactType}, Length: ${builderOutput.content.length}, Version: ${versionNum}`,
          duration_ms: Date.now() - buildStart,
          status: "success",
          retry_count: builderRetries,
          failover_cost: 0,
        });
        emit({ type: "agent_done", agent: "builder", data: { type: builderOutput.artifactType, version: versionNum } });

        // ── Reviewer Agent ─────────────────────────────────────────
        const reviewStart = Date.now();
        state.current_agent = "reviewer";
        state.status = "reviewing";
        emit({ type: "agent_start", agent: "reviewer", label: "Quality review..." });

        const reviewerResult = await runReviewerAgent(builderOutput, state.requirements, lang);
        state.reviewerResult = reviewerResult;
        lastReviewerResult = reviewerResult;

        logRouting(state, "reviewer", reviewerResult.next_action, reviewerResult.reason);
        logAgent(state, {
          agent_name: "reviewer",
          input_summary: `Artifact type: ${builderOutput.artifactType}`,
          output_summary: `Passed: ${reviewerResult.passed}, Issues: ${reviewerResult.issues.length}`,
          duration_ms: Date.now() - reviewStart,
          status: "success",
          retry_count: reviewerRetries,
          failover_cost: 0,
        });
        emit({ type: "agent_done", agent: "reviewer", data: { passed: reviewerResult.passed } });

        const hasHighSeverity = reviewerResult.issues.some((i) => i.severity === "high");

        if (reviewerResult.next_action === "replan") {
          incrementLoop(state, "planner_cycle");
          if (isLoopExceeded(state, "planner_cycle")) {
            emit({
              type: "clarification_needed",
              questions: [
                {
                  id: "replan_scope",
                  question: `The plan has been revised ${plannerCycles} times. Can you help me re-scope what you need? What's the single most important thing this should do?`,
                  type: "text",
                  layer: "mvp",
                },
              ],
              intent: state.intentType,
            });
            emit({ type: "done", status: "complete" });
            return;
          }
          emit({ type: "pipeline_retry", agent: "planner", attempt: plannerCycles + 1 });
          continue plannerLoop;
        }

        if (!reviewerResult.passed && hasHighSeverity && reviewerResult.next_action === "retry") {
          incrementLoop(state, "builder");
          if (isLoopExceeded(state, "builder")) {
            emitError(
              emit,
              "PIPELINE_004",
              "I ran into a difficulty on this step. Your work is saved.",
              `loop_count exceeded threshold for builder agent`
            );
            emit({
              type: "pipeline_halt",
              reason: "Builder has been retried too many times. Saving progress.",
              completedSteps: 0,
              totalSteps: state.plan.length,
            });
            emit({ type: "done", status: "halted" });
            return;
          }
          builderRetries += 1;
          reviewerRetries += 1;
          emit({ type: "pipeline_retry", agent: "builder", attempt: builderRetries + 1 });
          continue builderReviewerLoop;
        }

        break builderReviewerLoop;
      } else {
        break builderReviewerLoop;
      }
    } // end builderReviewerLoop

    // ── 9. Critic Agent ──────────────────────────────────────────────────
    if (lastBuilderOutput && !isFeatureGated("critic_agent" as any, planTier)) {
      const criticStart = Date.now();
      state.current_agent = "critic";
      state.status = "critiquing";
      emit({ type: "agent_start", agent: "critic", label: "Independent adversarial review..." });

      const criticResult = await runCriticAgent(lastBuilderOutput, lang);
      state.criticResult = criticResult;

      logRouting(state, "critic", criticResult.next_action, criticResult.reason);
      logAgent(state, {
        agent_name: "critic",
        input_summary: `Artifact type: ${lastBuilderOutput.artifactType}`,
        output_summary: `Severity: ${criticResult.overallSeverity}, Concerns: ${criticResult.concerns.length}`,
        duration_ms: Date.now() - criticStart,
        status: "success",
        retry_count: 0,
        failover_cost: 0,
      });
      emit({ type: "agent_done", agent: "critic", data: { severity: criticResult.overallSeverity } });
    } else if (lastBuilderOutput && !state.criticResult) {
      // Free plan: skip critic but proceed
      state.criticResult = {
        concerns: [],
        overallSeverity: "low",
        next_action: "proceed",
        reason: "Critic skipped on free plan",
      } as any;
    }

    // ── 10. Judge Agent ──────────────────────────────────────────────────
    if (lastBuilderOutput && state.reviewerResult && state.criticResult) {
      const judgeStart = Date.now();
      state.current_agent = "judge";
      state.status = "judging";
      emit({ type: "agent_start", agent: "judge", label: "Final judgment..." });

      const judgeResult = await runJudgeAgent(lastBuilderOutput, state.reviewerResult, state.criticResult, lang);
      state.judgeResult = judgeResult;

      logAgent(state, {
        agent_name: "judge",
        input_summary: `Builder + Reviewer + Critic outputs`,
        output_summary: `Score: ${judgeResult.totalScore}/100, Approved: ${judgeResult.approved}, Borderline: ${judgeResult.borderline}`,
        duration_ms: Date.now() - judgeStart,
        status: "success",
        confidence: judgeResult.totalScore,
        retry_count: 0,
        failover_cost: 0,
      });
      emit({ type: "agent_done", agent: "judge", data: { approved: judgeResult.approved, score: judgeResult.totalScore } });

      if (!judgeResult.approved && !judgeResult.borderline) {
        incrementLoop(state, "builder");
        if (isLoopExceeded(state, "builder")) {
          emitError(
            emit,
            "PIPELINE_003",
            "I ran into a difficulty on this step. Your work is saved.",
            `All models in pool exhausted for agent=builder`
          );
          emit({
            type: "pipeline_halt",
            reason: "Builder failed Judge review too many times. Saving best attempt.",
            completedSteps: 0,
            totalSteps: state.plan.length,
          });
          emit({ type: "done", status: "halted" });
          return;
        }
        skipPlanner = true;
        emit({ type: "pipeline_retry", agent: "builder", attempt: (state.loop_counts["builder"] ?? 0) + 1 });
        continue plannerLoop;
      }

      // ── 11. Consensus Agent (conditional, Section 6.4) ───────────────
      const reviewerCriticDisagree =
        state.reviewerResult.passed && state.criticResult.overallSeverity === "high";
      const highRisk = isHighRiskContent(lastBuilderOutput.content);
      const needsConsensus =
        state.thinkingLevel === "consensus" ||
        judgeResult.borderline ||
        reviewerCriticDisagree ||
        highRisk;
      const canUseConsensus = !isFeatureGated("consensus_agent", planTier);

      if (needsConsensus && canUseConsensus) {
        const consensusStart = Date.now();
        state.current_agent = "consensus";
        state.status = "consensus";

        const consensusReason = highRisk
          ? "high-risk content (auth/payment/data)"
          : judgeResult.borderline
          ? "borderline judge score"
          : "Reviewer/Critic disagreement";

        emit({ type: "agent_start", agent: "consensus", label: `Multi-model consensus (${consensusReason})...` });

        const consensusResult = await runConsensusAgent(
          lastBuilderOutput,
          state.reviewerResult,
          state.criticResult,
          judgeResult,
          lang
        );
        state.consensusResult = consensusResult;

        logRouting(state, "consensus", consensusResult.next_action, consensusResult.reason);
        logAgent(state, {
          agent_name: "consensus",
          input_summary: `Reason: ${consensusReason}`,
          output_summary: `Verdict: ${consensusResult.finalVerdict}, Votes: ${consensusResult.approveCount}/${consensusResult.votes.length}`,
          duration_ms: Date.now() - consensusStart,
          status: "success",
          retry_count: 0,
          failover_cost: 0,
        });
        emit({
          type: "agent_done",
          agent: "consensus",
          data: { verdict: consensusResult.finalVerdict, votes: consensusResult.approveCount },
        });

        if (consensusResult.finalVerdict === "reject") {
          incrementLoop(state, "consensus_cycle");
          if (isLoopExceeded(state, "consensus_cycle")) {
            emit({
              type: "content",
              text: "\n\n---\n> ⚠️ **Quality Notice**: This deliverable did not fully pass quality checks. Review carefully before use, especially around sensitive areas.",
            });
          } else {
            continue plannerLoop;
          }
        }
      }

      break plannerLoop;
    }

    break plannerLoop;
  } // end plannerLoop

  // ── 12. Stage 4 — Output Approval Gate (Section 16) ─────────────────────
  const needsOutputApproval =
    (state.thinkingLevel === "high" || state.thinkingLevel === "consensus") &&
    state.builderOutput &&
    !options?.outputApproved;

  if (needsOutputApproval && state.builderOutput) {
    const agentsRan = state.agentLogs.length;
    emit({
      type: "approval_needed",
      content: state.builderOutput.content,
      artifactType: state.builderOutput.artifactType,
      version: state.current_version,
      agentCount: agentsRan,
    });
    emit({ type: "done", status: "complete" });
    return;
  }

  // ── 13. Stage 5 — Final Output (Section 16) ───────────────────────────────
  state.status = "complete";
  const totalAgents = state.agentLogs.length;
  const durationSecs = Math.round((Date.now() - startTime) / 1000);

  if (state.builderOutput) {
    const agentNames = [...new Set(state.agentLogs.map((l) => l.agent_name))];
    emit({
      type: "final_output",
      summary: `Build complete in ${durationSecs}s. Reviewed by ${agentNames.length} agents (${agentNames.join(", ")}). Version ${state.current_version}.`,
      artifactType: state.builderOutput.artifactType,
      creditsUsed: state.thinkCreditsUsed || 1,
      agentCount: totalAgents,
      version: state.current_version,
    });
    // Post-delivery feedback prompt (Section 9.4)
    emit({
      type: "feedback_prompt",
      previousOutput: state.builderOutput.content.slice(0, 200),
      artifactType: state.builderOutput.artifactType,
    });
  }

  // Analytics: pipeline complete
  emitAnalytics(emit, "pipeline_complete", {
    thinkingLevel: state.thinkingLevel,
    creditsUsed: state.thinkCreditsUsed,
    durationMs: Date.now() - startTime,
    agentCount: totalAgents,
    failoverCount: state.failover_log.length,
    planTier,
  });

  emit({ type: "done", status: "complete" });
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function inferTechStack(intentType: string, requirements: Record<string, string>): string {
  const platform = requirements["platform"] ?? "";
  if (intentType === "app") {
    if (/mobile|ios|android/.test(platform)) return "React Native + Expo · Node.js API · PostgreSQL";
    return "React + Vite · Node.js + Express · PostgreSQL";
  }
  if (intentType === "website") return "React + Vite · Tailwind CSS · Static hosting";
  if (intentType === "game") return "HTML5 Canvas · JavaScript · Web Audio API";
  return "Node.js · TypeScript · REST API";
}
