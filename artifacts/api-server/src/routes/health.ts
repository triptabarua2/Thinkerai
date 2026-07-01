import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { getActivePoolCount, getPoolSnapshot } from "../lib/llm.js";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// PDF §10.6 — Resilience observability: pool health dashboard
// §6.5: no provider or model names are exposed — only counts and generic slot labels.
router.get("/healthz/pool", (_req, res) => {
  const poolCount = getActivePoolCount();
  res.json({
    status: "ok",
    poolCount,
    pools: {
      fast: getPoolSnapshot("fast"),
      mid: getPoolSnapshot("mid"),
      strong: getPoolSnapshot("strong"),
    },
    ready: poolCount > 0,
    message:
      poolCount === 0
        ? "No AI pools configured. Add at least one provider key via environment secrets."
        : `${poolCount} pool(s) active.`,
  });
});

export default router;
