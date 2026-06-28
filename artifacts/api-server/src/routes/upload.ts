import { Router, type Request, type Response } from "express";
import { checkFileSecurity, buildParsedFile, getFileCategory } from "../lib/fileParser.js";
import { runDocumentAgent } from "../agents/documentAgent.js";
import type { PipelineEvent } from "../types/pipeline.js";

const router = Router();

function rawBodyMiddleware(req: Request, res: Response, next: () => void): void {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", () => {
    res.status(400).json({ error: "Request read error" });
  });
}

interface MultipartFile {
  fieldname: string;
  originalname: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

function parseMultipart(
  body: Buffer,
  contentType: string
): { files: MultipartFile[]; fields: Record<string, string> } {
  const files: MultipartFile[] = [];
  const fields: Record<string, string> = {};

  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) return { files, fields };
  const boundary = "--" + boundaryMatch[1];

  const bodyStr = body.toString("binary");
  const parts = bodyStr.split(boundary);

  for (const part of parts) {
    if (part === "--\r\n" || part.trim() === "--" || part.trim() === "") continue;

    const separatorIdx = part.indexOf("\r\n\r\n");
    if (separatorIdx === -1) continue;

    const headerSection = part.slice(0, separatorIdx);
    const bodyContent = part.slice(separatorIdx + 4).replace(/\r\n$/, "");

    const headers: Record<string, string> = {};
    for (const line of headerSection.split("\r\n")) {
      const idx = line.indexOf(":");
      if (idx > -1) {
        headers[line.slice(0, idx).trim().toLowerCase()] = line.slice(idx + 1).trim();
      }
    }

    const disposition = headers["content-disposition"] ?? "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    const filenameMatch = disposition.match(/filename="([^"]+)"/);

    if (!nameMatch) continue;
    const fieldName = nameMatch[1]!;

    if (filenameMatch) {
      const filename = filenameMatch[1]!;
      const mimetype = headers["content-type"] ?? "application/octet-stream";
      const buf = Buffer.from(bodyContent, "binary");
      files.push({
        fieldname: fieldName,
        originalname: filename,
        mimetype,
        buffer: buf,
        size: buf.length,
      });
    } else {
      fields[fieldName] = bodyContent;
    }
  }

  return { files, fields };
}

router.post(
  "/upload",
  rawBodyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const contentType = req.headers["content-type"] ?? "";

    if (!contentType.includes("multipart/form-data")) {
      res.status(400).json({ errorCode: "FILE_001", error: "Expected multipart/form-data upload." });
      return;
    }

    const body = (req as any).rawBody as Buffer;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ errorCode: "FILE_001", error: "Empty request body." });
      return;
    }

    const { files, fields } = parseMultipart(body, contentType);

    if (files.length === 0) {
      res.status(400).json({ errorCode: "FILE_001", error: "No file found in upload." });
      return;
    }

    const file = files[0]!;
    const userIntent = fields["intent"] ?? "analyze this file";

    const security = checkFileSecurity(file.originalname, file.size, file.buffer);
    if (!security.allowed) {
      res.status(400).json({ errorCode: security.errorCode, error: security.errorMessage });
      return;
    }

    const parsed = buildParsedFile(file.originalname, file.buffer, file.mimetype);
    const category = getFileCategory(parsed.extension);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    function emit(event: PipelineEvent) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    if (security.warnings.length > 0) {
      for (const w of security.warnings) {
        const colonIdx = w.indexOf(":");
        const code = w.slice(0, colonIdx);
        const msg = w.slice(colonIdx + 1);
        emit({ type: "file_security_warning", code, message: msg });
      }
    }

    emit({ type: "agent_start", agent: "document", label: `Reading ${file.originalname}…` });

    try {
      if (category === "document" || category === "code" || category === "data") {
        const docResult = await runDocumentAgent(parsed.text, file.originalname, userIntent);

        emit({ type: "document_ready", result: docResult });

        const sizeKB = (file.size / 1024).toFixed(1);
        const summary =
          `**${file.originalname}** (${docResult.file_type}, ~${docResult.word_count} words, ` +
          `${docResult.page_count} page${docResult.page_count !== 1 ? "s" : ""}, ${sizeKB} KB)\n\n` +
          `**Summary:** ${docResult.summary}\n\n` +
          `**Key Points:**\n${docResult.key_points.map((p) => `- ${p}`).join("\n")}` +
          (docResult.entities.length > 0
            ? `\n\n**Entities found:** ${docResult.entities.slice(0, 10).join(", ")}`
            : "");

        emit({ type: "content", text: summary });
      } else if (category === "image") {
        const sizeKB = (file.size / 1024).toFixed(1);
        emit({
          type: "agent_done",
          agent: "document",
          data: { file_name: file.originalname, category: "image", sizeBytes: file.size },
        });
        emit({
          type: "content",
          text:
            `**Image uploaded:** ${file.originalname} (${sizeKB} KB)\n\n` +
            `I can analyze this image, use it as a style reference, or edit it. What would you like to do?`,
        });
      } else if (category === "archive") {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        emit({
          type: "agent_done",
          agent: "document",
          data: { file_name: file.originalname, category: "archive", sizeBytes: file.size },
        });
        emit({
          type: "content",
          text:
            `**Archive uploaded:** ${file.originalname} (${sizeMB} MB)\n\n` +
            `I can extract and map the structure of this archive, then route each file to the appropriate agent. What would you like me to do?`,
        });
      } else {
        emit({
          type: "content",
          text: `**File uploaded:** ${file.originalname}\n\nThis file type isn't directly parseable, but I can work with its contents. What would you like to do?`,
        });
      }

      emit({ type: "done", status: "complete" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      emit({ type: "done", status: "failed", error: msg });
    } finally {
      res.end();
    }
  }
);

export default router;
