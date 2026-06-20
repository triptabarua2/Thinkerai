import Anthropic from "@anthropic-ai/sdk";

export type ModelTier = "fast" | "mid" | "strong";

const MODELS: Record<ModelTier, string> = {
  fast: "claude-haiku-4-5",
  mid: "claude-sonnet-4-6",
  strong: "claude-opus-4-8",
};

export function getAnthropicClient(): Anthropic | null {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

export function hasLLM(): boolean {
  return !!process.env["ANTHROPIC_API_KEY"] || !!process.env["DEEPSEEK_API_KEY"];
}

export async function llmCall(
  system: string,
  user: string,
  tier: ModelTier = "mid"
): Promise<string> {
  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      const msg = await anthropic.messages.create({
        model: MODELS[tier],
        max_tokens: 8192,
        system,
        messages: [{ role: "user", content: user }],
      });
      const block = msg.content[0];
      return block.type === "text" ? block.text : "";
    } catch {
      // fall through to DeepSeek
    }
  }

  const dsKey = process.env["DEEPSEEK_API_KEY"];
  if (dsKey) {
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${dsKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          max_tokens: 8192,
          messages: [{ role: "system", content: system }, { role: "user", content: user }],
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as { choices: { message: { content: string } }[] };
        return json.choices?.[0]?.message?.content ?? "";
      }
    } catch {
      // fall through
    }
  }

  throw new Error("NO_LLM");
}

export async function llmStream(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  tier: ModelTier = "strong",
  onChunk: (text: string) => void
): Promise<string> {
  const anthropic = getAnthropicClient();
  if (anthropic) {
    try {
      let full = "";
      const stream = anthropic.messages.stream({
        model: MODELS[tier],
        max_tokens: 8192,
        system,
        messages,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          full += event.delta.text;
          onChunk(event.delta.text);
        }
      }
      return full;
    } catch {
      // fall through
    }
  }

  const dsKey = process.env["DEEPSEEK_API_KEY"];
  if (dsKey) {
    try {
      const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${dsKey}` },
        body: JSON.stringify({
          model: "deepseek-chat",
          stream: true,
          max_tokens: 8192,
          messages: [{ role: "system", content: system }, ...messages],
        }),
      });
      if (res.ok) {
        const reader = res.body?.getReader();
        if (!reader) throw new Error("no body");
        const dec = new TextDecoder();
        let full = "";
        let buf = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() ?? "";
          for (const line of lines) {
            const t = line.trim();
            if (!t.startsWith("data: ")) continue;
            const d = t.slice(6);
            if (d === "[DONE]") continue;
            try {
              const p = JSON.parse(d) as { choices?: { delta?: { content?: string } }[] };
              const c = p.choices?.[0]?.delta?.content;
              if (c) { full += c; onChunk(c); }
            } catch {}
          }
        }
        return full;
      }
    } catch {
      // fall through
    }
  }

  throw new Error("NO_LLM");
}

export async function llmParallel(
  calls: { system: string; user: string; tier: ModelTier }[]
): Promise<string[]> {
  return Promise.all(calls.map((c) => llmCall(c.system, c.user, c.tier)));
}

export function parseJSON<T>(raw: string, fallback: T): T {
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? raw) as T;
  } catch {
    return fallback;
  }
}
