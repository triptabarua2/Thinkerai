import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import clarifyRouter from "./clarify";
import pipelineRouter from "./pipeline";
import stripeRouter from "./stripe";
import uploadRouter from "./upload";
import downloadRouter from "./download";
import feedbackRouter from "./feedback";
import creditsRouter from "./credits";
import transcribeRouter from "./transcribe";
import notificationsRouter from "./notifications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/chat", chatRouter);
router.use("/clarify", clarifyRouter);
router.use("/pipeline", pipelineRouter);
router.use(stripeRouter);
router.use(uploadRouter);
router.use(downloadRouter);
router.use(feedbackRouter);
router.use("/credits", creditsRouter);
router.use(transcribeRouter);
router.use("/notifications", notificationsRouter);

export default router;
