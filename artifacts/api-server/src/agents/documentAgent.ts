import { llmCall, parseJSON } from "../lib/llm.js";

export interface DocumentSection {
  title: string;
  content: string;
}

export interface DocumentTable {
  headers: string[];
  rows: string[][];
}

export interface DocumentResult {
  summary: string;
  key_points: string[];
  sections: DocumentSection[];
  data_tables: DocumentTable[];
  entities: string[];
  language: string;
  page_count: number;
  word_count: number;
  file_name: string;
  file_type: string;
}

const SYSTEM = `You are the Document Agent for Thinker AI — the 13th agent in the pipeline.

Your role: read, parse, and extract structured content from any document.

Given raw text extracted from a document, produce structured output.

Respond ONLY with valid JSON:
{
  "summary": "<2-4 sentence summary of the document>",
  "key_points": ["<point 1>", "<point 2>", ...],
  "sections": [{"title": "<section title>", "content": "<section content>"}],
  "data_tables": [{"headers": ["col1", "col2"], "rows": [["val1", "val2"]]}],
  "entities": ["<names, organizations, locations, dates, amounts>"],
  "language": "<ISO 639-1 code e.g. en, bn, ar>",
  "page_count": <number or 0 if unknown>,
  "word_count": <approximate word count>
}

Rules:
- summary: concise, captures the core purpose
- key_points: 3-8 most important takeaways
- sections: identify logical sections/chapters; if none, use ["Introduction", "Main Content", "Conclusion"]
- data_tables: extract any tabular data found in the text
- entities: extract proper nouns — names, orgs, locations, dates, monetary values
- language: detect the primary language of the document
- Respond in the same language as the document content`;

function estimatePageCount(text: string): number {
  const wordsPerPage = 250;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / wordsPerPage));
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function heuristicDocument(text: string, fileName: string): DocumentResult {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);
  const summary = sentences.slice(0, 3).join(". ").slice(0, 300) + (sentences.length > 3 ? "..." : "");

  return {
    summary: summary || "Document content extracted successfully.",
    key_points: sentences.slice(0, 5).map((s) => s.trim().slice(0, 120)).filter(Boolean),
    sections: [{ title: "Document Content", content: text.slice(0, 1000) }],
    data_tables: [],
    entities: [],
    language: "en",
    page_count: estimatePageCount(text),
    word_count: words.length,
    file_name: fileName,
    file_type: fileName.split(".").pop()?.toUpperCase() ?? "TXT",
  };
}

export async function runDocumentAgent(
  rawText: string,
  fileName: string,
  userIntent: string
): Promise<DocumentResult> {
  const fileType = fileName.split(".").pop()?.toUpperCase() ?? "TXT";
  const wordCount = countWords(rawText);
  const pageCount = estimatePageCount(rawText);

  const truncatedText = rawText.slice(0, 12000);

  const userPrompt = `File: ${fileName} (${fileType}, ~${wordCount} words, ~${pageCount} pages)
User intent: "${userIntent}"

Raw document text:
---
${truncatedText}
---

Extract structured content from this document.`;

  try {
    const raw = await llmCall(SYSTEM, userPrompt, "fast");
    const fallback = heuristicDocument(rawText, fileName);
    const parsed = parseJSON<DocumentResult>(raw, fallback);

    return {
      summary: parsed.summary ?? fallback.summary,
      key_points: parsed.key_points ?? fallback.key_points,
      sections: parsed.sections ?? fallback.sections,
      data_tables: parsed.data_tables ?? [],
      entities: parsed.entities ?? [],
      language: parsed.language ?? "en",
      page_count: parsed.page_count ?? pageCount,
      word_count: parsed.word_count ?? wordCount,
      file_name: fileName,
      file_type: fileType,
    };
  } catch {
    return heuristicDocument(rawText, fileName);
  }
}
