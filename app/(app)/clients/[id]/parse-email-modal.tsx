"use client";

import { useState } from "react";
import { Modal } from "@/components/modal";
import {
  ACCESS_LEVEL_OPTIONS,
  PLATFORM_ACCESS_STATUSES,
  PLATFORM_OPTIONS,
  RESOURCE_TYPES,
  type PlatformAccessStatus,
  type ResourceType,
} from "@/lib/types";

// =============================================================================
// Pure parser — heuristic, no LLM
// =============================================================================

export type ParsedPlatformDraft = {
  include: boolean;
  platform: string;
  login_email: string;
  access_level: string;
  status: PlatformAccessStatus;
  login_url: string;
  notes: string;
};

export type ParsedCredentialDraft = {
  include: boolean;
  label: string;
  url: string;
  username: string;
  password: string;
  notes: string;
};

export type ParsedResourceDraft = {
  include: boolean;
  label: string;
  url: string;
  type: ResourceType;
  notes: string;
};

export type ParseResult = {
  platforms: ParsedPlatformDraft[];
  credentials: ParsedCredentialDraft[];
  resources: ParsedResourceDraft[];
};

const PLATFORM_PATTERNS: Array<[RegExp, string]> = [
  [/\bshopify\b/i, "Shopify"],
  [/\bklaviyo\b/i, "Klaviyo"],
  [/\b(meta|facebook|fb|instagram|ig)\b/i, "Meta"],
  [/\bga4\b/i, "GA4"],
  [/\bgoogle\s+analytics\b/i, "GA4"],
  [/\bgoogle\s+ads\b/i, "Google Ads"],
  [/\btiktok\b/i, "TikTok"],
  [/\b(amazon|seller\s+central)\b/i, "Amazon"],
];

const RESOURCE_PATTERNS: Array<[RegExp, ResourceType]> = [
  [/https?:\/\/[^\s]*drive\.google\.com[^\s]*/i, "drive"],
  [/https?:\/\/[^\s]*notion\.so[^\s]*/i, "notion"],
  [/https?:\/\/[^\s]*figma\.com[^\s]*/i, "figma"],
  [/https?:\/\/[^\s]*slack\.com[^\s]*/i, "slack"],
  [/https?:\/\/[^\s]*dropbox\.com[^\s]*/i, "dropbox"],
];

const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const ACCESS_LEVEL_REGEX =
  /\b(admin|manager|staff|collaborator|owner|editor|viewer)\b/i;

// Map raw matched access keywords onto the canonical column values used by the
// platform_access form. "owner" rolls up to admin (typical email phrasing);
// "editor" is closest to manager; "viewer" we leave blank — it's vague enough
// the user should pick.
function normalizeAccessLevel(raw: string): string {
  const lc = raw.toLowerCase();
  if (lc === "owner" || lc === "admin") return "admin";
  if (lc === "editor" || lc === "manager") return "manager";
  if (lc === "staff") return "staff";
  if (lc === "collaborator") return "collaborator";
  return "";
}

// Strip a URL out of a line and clean up the leftover punctuation so it can
// be used as a label. e.g. "Google Drive: https://..." → "Google Drive"
function labelFromLineMinusUrl(line: string, url: string): string {
  return line
    .replace(url, "")
    .replace(/[:,\-—–]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const RESOURCE_FALLBACK_LABEL: Record<ResourceType, string> = {
  drive: "Google Drive folder",
  notion: "Notion page",
  figma: "Figma file",
  slack: "Slack workspace",
  dropbox: "Dropbox folder",
  other: "Link",
};

export function parseAccessEmail(text: string): ParseResult {
  const lines = text.split(/\r?\n/);
  const platforms: ParsedPlatformDraft[] = [];
  const resources: ParsedResourceDraft[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Platform — first matching keyword wins; one platform per line max
    for (const [pattern, canonical] of PLATFORM_PATTERNS) {
      if (pattern.test(line)) {
        const emailMatch = EMAIL_REGEX.exec(line);
        const accessMatch = ACCESS_LEVEL_REGEX.exec(line);
        platforms.push({
          include: true,
          platform: canonical,
          login_email: emailMatch ? emailMatch[0] : "",
          access_level: accessMatch
            ? normalizeAccessLevel(accessMatch[0])
            : "",
          status: "invited",
          login_url: "",
          notes: line.trim(),
        });
        break;
      }
    }

    // Resources — multiple URLs on one line all extracted independently
    for (const [pattern, resourceType] of RESOURCE_PATTERNS) {
      const re = new RegExp(pattern.source, pattern.flags + "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(line)) !== null) {
        const url = match[0];
        const label =
          labelFromLineMinusUrl(line, url) ||
          RESOURCE_FALLBACK_LABEL[resourceType];
        resources.push({
          include: true,
          label,
          url,
          type: resourceType,
          notes: line.trim() !== url ? line.trim() : "",
        });
      }
    }
  }

  // Credentials — pair User-line with adjacent Pass-line within 3 lines
  const userPattern = /\b(?:email|username|user|login)\s*:\s*(.+)/i;
  const pwPattern = /\b(?:pw|password|pass)\s*:\s*(.+)/i;

  type LineHit = { idx: number; value: string; full: string };
  const userLines: LineHit[] = [];
  const pwLines: LineHit[] = [];

  for (let i = 0; i < lines.length; i++) {
    const um = userPattern.exec(lines[i]);
    if (um)
      userLines.push({ idx: i, value: um[1].trim(), full: lines[i].trim() });
    const pm = pwPattern.exec(lines[i]);
    if (pm)
      pwLines.push({ idx: i, value: pm[1].trim(), full: lines[i].trim() });
  }

  const credentials: ParsedCredentialDraft[] = [];
  const usedPwIdx = new Set<number>();
  for (const u of userLines) {
    let best: LineHit | null = null;
    let bestDist = Infinity;
    for (const p of pwLines) {
      if (usedPwIdx.has(p.idx)) continue;
      const dist = Math.abs(p.idx - u.idx);
      if (dist <= 3 && dist < bestDist) {
        best = p;
        bestDist = dist;
      }
    }
    if (best) {
      usedPwIdx.add(best.idx);
      credentials.push({
        include: true,
        label: "Shared login",
        url: "",
        username: u.value,
        password: best.value,
        notes: `${u.full}\n${best.full}`,
      });
    }
  }

  return { platforms, resources, credentials };
}

// =============================================================================
// Modal
// =============================================================================

const RESOURCE_TYPE_LABEL: Record<ResourceType, string> = {
  drive: "Drive",
  notion: "Notion",
  figma: "Figma",
  slack: "Slack",
  dropbox: "Dropbox",
  other: "Other",
};

export default function ParseEmailModal({
  open,
  saving,
  onClose,
  onApply,
}: {
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onApply: (result: ParseResult) => Promise<void> | void;
}) {
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  function reset() {
    setText("");
    setParsed(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleParse() {
    setParsed(parseAccessEmail(text));
  }

  async function handleApply() {
    if (!parsed) return;
    const filtered: ParseResult = {
      platforms: parsed.platforms.filter((p) => p.include),
      credentials: parsed.credentials.filter((c) => c.include),
      resources: parsed.resources.filter((r) => r.include),
    };
    await onApply(filtered);
    reset();
  }

  const total = parsed
    ? parsed.platforms.length +
      parsed.credentials.length +
      parsed.resources.length
    : 0;
  const checked = parsed
    ? parsed.platforms.filter((p) => p.include).length +
      parsed.credentials.filter((c) => c.include).length +
      parsed.resources.filter((r) => r.include).length
    : 0;

  function updatePlatform(i: number, patch: Partial<ParsedPlatformDraft>) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      platforms: parsed.platforms.map((p, idx) =>
        idx === i ? { ...p, ...patch } : p,
      ),
    });
  }
  function updateCredential(i: number, patch: Partial<ParsedCredentialDraft>) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      credentials: parsed.credentials.map((c, idx) =>
        idx === i ? { ...c, ...patch } : c,
      ),
    });
  }
  function updateResource(i: number, patch: Partial<ParsedResourceDraft>) {
    if (!parsed) return;
    setParsed({
      ...parsed,
      resources: parsed.resources.map((r, idx) =>
        idx === i ? { ...r, ...patch } : r,
      ),
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Paste access email"
      maxWidth={780}
      footer={
        <>
          <button type="button" className="btn btn-ghost" onClick={handleClose}>
            Cancel
          </button>
          {!parsed && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleParse}
              disabled={!text.trim()}
            >
              Parse
            </button>
          )}
          {parsed && total > 0 && (
            <>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setParsed(null)}
              >
                Re-parse
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleApply}
                disabled={saving || checked === 0}
              >
                {saving
                  ? "Adding…"
                  : `Add ${checked} ${checked === 1 ? "row" : "rows"}`}
              </button>
            </>
          )}
        </>
      }
    >
      {!parsed ? (
        <div className="flex-col" style={{ gap: "var(--sp-3)" }}>
          <div className="form-group">
            <label className="form-label">
              Paste the access email from the client
            </label>
            <textarea
              rows={14}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                "e.g.\n\nEmail: techsupport@client.com\nPW: …\nShopify: pablo@attomik.co has been added with admin permissions\nKlaviyo: techsupport@client.com has been given manager access\nGoogle Drive: https://drive.google.com/…"
              }
              className="mono"
              style={{ fontSize: "var(--text-sm)" }}
            />
          </div>
          <div className="caption">
            We&rsquo;ll auto-detect platforms (Shopify, Meta, Klaviyo, GA4,
            Google Ads, TikTok, Amazon), shared logins (User/Email + PW
            adjacency), and links to Drive, Notion, Figma, Dropbox, Slack.
            You&rsquo;ll get an editable preview before anything is saved.
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex-col" style={{ gap: "var(--sp-3)" }}>
          <div className="alert alert-warning">
            Couldn&rsquo;t auto-parse this email. Try adding the entries
            manually using the buttons on the Hub.
          </div>
        </div>
      ) : (
        <div className="flex-col" style={{ gap: "var(--sp-5)" }}>
          {parsed.platforms.length > 0 && (
            <PreviewSection
              title="Platform access"
              count={parsed.platforms.length}
            >
              {parsed.platforms.map((p, i) => (
                <PlatformPreviewRow
                  key={i}
                  draft={p}
                  onChange={(patch) => updatePlatform(i, patch)}
                />
              ))}
            </PreviewSection>
          )}
          {parsed.credentials.length > 0 && (
            <PreviewSection
              title="Credentials"
              count={parsed.credentials.length}
            >
              {parsed.credentials.map((c, i) => (
                <CredentialPreviewRow
                  key={i}
                  draft={c}
                  onChange={(patch) => updateCredential(i, patch)}
                />
              ))}
            </PreviewSection>
          )}
          {parsed.resources.length > 0 && (
            <PreviewSection
              title="Resources"
              count={parsed.resources.length}
            >
              {parsed.resources.map((r, i) => (
                <ResourcePreviewRow
                  key={i}
                  draft={r}
                  onChange={(patch) => updateResource(i, patch)}
                />
              ))}
            </PreviewSection>
          )}
        </div>
      )}
    </Modal>
  );
}

// ── preview row helpers ──────────────────────────────────────────────────

function PreviewSection({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        className="label mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--sp-2)",
          marginBottom: "var(--sp-2)",
        }}
      >
        <span>{title}</span>
        <span
          className="badge badge-gray mono"
          style={{ fontSize: "var(--fs-10)" }}
        >
          {count}
        </span>
      </div>
      <div className="flex-col" style={{ gap: "var(--sp-2)" }}>
        {children}
      </div>
    </div>
  );
}

function RowFrame({
  include,
  onToggle,
  source,
  children,
}: {
  include: boolean;
  onToggle: () => void;
  source?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="card-sm"
      style={{
        border: "1px solid var(--border)",
        background: include ? "var(--paper)" : "var(--gray-150)",
        opacity: include ? 1 : 0.6,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "var(--sp-3)",
        }}
      >
        <input
          type="checkbox"
          checked={include}
          onChange={onToggle}
          style={{ marginTop: 4, width: 16, height: 16, cursor: "pointer" }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      </div>
      {source && include && (
        <div
          className="caption mono"
          style={{
            marginTop: "var(--sp-2)",
            paddingTop: "var(--sp-2)",
            borderTop: "1px solid var(--border)",
            color: "var(--subtle)",
            whiteSpace: "pre-line",
            fontSize: "var(--fs-11)",
          }}
        >
          {source}
        </div>
      )}
    </div>
  );
}

function PlatformPreviewRow({
  draft,
  onChange,
}: {
  draft: ParsedPlatformDraft;
  onChange: (patch: Partial<ParsedPlatformDraft>) => void;
}) {
  return (
    <RowFrame
      include={draft.include}
      onToggle={() => onChange({ include: !draft.include })}
      source={draft.notes}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "150px 1fr 130px 120px",
          gap: "var(--sp-2)",
          alignItems: "center",
        }}
      >
        <select
          value={
            PLATFORM_OPTIONS.includes(
              draft.platform as (typeof PLATFORM_OPTIONS)[number],
            )
              ? draft.platform
              : "Custom"
          }
          onChange={(e) => onChange({ platform: e.target.value })}
        >
          {PLATFORM_OPTIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={draft.login_email}
          onChange={(e) => onChange({ login_email: e.target.value })}
          placeholder="login email"
          className="mono"
          style={{ fontSize: "var(--text-sm)" }}
        />
        <select
          value={draft.access_level}
          onChange={(e) => onChange({ access_level: e.target.value })}
        >
          <option value="">— level —</option>
          {ACCESS_LEVEL_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={draft.status}
          onChange={(e) =>
            onChange({ status: e.target.value as PlatformAccessStatus })
          }
        >
          {PLATFORM_ACCESS_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
    </RowFrame>
  );
}

function CredentialPreviewRow({
  draft,
  onChange,
}: {
  draft: ParsedCredentialDraft;
  onChange: (patch: Partial<ParsedCredentialDraft>) => void;
}) {
  return (
    <RowFrame
      include={draft.include}
      onToggle={() => onChange({ include: !draft.include })}
      source={draft.notes}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--sp-2)",
          alignItems: "center",
        }}
      >
        <input
          value={draft.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label"
        />
        <input
          value={draft.username}
          onChange={(e) => onChange({ username: e.target.value })}
          placeholder="Username"
          className="mono"
          style={{ fontSize: "var(--text-sm)" }}
        />
        <input
          value={draft.password}
          onChange={(e) => onChange({ password: e.target.value })}
          placeholder="Password"
          className="mono"
          style={{ fontSize: "var(--text-sm)" }}
        />
      </div>
    </RowFrame>
  );
}

function ResourcePreviewRow({
  draft,
  onChange,
}: {
  draft: ParsedResourceDraft;
  onChange: (patch: Partial<ParsedResourceDraft>) => void;
}) {
  return (
    <RowFrame
      include={draft.include}
      onToggle={() => onChange({ include: !draft.include })}
      source={draft.notes && draft.notes !== draft.url ? draft.notes : undefined}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr 1fr",
          gap: "var(--sp-2)",
          alignItems: "center",
        }}
      >
        <select
          value={draft.type}
          onChange={(e) =>
            onChange({ type: e.target.value as ResourceType })
          }
        >
          {RESOURCE_TYPES.map((t) => (
            <option key={t} value={t}>
              {RESOURCE_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <input
          value={draft.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Label"
        />
        <input
          value={draft.url}
          onChange={(e) => onChange({ url: e.target.value })}
          placeholder="https://…"
          className="mono"
          style={{ fontSize: "var(--text-sm)" }}
        />
      </div>
    </RowFrame>
  );
}
