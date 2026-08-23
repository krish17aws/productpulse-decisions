/**
 * Presentation-only renderers for stored AI output.
 *
 * Everything renders through React elements — no HTML string is ever injected
 * and `dangerouslySetInnerHTML` is never used. Stored values are untouched.
 */
import type { ReactNode } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  normalizeAiOutput,
  parseInline,
  parseMarkdownBlocks,
  toPlainText,
  type NormalizedAiOutput,
} from "@/lib/ai-output";
import { cn } from "@/lib/utils";

function Inline({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((token, i) =>
        token.bold ? (
          <strong key={i} className="font-semibold text-foreground">
            {token.text}
          </strong>
        ) : token.code ? (
          <code
            key={i}
            className="num rounded bg-secondary px-1 py-0.5 text-[0.85em]"
          >
            {token.text}
          </code>
        ) : (
          <span key={i}>{token.text}</span>
        ),
      )}
    </>
  );
}

/** Renders Markdown-ish text using the app's own typography. */
export function MarkdownText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const blocks = parseMarkdownBlocks(text);
  if (!blocks.length) return null;
  return (
    <div
      className={cn(
        "space-y-2 text-sm text-muted-foreground [overflow-wrap:anywhere]",
        className,
      )}
    >
      {blocks.map((block, i) => {
        if (block.kind === "heading") {
          return (
            <p
              key={i}
              className={cn(
                "font-semibold text-foreground",
                block.level <= 2
                  ? "text-sm"
                  : "text-xs uppercase tracking-wide",
              )}
            >
              <Inline text={block.text} />
            </p>
          );
        }
        if (block.kind === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={i}
              className={cn(
                "ml-4 space-y-1",
                block.ordered ? "list-decimal" : "list-disc",
              )}
            >
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline text={item} />
                </li>
              ))}
            </ListTag>
          );
        }
        return (
          <p key={i}>
            <Inline text={block.text} />
          </p>
        );
      })}
    </div>
  );
}

/** Plain-text preview clamped to a fixed number of lines. */
export function ClampedText({
  text,
  lines = 6,
  className,
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const plain = toPlainText(text);
  if (!plain) return null;
  return (
    <p
      className={cn(
        "text-sm text-muted-foreground [overflow-wrap:anywhere]",
        className,
      )}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: lines,
        overflow: "hidden",
      }}
    >
      {plain}
    </p>
  );
}

function EvidenceList({ label, items }: { label: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <ul className="mt-1 ml-4 list-disc space-y-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
        {items.map((item, i) => (
          <li key={i}>
            <Inline text={item} />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Full normalized analysis inside an accessible modal (focus trap + Escape). */
export function FullAnalysisDialog({
  open,
  onOpenChange,
  title,
  description,
  value,
  extra,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  value: unknown;
  extra?: ReactNode;
}) {
  const normalized: NormalizedAiOutput = normalizeAiOutput(value);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="[overflow-wrap:anywhere]">
            {title}
          </DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="space-y-4">
          {extra}
          <MarkdownText text={normalized.summary} />
          <EvidenceList label="Evidence" items={normalized.evidence} />
          <EvidenceList
            label="Contradicting evidence"
            items={normalized.contradicting}
          />
          {normalized.raw && normalized.raw !== normalized.summary ? (
            <details className="rounded-lg border border-border p-3">
              <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Complete stored response
              </summary>
              <pre className="num mt-2 whitespace-pre-wrap break-all text-xs text-muted-foreground">
                {normalized.raw}
              </pre>
            </details>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
