/**
 * POST /api/transcribe
 * Accepts a multipart/form-data upload with an `audio` field (any common
 * audio format — m4a, webm, wav, mp3).  Transcribes via OpenAI Whisper and
 * returns { transcript: string }.
 *
 * Returns 503 when OPENAI_API_KEY is not configured.
 */
import { Router, type Request, type Response } from "express";

const router = Router();

// ── Multipart parser (minimal, reuses the pattern from upload.ts) ─────────────
function parseMultipartAudio(
  body: Buffer,
  contentType: string,
): { buffer: Buffer; mimeType: string; filename: string } | null {
  const boundaryMatch = contentType.match(/boundary=([^\s;]+)/);
  if (!boundaryMatch) return null;
  const boundary = "--" + boundaryMatch[1];
  const bodyStr = body.toString("binary");
  const parts = bodyStr.split(boundary);

  for (const part of parts) {
    if (part === "--\r\n" || part.trim() === "--" || part.trim() === "") continue;
    const sep = part.indexOf("\r\n\r\n");
    if (sep === -1) continue;

    const headers = part.slice(0, sep);
    const disposition = headers.match(/Content-Disposition:([^\r\n]+)/i)?.[1] ?? "";
    const nameMatch = disposition.match(/name="([^"]+)"/);
    if (!nameMatch || !["audio", "file"].includes(nameMatch[1])) continue;

    const mimeMatch = headers.match(/Content-Type:\s*([^\r\n]+)/i);
    const mimeType = mimeMatch ? mimeMatch[1].trim() : "audio/m4a";
    const filenameMatch = disposition.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : "audio.m4a";

    const contentBytes = part.slice(sep + 4).replace(/\r\n--$/, "");
    const buffer = Buffer.from(contentBytes, "binary");
    return { buffer, mimeType, filename };
  }
  return null;
}

// ── Raw body collector (10 MB limit) ─────────────────────────────────────────
const MAX_AUDIO_BYTES = 10 * 1024 * 1024; // 10 MB

function rawBodyMiddleware(req: Request, res: Response, next: () => void): void {
  // Reject obviously oversized requests early
  const contentLength = parseInt(req.headers["content-length"] ?? "0", 10);
  if (contentLength > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: "Audio file too large (10 MB max)" });
    return;
  }

  const chunks: Buffer[] = [];
  let received = 0;

  req.on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (received > MAX_AUDIO_BYTES) {
      res.status(413).json({ error: "Audio file too large (10 MB max)" });
      req.destroy();
      return;
    }
    chunks.push(chunk);
  });
  req.on("end", () => {
    (req as any).rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", () => {
    res.status(400).json({ error: "Request read error" });
  });
}

// ── POST /api/transcribe ──────────────────────────────────────────────────────
router.post(
  "/transcribe",
  rawBodyMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    const apiKey = process.env["OPENAI_API_KEY"];
    if (!apiKey) {
      res.status(503).json({
        error: "Transcription unavailable — set OPENAI_API_KEY in Secrets to enable voice input.",
      });
      return;
    }

    const contentType = req.headers["content-type"] ?? "";
    const rawBody = (req as any).rawBody as Buffer | undefined;

    if (!rawBody || rawBody.length === 0) {
      res.status(400).json({ error: "Empty request body" });
      return;
    }

    // Parse the audio file from multipart form
    const audioFile = parseMultipartAudio(rawBody, contentType);
    if (!audioFile) {
      res.status(400).json({ error: "Could not parse audio file from request" });
      return;
    }

    try {
      // Send to OpenAI Whisper via fetch + FormData (Node 18+ built-ins)
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioFile.buffer)], { type: audioFile.mimeType });
      formData.append("file", blob, audioFile.filename);
      formData.append("model", "whisper-1");
      formData.append("language", ""); // auto-detect

      const whisperRes = await fetch(
        "https://api.openai.com/v1/audio/transcriptions",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}` },
          body: formData,
        },
      );

      if (!whisperRes.ok) {
        const err = await whisperRes.text();
        res.status(502).json({ error: `Whisper API error: ${err.slice(0, 200)}` });
        return;
      }

      const data = await whisperRes.json() as { text?: string };
      res.json({ transcript: data.text ?? "" });
    } catch (err: any) {
      res.status(500).json({ error: `Transcription failed: ${err?.message ?? "unknown"}` });
    }
  },
);

export default router;
