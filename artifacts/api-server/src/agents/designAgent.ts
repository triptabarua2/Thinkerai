import { llmCall } from "../lib/llm.js";

export interface DesignOutput {
  description: string;
  imagePrompt: string;
  imageUrl: string | null;
  status: "generated" | "placeholder" | "failed";
  next_action: "proceed" | "retry";
  reason: string;
}

const SYSTEM = `You are the Design Agent for Thinker AI.

You handle visual/graphic output — logos, illustrations, UI mockup imagery, posters, icons.
You do NOT produce 3D models, animation, or video.

Given a step description and brand/style requirements, produce:
1. A precise image generation prompt (English, highly detailed)
2. A plain-language description of what will be generated

Respond ONLY with valid JSON:
{
  "description": "<what this image will show — one sentence for the user>",
  "imagePrompt": "<detailed English prompt for image generation API — include style, mood, composition>",
  "next_action": "proceed",
  "reason": "Image prompt ready for generation"
}`;

function buildImagePrompt(stepDescription: string, styleHints: string): string {
  return `${stepDescription}. ${styleHints || "Clean, modern, professional design. Minimal style. High quality."} Digital artwork, crisp lines, vibrant but tasteful colors.`;
}

async function callImageAPI(prompt: string): Promise<string | null> {
  const openaiKey = process.env["OPENAI_API_KEY"];
  if (!openaiKey) return null;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt.slice(0, 1000),
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (res.ok) {
      const json = (await res.json()) as { data?: { url?: string }[] };
      return json.data?.[0]?.url ?? null;
    }
  } catch {
    // fall through
  }

  return null;
}

export async function runDesignAgent(
  stepDescription: string,
  styleHints: string,
  brandRequirements: Record<string, string>
): Promise<DesignOutput> {
  const brandStr = Object.entries(brandRequirements)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  const userPrompt = `Step: "${stepDescription}"
Style hints: ${styleHints || "none"}
Brand requirements: ${brandStr || "none"}

Generate the image prompt and description.`;

  let imagePrompt = buildImagePrompt(stepDescription, styleHints);
  let description = `Visual asset for: ${stepDescription}`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "mid");
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]) as { description?: string; imagePrompt?: string };
      if (parsed.description) description = parsed.description;
      if (parsed.imagePrompt) imagePrompt = parsed.imagePrompt;
    }
  } catch {
    // use defaults
  }

  const imageUrl = await callImageAPI(imagePrompt);

  return {
    description,
    imagePrompt,
    imageUrl,
    status: imageUrl ? "generated" : "placeholder",
    next_action: "proceed",
    reason: imageUrl ? "Image generated successfully" : "No image API available — placeholder used",
  };
}
