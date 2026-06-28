import path from "path";

export interface ParsedFile {
  text: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  fileName: string;
  category: "document" | "code" | "image" | "data" | "archive" | "unknown";
}

const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "sh", "dll", "bin", "dmg", "cmd", "ps1", "vbs",
  "msi", "com", "scr", "pif", "jar", "class",
]);

const DOCUMENT_EXTENSIONS = new Set(["pdf", "docx", "doc", "txt", "md", "rtf", "odt"]);
const CODE_EXTENSIONS = new Set([
  "js", "ts", "jsx", "tsx", "py", "rb", "go", "java", "c", "cpp", "cs",
  "php", "rs", "swift", "kt", "html", "css", "scss", "json", "yaml", "yml",
  "toml", "xml", "sql", "sh", "bash",
]);
const IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg"]);
const DATA_EXTENSIONS = new Set(["csv", "xlsx", "xls", "tsv"]);
const ARCHIVE_EXTENSIONS = new Set(["zip", "tar", "gz", "7z", "rar", "tgz"]);

const MAX_SIZES: Record<string, number> = {
  document: 50 * 1024 * 1024,
  code: 10 * 1024 * 1024,
  image: 20 * 1024 * 1024,
  data: 25 * 1024 * 1024,
  archive: 100 * 1024 * 1024,
  unknown: 10 * 1024 * 1024,
};

const CREDENTIAL_PATTERNS = [
  /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/i,
  /(?:password|passwd|pwd)\s*[:=]\s*['"]?.{6,}/i,
  /(?:sk-|pk-|rk-)[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
];

const MALWARE_PATTERNS = [
  /eval\s*\(\s*(?:atob|unescape|decodeURIComponent)\s*\(/i,
  /(?:exec|spawn|shell_exec|system)\s*\([^)]*(?:rm -rf|del \/f|format c)/i,
  /(?:cryptominer|coinhive|coin-hive|mining\.js)/i,
  /document\.write\s*\(\s*unescape\s*\(/i,
];

export function getFileCategory(ext: string): ParsedFile["category"] {
  if (DOCUMENT_EXTENSIONS.has(ext)) return "document";
  if (CODE_EXTENSIONS.has(ext)) return "code";
  if (IMAGE_EXTENSIONS.has(ext)) return "image";
  if (DATA_EXTENSIONS.has(ext)) return "data";
  if (ARCHIVE_EXTENSIONS.has(ext)) return "archive";
  return "unknown";
}

export interface FileSecurityResult {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
  warnings: string[];
}

export function checkFileSecurity(
  fileName: string,
  sizeBytes: number,
  buffer: Buffer
): FileSecurityResult {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const category = getFileCategory(ext);
  const warnings: string[] = [];

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return {
      allowed: false,
      errorCode: "FILE_003",
      errorMessage: "This file type can't be uploaded for security reasons.",
      warnings: [],
    };
  }

  const maxSize = MAX_SIZES[category] ?? MAX_SIZES.unknown;
  const maxMB = Math.round(maxSize / (1024 * 1024));
  if (sizeBytes > maxSize) {
    return {
      allowed: false,
      errorCode: "FILE_002",
      errorMessage: `That file is too large. Max size is ${maxMB}MB.`,
      warnings: [],
    };
  }

  if (category === "code" || category === "document") {
    const textSample = buffer.slice(0, 50000).toString("utf8", 0, 50000);

    for (const pattern of CREDENTIAL_PATTERNS) {
      if (pattern.test(textSample)) {
        warnings.push("FILE_004:This code file appears to contain sensitive data. Please remove it before uploading.");
        break;
      }
    }

    for (const pattern of MALWARE_PATTERNS) {
      if (pattern.test(textSample)) {
        return {
          allowed: false,
          errorCode: "FILE_005",
          errorMessage: "This code contains patterns that look potentially harmful. It won't be built.",
          warnings,
        };
      }
    }
  }

  return { allowed: true, warnings };
}

export function parseTextFromBuffer(buffer: Buffer, ext: string): string {
  if (ext === "pdf") {
    const text = buffer.toString("latin1");
    const chunks: string[] = [];
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(text)) !== null) {
      const raw = match[1] ?? "";
      const readable = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
      if (readable.length > 30) chunks.push(readable);
    }
    const extracted = chunks.join("\n");
    return extracted.length > 100 ? extracted : buffer.toString("utf8").replace(/[^\x20-\x7E\n\r\t]/g, " ").slice(0, 20000);
  }

  if (ext === "csv" || ext === "tsv") {
    return buffer.toString("utf8").slice(0, 20000);
  }

  return buffer.toString("utf8").slice(0, 20000);
}

export function buildParsedFile(
  fileName: string,
  buffer: Buffer,
  mimeType: string
): ParsedFile {
  const ext = path.extname(fileName).slice(1).toLowerCase();
  const category = getFileCategory(ext);
  const text = category !== "image" && category !== "archive"
    ? parseTextFromBuffer(buffer, ext)
    : "";

  return {
    text,
    mimeType,
    extension: ext,
    sizeBytes: buffer.length,
    fileName,
    category,
  };
}
