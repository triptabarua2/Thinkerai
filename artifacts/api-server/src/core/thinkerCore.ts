import { llmStream } from "../lib/llm.js";
import { runIntentAgent } from "../agents/intentAgent.js";
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
import { estimateSessionCredits, isFeatureGated } from "../lib/thinkCredits.js";
import type {
  PipelineEvent,
  PipelineState,
  PlanTier,
  ThinkingLevel,
  NextAction,
  RoutingHistoryEntry,
  AgentLog,
} from "../types/pipeline.js";

const DIRECT_CHAT_SYSTEM = `You are Thinker AI — a highly capable autonomous AI assistant.

Answer directly, accurately, and helpfully. Format with markdown.
- Bold for key terms
- Code blocks with language tags for code
- Concise but complete — no filler`;

// ── Loop detection thresholds (Section 8.5) ─────────────────────────────────
const LOOP_LIMITS: Record<string, number> = {
  builder: 3,
  reviewer: 3,
  planner_cycle: 2,
  clarification: 4,
  consensus_cycle: 2,
};

// ── Dynamic Routing Engine (Section 20) ─────────────────────────────────────
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
  }
): Promise<void> {
  const startTime = Date.now();
  const planTier: PlanTier = options?.planTier ?? "free";

  // ── Initialize Pipeline State ───────────────────────────────────────────
  const state: PipelineState = {
    id: `pipeline-${Date.now()}`,
    intentType: "chat",
    thinkingLevel: options?.thinkingLevelOverride ?? "low",
    planTier,

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

    plan: [],
    strategyBrief: null,
    researchFindings: [],
    builderOutput: null,
    reviewerResult: null,
    criticResult: null,
    judgeResult: null,
    consensusResult: null,

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

  // ── 1. Intent Agent ─────────────────────────────────────────────────────
  const intentStart = Date.now();
  emit({ type: "agent_start", agent: "intent", label: "Analyzing your request..." });
  const intentResult = await runIntentAgent(message, history);
  state.intentType = intentResult.intent;
  state.thinkingLevel = options?.thinkingLevelOverride ?? intentResult.thinkingLevel;
  state.current_agent = "intent";

  logRouting(state, "intent", intentResult.next_action, intentResult.reason);
  logAgent(state, {
    agent_name: "intent",
    input_summary: `Message: "${message.slice(0, 80)}"`,
    output_summary: `Intent: ${intentResult.intent}, Level: ${state.thinkingLevel}, Confidence: ${intentResult.confidence}%`,
    duration_ms: Date.now() - intentStart,
    status: "success",
    confidence: intentResult.confidence,
    retry_count: 0,
    failover_cost: 0,
  });
  emit({ type: "agent_done", agent: "intent", data: intentResult });

  // Show thinking summary to user (Section 16, Stage 1)
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

  // ── 2. Direct Chat Path ─────────────────────────────────────────────────
  // Low thinking: always direct answer, regardless of intent complexity
  const forceDirectAnswer =
    state.thinkingLevel === "low" ||
    intentResult.next_action === "direct_answer" ||
    intentResult.intent === "chat";

  if (forceDirectAnswer) {
    state.thinkCreditsUsed += 1;
    try {
      const chatMessages: { role: "user" | "assistant"; content: string }[] = [
        ...history,
        { role: "user", content: message },
      ];
      await llmStream(DIRECT_CHAT_SYSTEM, chatMessages, "mid", (text) =>
        emit({ type: "content", text })
      );
    } catch {
      const demo = `I'm Thinker AI. You asked: *${message}*\n\nI'm ready to help — connect an API key for full AI responses.`;
      for (const word of demo.split(" ")) {
        emit({ type: "content", text: " " + word });
        await new Promise((r) => setTimeout(r, 10));
      }
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
    state.signatureQuestionAnswered
  );

  state.constraintFindings = clarification.constraintFindings;
  state.assumptionFlags = clarification.assumptionFlags;
  state.goalDiscoveryMode = clarification.goalDiscoveryMode;
  state.requirements = { ...state.requirements, ...clarification.requirements };

  logRouting(state, "clarification", clarification.next_action, clarification.reason);
  logAgent(state, {
    agent_name: "clarification",
    input_summary: `Intent: ${state.intentType}, Level: ${state.thinkingLevel}`,
    output_summary: `Complete: ${clarification.complete}, Questions: ${clarification.questions.length}, GoalDiscovery: ${clarification.goalDiscoveryMode}`,
    duration_ms: Date.now() - clarifStart,
    status: "success",
    retry_count: 0,
    failover_cost: 0,
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
  // Must fire on every project-type request before Builder, unless already answered
  if (clarification.signatureQuestionNeeded && !state.signatureQuestionAnswered && !isFeatureGated("smart_clarification", planTier)) {
    emit({ type: "signature_question", question: SIGNATURE_QUESTION });
    emit({ type: "done", status: "complete" });
    return;
  }

  state.requirementsComplete = true;

  // ── 5. Strategy Agent (Section 5.12) ────────────────────────────────────
  // Runs after Clarification, before Planner, on project requests. Pro+ only.
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
      state.constraintFindings as Record<string, string>
    );

    state.strategyBrief = strategyResult.strategicBrief;
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
  let skipPlanner = false; // set true when Judge rejects → retry Builder only

  plannerLoop: while (true) {
    plannerCycles += 1;

    // ── Planner + Research (skipped when Judge sends back to Builder only) ──
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
        options?.domain
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

      // ── 7. Research Agent (optional, Section 5.4) ──────────────────────
      const researchSteps = planResult.steps.filter((s) => s.needsResearch);
      const canUseResearch = !isFeatureGated("research_agent", planTier);

      if (researchSteps.length > 0 && canUseResearch) {
        const resStart = Date.now();
        state.current_agent = "research";
        state.status = "researching";
        emit({ type: "agent_start", agent: "research", label: "Gathering context..." });
        state.researchFindings = await runResearchAgent(researchSteps, message);
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
    skipPlanner = false; // reset after every iteration

    // ── Medium Thinking Gate ─────────────────────────────────────────────
    // Medium level: skip builder/design/critic/judge/consensus
    // Output the plan + research as the final deliverable
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

    builderReviewerLoop: while (true) {
      // Check for image steps → route to Design Agent
      const imageSteps = state.plan.filter((s) => s.outputType === "image");
      const codeSteps = state.plan.filter((s) => s.outputType !== "image");

      // ── Design Agent (Section 5.10) ─────────────────────────────────
      if (imageSteps.length > 0 && !isFeatureGated("design_agent", planTier)) {
        for (const imgStep of imageSteps) {
          const designStart = Date.now();
          state.current_agent = "design";
          emit({ type: "agent_start", agent: "design", label: `Generating visual asset: ${imgStep.description.slice(0, 40)}...` });

          const designOutput = await runDesignAgent(
            imgStep.description,
            state.requirements["style"] ?? "",
            { brand: state.requirements["brand"] ?? "" }
          );

          logAgent(state, {
            agent_name: "design",
            input_summary: imgStep.description.slice(0, 80),
            output_summary: `Status: ${designOutput.status}`,
            duration_ms: Date.now() - designStart,
            status: designOutput.status === "failed" ? "failed" : "success",
            retry_count: 0,
            failover_cost: 0,
          });

          if (designOutput.imageUrl) {
            emit({ type: "content", text: `\n\n**Visual Asset**: ${designOutput.description}\n\n![Generated Image](${designOutput.imageUrl})\n` });
          } else {
            emit({ type: "content", text: `\n\n**Visual Asset**: ${designOutput.description}\n\n*Image generation not available — prompt ready: "${designOutput.imagePrompt.slice(0, 100)}..."*\n` });
          }
          emit({ type: "agent_done", agent: "design", data: { status: designOutput.status } });
        }
      }

      // ── Builder Agent ──────────────────────────────────────────────
      if (codeSteps.length > 0 || imageSteps.length === 0) {
        const buildStart = Date.now();
        state.current_agent = "builder";
        state.status = "building";
        const retryLabel = builderRetries > 0 ? ` (attempt ${builderRetries + 1})` : "";
        emit({ type: "agent_start", agent: "builder", label: `Building your deliverable${retryLabel}...` });

        const builderOutput = await runBuilderAgent(
          message,
          codeSteps.length > 0 ? codeSteps : state.plan,
          state.researchFindings,
          state.requirements,
          (text) => emit({ type: "content", text }),
          lastReviewerResult ? { issues: lastReviewerResult.issues } : undefined
        );

        state.builderOutput = builderOutput;
        lastBuilderOutput = builderOutput;
        logAgent(state, {
          agent_name: "builder",
          input_summary: `Goal: "${message.slice(0, 60)}", Steps: ${codeSteps.length}`,
          output_summary: `Type: ${builderOutput.artifactType}, Length: ${builderOutput.content.length}`,
          duration_ms: Date.now() - buildStart,
          status: "success",
          retry_count: builderRetries,
          failover_cost: 0,
        });
        emit({ type: "agent_done", agent: "builder", data: { type: builderOutput.artifactType } });

        // ── Reviewer Agent ─────────────────────────────────────────
        const reviewStart = Date.now();
        state.current_agent = "reviewer";
        state.status = "reviewing";
        emit({ type: "agent_start", agent: "reviewer", label: "Quality review..." });

        const reviewerResult = await runReviewerAgent(builderOutput, state.requirements);
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

        // Routing after Reviewer
        const hasHighSeverity = reviewerResult.issues.some((i) => i.severity === "high");

        if (reviewerResult.next_action === "replan") {
          // Reviewer says the plan itself is wrong
          incrementLoop(state, "planner_cycle");
          if (isLoopExceeded(state, "planner_cycle")) {
            // Too many planner cycles — return to Clarification
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
          // Go back to Planner with failure context
          emit({ type: "pipeline_retry", agent: "planner", attempt: plannerCycles + 1 });
          continue plannerLoop;
        }

        if (!reviewerResult.passed && hasHighSeverity && reviewerResult.next_action === "retry") {
          incrementLoop(state, "builder");
          if (isLoopExceeded(state, "builder")) {
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

        // Reviewer passed (or only low/medium issues) → continue
        break builderReviewerLoop;
      } else {
        // Only image steps — break builder loop
        break builderReviewerLoop;
      }
    } // end builderReviewerLoop

    // ── 9. Critic Agent ──────────────────────────────────────────────────
    // NOTE: Critic runs WITHOUT seeing Reviewer verdict first (Section 8.2)
    if (lastBuilderOutput) {
      const criticStart = Date.now();
      state.current_agent = "critic";
      state.status = "critiquing";
      emit({ type: "agent_start", agent: "critic", label: "Independent adversarial review..." });

      const criticResult = await runCriticAgent(lastBuilderOutput);
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
    }

    // ── 10. Judge Agent ──────────────────────────────────────────────────
    if (lastBuilderOutput && state.reviewerResult && state.criticResult) {
      const judgeStart = Date.now();
      state.current_agent = "judge";
      state.status = "judging";
      emit({ type: "agent_start", agent: "judge", label: "Final judgment..." });

      const judgeResult = await runJudgeAgent(lastBuilderOutput, state.reviewerResult, state.criticResult);
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

      // Judge routing — retry Builder only, NOT Planner
      if (!judgeResult.approved && !judgeResult.borderline) {
        incrementLoop(state, "builder");
        if (isLoopExceeded(state, "builder")) {
          emit({
            type: "pipeline_halt",
            reason: "Builder failed Judge review too many times. Saving best attempt.",
            completedSteps: 0,
            totalSteps: state.plan.length,
          });
          emit({ type: "done", status: "halted" });
          return;
        }
        // Skip Planner on next iteration — only re-run Builder
        skipPlanner = true;
        emit({ type: "pipeline_retry", agent: "builder", attempt: (state.loop_counts["builder"] ?? 0) + 1 });
        continue plannerLoop;
      }

      // ── 11. Consensus Agent (conditional, Section 6.4) ───────────────
      const reviewerCriticDisagree =
        state.reviewerResult.passed && state.criticResult.overallSeverity === "high";
      const highRisk = isHighRiskContent(lastBuilderOutput.content);
      const needsConsensus =
        state.thinkingLevel === "consensus" || // always run if user selected consensus level
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
          judgeResult
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
            // Present best available output with quality caveats
            emit({
              type: "content",
              text: "\n\n---\n> ⚠️ **Quality Notice**: This deliverable did not fully pass quality checks. Review carefully before use, especially around sensitive areas.",
            });
          } else {
            // Try rebuilding
            continue plannerLoop;
          }
        }
      }

      // All good — break the planner loop
      break plannerLoop;
    }

    // If no builder output, break to avoid infinite loop
    break plannerLoop;
  } // end plannerLoop

  // ── 12. Done ──────────────────────────────────────────────────────────────
  state.status = "complete";
  const totalDuration = Date.now() - startTime;
  emit({
    type: "done",
    status: "complete",
  });
}
