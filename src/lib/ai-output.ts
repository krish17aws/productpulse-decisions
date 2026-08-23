/**
 * Presentation-only normalisation of stored AI output.
 *
 * The database holds a mix of plain Markdown, JSON strings and JSON wrapped in
 * ```json fences. Nothing here modifies or rewrites the stored value — it only
 * produces a friendlier shape for rendering.
 */

export interface NormalizedAiOutput {
  /** Main human-readable summary (Markdown, fences stripped). */
  summary: string;
  evidence: string[];
  contradicting: string[];
  confidence: number | null;
  /** The complete original content, for the expandable details area. */
  raw: string;
  /** True when the value parsed as structured JSON. */
  structured: boolean;
}

function stripFences(value: string): string {
  const trimmed = value.trim();
  const fenced = /^```(?:json|markdown|md)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return fenced?.[1] ? fenced[1].trim() : trimmed;
}

function looksLikeJson(value: string): boolean {
  const v = value.trim();
  return (v.startsWith("{") && v.endsWith("}")) || (v.startsWith("[") && v.endsWith("]"));
}

function toStringList(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === "string"
          ? item
          : item && typeof item === "object"
            ? Object.values(item as Record<string, unknown>)
                .filter((v) => typeof v === "string" || typeof v === "number")
                .join(" — ")
            : String(item),
      )
      .map((s) => s.trim())
      .filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(/\r?\n|(?:^|\s)[-•]\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function pickSummary(obj: Record<string, unknown>): string {
  const keys = ["finding_summary", "summary", "analysis", "conclusion", "text", "content"];
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return stripFences(v);
  }
  // No known summary key — render the readable string fields instead of braces.
  const parts = Object.entries(obj)
    .filter(([, v]) => typeof v === "string" && v.trim())
    .map(([k, v]) => `**${k.replace(/_/g, " ")}:** ${String(v)}`);
  return parts.join("\n\n");
}

/** Normalises unknown AI output into summary / evidence / confidence parts. */
export function normalizeAiOutput(input: unknown): NormalizedAiOutput {
  const empty: NormalizedAiOutput = {
    summary: "",
    evidence: [],
    contradicting: [],
    confidence: null,
    raw: "",
    structured: false,
  };
  if (input === null || input === undefined) return empty;

  let obj: Record<string, unknown> | null = null;
  let raw: string;

  if (typeof input === "object") {
    obj = input as Record<string, unknown>;
    raw = JSON.stringify(input, null, 2);
  } else {
    raw = String(input);
    const cleaned = stripFences(raw);
    if (looksLikeJson(cleaned)) {
      try {
        const parsed: unknown = JSON.parse(cleaned);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          obj = parsed as Record<string, unknown>;
        }
      } catch {
        obj = null;
      }
    }
    if (!obj) {
      return { ...empty, summary: cleaned, raw };
    }
  }

  const confidenceValue = obj["confidence"];
  return {
    summary: pickSummary(obj),
    evidence: toStringList(obj["evidence"] ?? obj["supporting_evidence"]),
    contradicting: toStringList(obj["contradicting_evidence"] ?? obj["counter_evidence"]),
    confidence: typeof confidenceValue === "number" ? confidenceValue : null,
    raw,
    structured: true,
  };
}

export type MarkdownBlock =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] };

/** Splits Markdown-ish text into simple renderable blocks (no HTML anywhere). */
export function parseMarkdownBlocks(input: string): MarkdownBlock[] {
  const text = stripFences(input ?? "");
  if (!text.trim()) return [];
  const lines = text.replace(/```[a-z]*\n?/gi, "").split(/\r?\n/);
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ kind: "paragraph", text: paragraph.join(" ").trim() });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list && list.items.length) blocks.push({ kind: "list", ...list });
    list = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(trimmed);
    if (heading?.[1] && heading[2]) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].trim() });
      continue;
    }
    const bullet = /^[-*•]\s+(.*)$/.exec(trimmed);
    if (bullet?.[1]) {
      flushParagraph();
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1].trim());
      continue;
    }
    const numbered = /^\d+[.)]\s+(.*)$/.exec(trimmed);
    if (numbered?.[1]) {
      flushParagraph();
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(numbered[1].trim());
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }
  flushParagraph();
  flushList();
  return blocks;
}

export type InlineToken = { bold: boolean; code: boolean; text: string };

/** Splits inline Markdown emphasis/code into plain tokens. */
export function parseInline(input: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`|__[^_]+__)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(input)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ bold: false, code: false, text: input.slice(lastIndex, match.index) });
    }
    const chunk = match[0];
    if (chunk.startsWith("`")) tokens.push({ bold: false, code: true, text: chunk.slice(1, -1) });
    else tokens.push({ bold: true, code: false, text: chunk.slice(2, -2) });
    lastIndex = match.index + chunk.length;
  }
  if (lastIndex < input.length) {
    tokens.push({ bold: false, code: false, text: input.slice(lastIndex) });
  }
  return tokens.length ? tokens : [{ bold: false, code: false, text: input }];
}

/** Plain-text version used for clamped previews. */
export function toPlainText(input: string): string {
  return stripFences(input ?? "")
    .replace(/```[a-z]*/gi, "")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^[-*•]\s+/gm, "• ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/**
 * Splits a rationale into the main body and an embedded risk review section,
 * detected by a Markdown heading mentioning risk / governance.
 */
export function splitRiskReview(input: string): { body: string; riskReview: string | null } {
  const text = stripFences(input ?? "");
  const match = /^#{1,6}\s*.*(risk|governance).*$/im.exec(text);
  if (!match || match.index === undefined) return { body: text, riskReview: null };
  const body = text.slice(0, match.index).trim();
  const riskReview = text.slice(match.index).trim();
  if (!body) return { body: text, riskReview: null };
  return { body, riskReview };
}
