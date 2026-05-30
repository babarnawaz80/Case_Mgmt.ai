/**
 * ConsentComposerStep — Step 2 of the 4-step consent request modal.
 *
 * Left panel: Tiptap rich text editor with toolbar + template selector
 * Right panel: Live mobile phone-frame preview
 *
 * The editor's HTML is synced upward via `onChange` on every keystroke.
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, Minus, Loader2,
  Monitor, Smartphone, AlertTriangle, Save,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FULL_TEMPLATES, SIGNATURE_BLOCK_HTML,
  substituteVariables, findUnfilledPlaceholders, highlightPlaceholders,
} from "./consentTemplates";
import { toast } from "sonner";
import type { Individual } from "@/hooks/useIndividuals";

// ─── Props ────────────────────────────────────────────────────────────────────

interface ConsentComposerStepProps {
  consentTypeId: string;
  consentTypeLabel: string;
  individual: Individual;
  cmName: string;
  agencyName: string;
  /** Called on every editor change with the current HTML */
  onChange: (html: string, text: string) => void;
  /** Initial HTML (if re-entering the step) */
  initialHtml?: string;
  /** Save draft callback */
  onSaveDraft?: (html: string) => Promise<void>;
}

// ─── Editor toolbar button ─────────────────────────────────────────────────────

function ToolbarBtn({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "h-7 w-7 flex items-center justify-center rounded-md text-[12px] transition-colors",
        active
          ? "bg-icm-accent text-white"
          : "text-icm-text-dim hover:bg-icm-bg hover:text-icm-text"
      )}
    >
      {children}
    </button>
  );
}

// ─── Mobile phone frame preview ───────────────────────────────────────────────

function MobilePhonePreview({
  html,
  signatureHtml,
  consentTypeLabel,
  individualName,
  cmName,
}: {
  html: string;
  signatureHtml: string;
  consentTypeLabel: string;
  individualName: string;
  cmName: string;
}) {
  const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const previewHtml = highlightPlaceholders(html);

  return (
    <div className="flex flex-col items-center">
      {/* Phone frame */}
      <div
        className="relative bg-gray-900 rounded-[2.5rem] p-[10px] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
        style={{ width: 280 }}
      >
        {/* Notch */}
        <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-b-xl z-10" />
        {/* Screen */}
        <div
          className="bg-white rounded-[1.8rem] overflow-y-auto"
          style={{ height: 520, scrollbarWidth: "none" }}
        >
          {/* Inner content */}
          <div className="px-3 pt-8 pb-4">
            {/* Header */}
            <div className="text-center mb-3">
              <p className="text-[9px] font-bold text-gray-800">CaseManagement.AI</p>
            </div>
            <div className="flex items-center gap-1 text-[8px] text-green-700 font-semibold bg-green-50 rounded px-2 py-1 mb-3">
              <span>🔒</span>
              <span>Verified · {individualName} · {today}</span>
            </div>
            <hr className="border-gray-200 mb-3" />

            {/* Consent type */}
            <h2 className="text-[12px] font-bold text-gray-900 mb-2 leading-tight">{consentTypeLabel}</h2>
            <div className="text-[8.5px] text-gray-600 space-y-0.5 mb-3">
              <p>Individual: <span className="font-medium text-gray-800">{individualName}</span></p>
              {cmName && <p>Case Manager: <span className="font-medium text-gray-800">{cmName}</span></p>}
              <p>Date: <span className="font-medium text-gray-800">{today}</span></p>
            </div>
            <hr className="border-gray-200 mb-3" />

            {/* Consent body */}
            <div
              className="consent-preview-body"
              style={{ fontSize: 8.5, lineHeight: 1.5, color: "#1a1a1a" }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />

            {/* Signature block */}
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-[8px] font-bold text-gray-700 mb-2">SIGNATURE AND AGREEMENT</p>
              <div className="border border-gray-300 rounded-md h-10 mb-2 flex items-center justify-center">
                <p className="text-[7.5px] text-gray-400 uppercase tracking-wide">TAP TO SIGN</p>
              </div>
              <p className="text-[7.5px] text-gray-600 mb-1">Printed Name: _______________</p>
              <p className="text-[7.5px] text-gray-600 mb-1">Date: _______________</p>
              <p className="text-[7.5px] text-gray-600">Relationship: ▾ Select</p>
            </div>

            <div className="mt-3">
              <div className="bg-gray-900 text-white rounded-lg py-2 text-center text-[8px] font-bold">
                SUBMIT SIGNATURE →
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="text-[10.5px] text-icm-text-faint mt-2">
        Last updated: just now
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ConsentComposerStep({
  consentTypeId,
  consentTypeLabel,
  individual,
  cmName,
  agencyName,
  onChange,
  initialHtml,
  onSaveDraft,
}: ConsentComposerStepProps) {
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">("mobile");
  const [savingDraft, setSavingDraft] = useState(false);
  const [editorHtml, setEditorHtml] = useState(initialHtml ?? "");

  const individualName = `${individual.first_name} ${individual.last_name}`;
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  // Build variable data for substitution
  const varData = {
    individualName,
    agencyName: agencyName || "[Agency Name]",
    cmName: cmName || "[CM Name]",
    today,
    guardianName: individual.guardian_name,
    guardianPhone: individual.guardian_phone,
    individualPhone: individual.phone,
  };

  // Build initial template HTML from the selected consent type
  const buildInitialHtml = useCallback(() => {
    if (initialHtml) return initialHtml;
    const tpl = FULL_TEMPLATES.find((t) => t.id === consentTypeId);
    if (!tpl) {
      return `<h1>${consentTypeLabel}</h1><p>${individualName} consents to the following:</p><p>[Additional details here]</p>`;
    }
    return substituteVariables(tpl.bodyHtml, varData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentTypeId, initialHtml]);

  // Tiptap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: true }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: buildInitialHtml(),
    onUpdate({ editor }) {
      const html = editor.getHTML();
      const text = editor.getText();
      setEditorHtml(html);
      onChange(html, text);
    },
    editorProps: {
      attributes: {
        class: "prose-consent-editor focus:outline-none min-h-[300px] px-4 py-3 text-[13px] text-icm-text leading-relaxed",
      },
    },
  });

  // Sync initial content on type change
  useEffect(() => {
    if (editor && !initialHtml) {
      const html = buildInitialHtml();
      editor.commands.setContent(html, false);
      setEditorHtml(html);
      onChange(html, editor.getText());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consentTypeId]);

  // Word and character counts
  const wordCount = useMemo(() => {
    return editorHtml.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length;
  }, [editorHtml]);
  const charCount = useMemo(() => {
    return editorHtml.replace(/<[^>]+>/g, "").length;
  }, [editorHtml]);

  // Unfilled placeholders
  const unfilled = useMemo(() => findUnfilledPlaceholders(editorHtml), [editorHtml]);

  // Template loading
  function loadTemplate(typeId: string) {
    if (!editor) return;
    const hasContent = editorHtml.replace(/<[^>]+>/g, "").trim().length > 0;
    if (hasContent && !window.confirm("Replace current content with this template?")) return;

    if (typeId === "_blank") {
      editor.commands.setContent("<p></p>", false);
      return;
    }
    const tpl = FULL_TEMPLATES.find((t) => t.id === typeId);
    if (!tpl) return;
    const substituted = substituteVariables(tpl.bodyHtml, varData);
    editor.commands.setContent(substituted, false);
    const newHtml = editor.getHTML();
    setEditorHtml(newHtml);
    onChange(newHtml, editor.getText());
  }

  async function handleSaveDraft() {
    if (!onSaveDraft) return;
    setSavingDraft(true);
    try {
      await onSaveDraft(editorHtml);
      toast.success("Draft saved.");
    } catch {
      toast.error("Failed to save draft.");
    } finally {
      setSavingDraft(false);
    }
  }

  if (!editor) return null;

  return (
    <div className="flex flex-col md:flex-row gap-0 h-full min-h-[520px]">
      {/* ── Left: Editor ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col border-r border-icm-border min-w-0">
        {/* Toolbar row 1 */}
        <div className="flex items-center gap-0.5 px-3 py-2 border-b border-icm-border bg-icm-bg/60 flex-wrap">
          <ToolbarBtn title="Bold" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
            <Bold className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Italic" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
            <Italic className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Underline" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")}>
            <UnderlineIcon className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")}>
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-icm-border mx-1" />

          <ToolbarBtn title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })}>
            <Heading1 className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>
            <Heading2 className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-icm-border mx-1" />

          <ToolbarBtn title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>
            <List className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-icm-border mx-1" />

          <ToolbarBtn title="Insert divider" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="w-3.5 h-3.5" />
          </ToolbarBtn>
          <ToolbarBtn title="Clear formatting" onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>
            <span className="text-[10px] font-mono">Tx</span>
          </ToolbarBtn>
        </div>

        {/* Toolbar row 2: template selector */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-icm-border bg-icm-bg/40">
          <span className="text-[11px] text-icm-text-faint font-medium shrink-0">Load template:</span>
          <select
            onChange={(e) => loadTemplate(e.target.value)}
            defaultValue=""
            className="flex-1 h-7 px-2 rounded-md border border-icm-border bg-white text-[11.5px] text-icm-text appearance-none"
          >
            <option value="" disabled>Select a template…</option>
            <option value="_blank">Start from scratch</option>
            {FULL_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        {/* Editor area */}
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} />
        </div>

        {/* Signature block label */}
        <div className="border-t border-icm-border bg-icm-bg/60 px-4 py-1.5">
          <p className="text-[10px] text-icm-text-faint italic">
            Signature block (auto-appended to all consent documents — cannot be edited)
          </p>
        </div>

        {/* Non-editable signature block preview */}
        <div className="border-t border-icm-border bg-gray-50 px-4 py-2 text-[11.5px] text-gray-500 font-mono space-y-1 select-none pointer-events-none">
          <div className="border-t border-gray-300 pt-2">
            <p className="font-semibold text-gray-600">SIGNATURE AND AGREEMENT</p>
            <p>By signing below, I acknowledge that I have read, understand, and agree to the terms of this consent.</p>
            <p className="mt-1">Participant / Guardian Signature: _______________________</p>
            <p>Printed Name: _______________________</p>
            <p>Date: _____________ &nbsp;&nbsp; Relationship: _______________________</p>
          </div>
          <div className="border-t border-gray-300 pt-1">
            <p>Case Manager Signature: _______________________</p>
            <p>Printed Name: _______________________ &nbsp; Agency: _______________________</p>
          </div>
        </div>

        {/* Footer: word count, unfilled warning, save draft */}
        <div className="border-t border-icm-border px-4 py-2 bg-icm-bg/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-icm-text-faint">
              {wordCount} words · {charCount} characters
            </span>
            {onSaveDraft && (
              <button
                onClick={handleSaveDraft}
                disabled={savingDraft}
                className="h-7 px-3 rounded-lg border border-icm-border text-[11.5px] font-medium text-icm-text-dim hover:text-icm-text hover:bg-icm-bg flex items-center gap-1 disabled:opacity-50"
              >
                {savingDraft ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                Save draft
              </button>
            )}
          </div>

          {unfilled.length > 0 && (
            <div className="flex items-start gap-1.5 rounded-md border border-icm-amber/40 bg-icm-amber-soft px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-icm-amber shrink-0 mt-0.5" />
              <p className="text-[11px] text-icm-text font-geist">
                <span className="font-semibold">Unfilled placeholders:</span>{" "}
                {unfilled.join(", ")}
                <span className="text-icm-text-dim"> — Fill these in before sending or click "Send anyway."</span>
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right: Preview ───────────────────────────────────────────────── */}
      <div className="w-full md:w-[45%] flex flex-col bg-icm-bg/30 min-w-0">
        {/* Preview header */}
        <div className="px-4 py-3 border-b border-icm-border flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-icm-text">📱 Guardian's View — Live Preview</p>
            <p className="text-[10.5px] text-icm-text-dim mt-0.5">
              This is exactly what {individualName || "the recipient"} will see on their phone.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-icm-bg rounded-lg p-0.5">
            <button
              onClick={() => setPreviewMode("desktop")}
              className={cn("h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors", previewMode === "desktop" ? "bg-white text-icm-text shadow-sm" : "text-icm-text-dim")}
            >
              <Monitor className="w-3 h-3" /> Desktop
            </button>
            <button
              onClick={() => setPreviewMode("mobile")}
              className={cn("h-7 px-2 rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors", previewMode === "mobile" ? "bg-white text-icm-text shadow-sm" : "text-icm-text-dim")}
            >
              <Smartphone className="w-3 h-3" /> Mobile
            </button>
          </div>
        </div>

        {/* Preview content */}
        <div className="flex-1 overflow-y-auto flex items-start justify-center px-4 py-5">
          {previewMode === "mobile" ? (
            <MobilePhonePreview
              html={editorHtml}
              signatureHtml={SIGNATURE_BLOCK_HTML}
              consentTypeLabel={consentTypeLabel}
              individualName={individualName}
              cmName={cmName}
            />
          ) : (
            /* Desktop preview — wide card */
            <div className="w-full bg-white rounded-xl border border-icm-border shadow-sm p-5 text-[13px]">
              <div className="text-center mb-4 pb-4 border-b border-gray-200">
                <p className="text-[11px] font-semibold text-gray-600 uppercase tracking-wider">CaseManagement.AI</p>
                <h2 className="text-[18px] font-bold text-gray-900 mt-1">{consentTypeLabel}</h2>
                <p className="text-[12px] text-gray-500 mt-1">Individual: {individualName} · Date: {today}</p>
              </div>
              <div
                className="consent-preview-body"
                dangerouslySetInnerHTML={{ __html: highlightPlaceholders(editorHtml) }}
              />
              <div className="mt-5 pt-4 border-t border-gray-200 text-[12px] text-gray-500 font-mono space-y-1">
                <p className="font-semibold text-gray-700">SIGNATURE AND AGREEMENT</p>
                <p>Participant / Guardian Signature: _______________________</p>
                <p>Printed Name: _______________ · Date: _______________</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
