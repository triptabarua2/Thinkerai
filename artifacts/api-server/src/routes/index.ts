import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import clarifyRouter from "./clarify";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/clarify", clarifyRouter);

export default router;
