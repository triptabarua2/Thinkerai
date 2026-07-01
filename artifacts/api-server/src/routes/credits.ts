import { Router, type Request, type Response } from "express";
import { getUserCredits } from "../lib/db.js";

const router = Router();

/**
 * GET /api/credits/balance?userId=...
 * Returns the user's real plan tier and credit balance (§21, §24).
 * Creates a default Free-plan row on first call if the user has none yet.
 */
router.get("/balance", async (req: Request, res: Response): Promise<void> => {
  const userId = (req.query["userId"] as string | undefined) ?? "default";

  try {
    const credits = await getUserCredits(userId);

    if (!credits) {
      // No database configured — fall back to a static Free-plan shape so
      // the client still has something sane to render in dev/offline mode.
      res.json({
        planTier: "free",
        creditsBalance: 50,
        extraCreditsBalance: 0,
        totalBalance: 50,
        monthlyQuota: 50,
        creditsUsedThisMonth: 0,
        source: "fallback",
      });
      return;
    }

    res.json({ ...credits, source: "database" });
  } catch (err) {
    res.status(500).json({ error: "Unable to load credit balance." });
  }
});

export default router;
