import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getActiveProviders, getPoolSnapshot } from "../lib/llm.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// PDF §10.6 — Resilience observability: pool health dashboard
router.get("/healthz/pool", (_req, res) => {
  const providers = getActiveProviders();
  res.json({
    status: "ok",
    activeProviders: providers,
    providerCount: providers.length,
    pools: {
      fast: getPoolSnapshot("fast"),
      mid: getPoolSnapshot("mid"),
      strong: getPoolSnapshot("strong"),
    },
    ready: providers.length > 0,
    message:
      providers.length === 0
        ? "No AI providers configured. Add at least one: ANTHROPIC_API_KEY, OPENAI_API_KEY, DEEPSEEK_API_KEY, or GEMINI_API_KEY."
        : `${providers.length} provider(s) active: ${providers.join(", ")}`,
  });
});

export default router;
