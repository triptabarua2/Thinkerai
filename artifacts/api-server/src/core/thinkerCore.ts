import { llmStream } from "../lib/llm.js";
import { runIntentAgent } from "../agents/intentAgent.js";
import { runClarificationAgent } from "../agents/clarificationAgent.js";
import { runPlannerAgent } from "../agents/plannerAgent.js";
import { runResearchAgent } from "../agents/researchAgent.js";
import { runBuilderAgent } from "../agents/builderAgent.js";
import { runReviewerAgent } from "../agents/reviewerAgent.js";
import { runCriticAgent } from "../agents/criticAgent.js";
import { runJudgeAgent, isHighRiskContent } from "../agents/judgeAgent.js";
import { runConsensusAgent } from "../agents/consensusAgent.js";
import type { PipelineEvent } from "../types/pipeline.js";

const DIRECT_CHAT_SYSTEM = `You are Thinker AI — a highly capable autonomous AI assistant.

Answer directly, accurately, and helpfully. Format with markdown.
- Bold for key terms
- Code blocks with language tags for code
- Concise but complete — no filler`;

export async function runThinkerCore(
  message: string,
  history: { role: "user" | "assistant"; content: string }[],
  emit: (event: PipelineEvent) => void
): Promise<void> {
  // ─── 1. Intent Agent ───────────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "intent", label: "Analyzing your request..." });
  const intentResult = await runIntentAgent(message, history);
  emit({ type: "agent_done", agent: "intent", data: intentResult });

  // ─── 2. Direct Chat Path ───────────────────────────────────────────────────
  if (intentResult.intent === "chat") {
    try {
      const chatMessages: { role: "user" | "assistant"; content: string }[] = [
        ...history,
        { role: "user", content: message },
      ];
      await llmStream(
        DIRECT_CHAT_SYSTEM,
        chatMessages,
        "mid",
        (text) => emit({ type: "content", text })
      );
    } catch {
      // Demo fallback — emit a simple response
      const demo = `I'm Thinker AI. I understand you're asking: *${message}*\n\nLet me help you with that. (Connect an API key for full AI responses.)`;
      for (const word of demo.split(" ")) {
        emit({ type: "content", text: " " + word });
        await new Promise((r) => setTimeout(r, 10));
      }
    }
    emit({ type: "done", status: "complete" });
    return;
  }

  // ─── 3. Clarification Agent ────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "clarification", label: "Checking requirements..." });
  const clarification = await runClarificationAgent(message, intentResult.intent, history);
  emit({ type: "agent_done", agent: "clarification", data: { complete: clarification.complete } });

  if (!clarification.complete && clarification.questions.length > 0) {
    emit({ type: "clarification_needed", questions: clarification.questions, intent: intentResult.intent });
    emit({ type: "done", status: "complete" });
    return;
  }

  // ─── 4. Planner Agent ──────────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "planner", label: "Creating execution plan..." });
  const planResult = await runPlannerAgent(message, intentResult.intent, clarification.requirements);
  emit({ type: "agent_done", agent: "planner", data: { steps: planResult.steps.length } });

  // ─── 5. Research Agent (optional) ─────────────────────────────────────────
  const researchSteps = planResult.steps.filter((s) => s.needsResearch);
  let research = [];
  if (researchSteps.length > 0) {
    emit({ type: "agent_start", agent: "research", label: "Gathering context..." });
    research = await runResearchAgent(researchSteps, message);
    emit({ type: "agent_done", agent: "research", data: { findings: research.length } });
  }

  // ─── 6. Builder Agent ──────────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "builder", label: "Building your deliverable..." });
  let builderOutput = await runBuilderAgent(
    message,
    planResult.steps,
    research,
    clarification.requirements,
    (text) => emit({ type: "content", text })
  );
  emit({ type: "agent_done", agent: "builder", data: { type: builderOutput.artifactType } });

  // ─── 7. Reviewer Agent ─────────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "reviewer", label: "Quality review..." });
  let reviewerResult = await runReviewerAgent(builderOutput, clarification.requirements);
  emit({ type: "agent_done", agent: "reviewer", data: { passed: reviewerResult.passed } });

  // One retry if reviewer finds high-severity issues
  const hasHighSeverity = reviewerResult.issues.some((i) => i.severity === "high");
  if (!reviewerResult.passed && hasHighSeverity) {
    emit({ type: "pipeline_retry", agent: "builder", attempt: 2 });
    emit({ type: "agent_start", agent: "builder", label: "Rebuilding (improvements applied)..." });
    builderOutput = await runBuilderAgent(
      message,
      planResult.steps,
      research,
      clarification.requirements,
      (text) => emit({ type: "content", text }),
      reviewerResult
    );
    emit({ type: "agent_done", agent: "builder", data: { type: builderOutput.artifactType, retry: true } });

    emit({ type: "agent_start", agent: "reviewer", label: "Re-reviewing..." });
    reviewerResult = await runReviewerAgent(builderOutput, clarification.requirements);
    emit({ type: "agent_done", agent: "reviewer", data: { passed: reviewerResult.passed } });
  }

  // ─── 8. Critic Agent ───────────────────────────────────────────────────────
  // NOTE: Critic runs WITHOUT seeing Reviewer verdict first (spec requirement)
  emit({ type: "agent_start", agent: "critic", label: "Independent review..." });
  const criticResult = await runCriticAgent(builderOutput);
  emit({ type: "agent_done", agent: "critic", data: { severity: criticResult.overallSeverity } });

  // ─── 9. Judge Agent ────────────────────────────────────────────────────────
  emit({ type: "agent_start", agent: "judge", label: "Final judgment..." });
  const judgeResult = await runJudgeAgent(builderOutput, reviewerResult, criticResult);
  emit({ type: "agent_done", agent: "judge", data: { approved: judgeResult.approved, score: judgeResult.totalScore } });

  // ─── 10. Consensus Agent (conditional) ────────────────────────────────────
  const reviewerCriticDisagree = reviewerResult.passed && criticResult.overallSeverity === "high";
  const highRisk = isHighRiskContent(builderOutput.content);
  const needsConsensus = judgeResult.borderline || reviewerCriticDisagree || highRisk;

  if (needsConsensus) {
    emit({ type: "agent_start", agent: "consensus", label: "Multi-model consensus vote..." });
    const consensusResult = await runConsensusAgent(builderOutput, reviewerResult, criticResult, judgeResult);
    emit({ type: "agent_done", agent: "consensus", data: { verdict: consensusResult.finalVerdict, votes: consensusResult.approveCount } });

    if (consensusResult.finalVerdict === "reject") {
      emit({ type: "content", text: builderOutput.content });
      emit({ type: "content", text: "\n\n---\n> ⚠️ **Quality Notice**: This deliverable was flagged for review. Verify before use, especially around sensitive areas." });
      emit({ type: "done", status: "complete" });
      return;
    }
  }

  // ─── 11. Final Output (already streamed during Builder) ───────────────────
  // Content was already streamed to client during Builder step.
  // Just signal completion.
  emit({ type: "done", status: "complete" });
}
