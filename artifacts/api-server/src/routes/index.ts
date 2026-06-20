import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import clarifyRouter from "./clarify";
import pipelineRouter from "./pipeline";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/clarify", clarifyRouter);
router.use("/pipeline", pipelineRouter);

export default router;
