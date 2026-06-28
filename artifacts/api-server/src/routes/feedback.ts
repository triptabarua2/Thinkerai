import { Router, type Request, type Response } from "express";

const router = Router();

/**
 * POST /api/feedback
 * Post-delivery feedback loop (Section 9.4)
 * Accepts user feedback on the built output and returns
 * the appropriate pipeline options to address it.
 */
router.post("/feedback", (req: Request, res: Response): void => {
  const {
    feedbackType,
    description,
    artifactType,
    currentVersion,
  } = req.body as {
    feedbackType: "bug" | "missing_feature" | "style" | "vague";
    description?: string;
    artifactType?: string;
    currentVersion?: number;
  };

  if (!feedbackType) {
    res.status(400).json({
      code: "PIPELINE_001",
      userMessage: "I need a bit more information before I can help.",
      developerMessage: "feedbackType is required",
    });
    return;
  }

  // Map feedback type to fix type and pipeline options (Section 9.4)
  const feedbackMap: Record<
    string,
    {
      fixType: "small" | "medium" | "full_rebuild";
      suggestedPrompt: string;
      clarificationQuestion?: string;
    }
  > = {
    bug: {
      fixType: "medium",
      suggestedPrompt: description
        ? `Fix this bug: ${description}`
        : "There's a bug in the output. Can you describe exactly what's wrong?",
      clarificationQuestion: !description
        ? "What specific feature is broken, and what did you expect to happen instead?"
        : undefined,
    },
    missing_feature: {
      fixType: "medium",
      suggestedPrompt: description
        ? `Add this feature: ${description}`
        : "A feature is missing. What specifically needs to be added?",
      clarificationQuestion: !description
        ? "Which specific feature is missing from the output?"
        : undefined,
    },
    style: {
      fixType: artifactType === "code" ? "small" : "small",
      suggestedPrompt: description
        ? `Change the style: ${description}`
        : "Adjust the style or visual appearance.",
      clarificationQuestion: !description
        ? "What specific style change would you like? (e.g., color, layout, font)"
        : undefined,
    },
    vague: {
      fixType: "medium",
      suggestedPrompt: "",
      clarificationQuestion:
        "Is there a specific feature broken, something missing, or does it look wrong?",
    },
  };

  const result = feedbackMap[feedbackType];
  if (!result) {
    res.status(400).json({
      code: "PIPELINE_001",
      userMessage: "I need a bit more information before I can help.",
      developerMessage: `Unknown feedbackType: ${feedbackType}`,
    });
    return;
  }

  res.json({
    fixType: result.fixType,
    suggestedPrompt: result.suggestedPrompt,
    clarificationQuestion: result.clarificationQuestion,
    currentVersion,
    creditsEstimate: result.fixType === "small" ? 1 : result.fixType === "medium" ? 5 : 50,
  });
});

/**
 * GET /api/failover-log
 * Returns the failover log for the Founder plan dashboard (Section 10.6)
 * In production this would be keyed by session/user; here we return a placeholder.
 */
router.get("/failover-log", (req: Request, res: Response): void => {
  // In a real implementation, this would query the DB for the user's failover_log entries.
  // For now, return the structure so the frontend can display it.
  res.json({
    entries: [],
    poolHealthStatus: "healthy",
    note: "Failover log is populated per-pipeline-run and stored in session state.",
  });
});

export default router;
