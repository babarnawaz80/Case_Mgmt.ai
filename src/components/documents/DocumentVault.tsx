import { useMemo, useState } from "react";
import {
  Upload,
  Camera,
  FolderPlus,
  Search,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  Sparkles,
  X,
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File as FileIcon,
  Download,
  Printer,
  Trash2,
  Pencil,
  Share2,
  CheckCircle2,
  AlertTriangle,
  CloudUpload,
  ScanLine,
  type LucideIcon,
} from "lucide-react";
import {
  type Folder,
  type DocumentRecord,
  type FileExt,
  daysUntil,
  expiryTone,
  folderDot,
  folderTone,
} from "@/data/documents";
import { cn } from "@/lib/utils";

interface DocumentVaultProps {
  folders: Folder[];
  documents: DocumentRecord[];
  scope: "individual" | "org";
  scopeLabel: string; // e.g. "Joseph Brown · Document vault"
}

function fileIcon(ext: FileExt): LucideIcon {
  if (ext === "pdf") return FileText;
  if (ext === "jpg" || ext === "png") return ImageIcon;
  if (ext === "xlsx") return FileSpreadsheet;
  if (ext === "docx") return FileText;
  return FileIcon;
}

function formatSize(kb: number): string {
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function ExpiryChip({ expires }: { expires?: string }) {
  const tone = expiryTone(expires);
  if (!tone) return null;
  const days = daysUntil(expires);
  const label =
    tone === "expired"
      ? "EXPIRED"
      : tone === "danger"
        ? `Expires in ${days}d`
        : tone === "warn"
          ? `Expires in ${days}d`
          : `Expires ${expires}`;
  const cls =
    tone === "expired"
      ? "bg-icm-red text-white"
      : tone === "danger"
        ? "bg-icm-red-soft text-icm-red ring-1 ring-icm-red/20"
        : tone === "warn"
          ? "bg-icm-amber-soft text-icm-amber ring-1 ring-icm-amber/20"
          : "bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20";
  return (
    <span className={cn("px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold", cls)}>
      {label}
    </span>
  );
}

function AIStatusBadge({ status }: { status: DocumentRecord["aiStatus"] }) {
  const map = {
    indexed: { label: "Indexed", cls: "bg-icm-green-soft text-icm-green ring-icm-green/20" },
    processing: { label: "Processing", cls: "bg-icm-amber-soft text-icm-amber ring-icm-amber/20" },
    not_indexed: { label: "Not indexed", cls: "bg-icm-bg text-icm-text-faint ring-icm-border" },
    error: { label: "Error", cls: "bg-icm-red-soft text-icm-red ring-icm-red/20" },
  } as const;
  const m = map[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9.5px] font-geist font-semibold ring-1",
        m.cls
      )}
    >
      {status === "indexed" && <Sparkles className="w-2.5 h-2.5" />}
      {m.label}
    </span>
  );
}

export function DocumentVault({ folders, documents, scope, scopeLabel }: DocumentVaultProps) {
  const [activeFolder, setActiveFolder] = useState<string | "all">("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = documents;
    if (activeFolder !== "all") list = list.filter((d) => d.folderId === activeFolder);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.tags.some((t) => t.toLowerCase().includes(q)) ||
          d.aiSummary?.toLowerCase().includes(q) ||
          d.extracted?.some(
            (e) =>
              e.label.toLowerCase().includes(q) || e.value.toLowerCase().includes(q)
          )
      );
    }
    return list;
  }, [documents, activeFolder, search]);

  const previewDoc = previewId ? documents.find((d) => d.id === previewId) : null;
  const expiringCount = documents.filter((d) => {
    const t = expiryTone(d.expiresOn);
    return t === "danger" || t === "warn";
  }).length;

  return (
    <div className="space-y-4">
      {/* Page heading */}
      <div>
        <h1 className="font-manrope text-[26px] font-extrabold text-icm-text leading-tight tracking-[-0.02em]">
          Documents
        </h1>
        <p className="text-[13px] text-icm-text-dim mt-1 font-geist">{scopeLabel}</p>
      </div>

      {/* AI banner */}
      <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-icm-accent-soft ring-1 ring-icm-accent/20">
        <Sparkles className="w-4 h-4 text-icm-accent mt-0.5 shrink-0" />
        <p className="text-[12px] font-geist text-icm-text">
          I can read and extract information from any document you upload. Uploaded documents
          are searchable via the AI chat.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowUpload(true)}
            className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold hover:opacity-90 transition-opacity inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload
          </button>
          <button
            onClick={() => setShowScan(true)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5" />
            Scan
          </button>
          <button
            onClick={() => setShowNewFolder(true)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold hover:border-icm-border-strong transition-colors inline-flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            New folder
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-icm-border overflow-hidden">
            <button
              onClick={() => setView("grid")}
              className={cn(
                "h-9 w-9 inline-flex items-center justify-center transition-colors",
                view === "grid" ? "bg-icm-bg text-icm-text" : "bg-icm-panel text-icm-text-dim"
              )}
              title="Grid view"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("list")}
              className={cn(
                "h-9 w-9 inline-flex items-center justify-center transition-colors",
                view === "list" ? "bg-icm-bg text-icm-text" : "bg-icm-panel text-icm-text-dim"
              )}
              title="List view"
            >
              <ListIcon className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-icm-text-faint" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents and content..."
              className="h-9 w-[300px] pl-8 pr-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text placeholder:text-icm-text-faint focus:outline-none focus:border-icm-border-strong"
            />
          </div>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex gap-4">
        {/* Folder sidebar */}
        <aside className="w-[220px] shrink-0">
          <div className="rounded-xl border border-icm-border bg-icm-panel p-2 space-y-0.5">
            <FolderRow
              icon={FolderIcon}
              label="All Documents"
              count={documents.length}
              active={activeFolder === "all"}
              onClick={() => setActiveFolder("all")}
            />
            <div className="h-px bg-icm-border my-1" />
            {folders.map((f) => {
              const count = documents.filter((d) => d.folderId === f.id).length;
              return (
                <FolderRow
                  key={f.id}
                  icon={FolderIcon}
                  label={f.name}
                  count={count}
                  dotClass={folderDot(f.color)}
                  active={activeFolder === f.id}
                  onClick={() => setActiveFolder(f.id)}
                />
              );
            })}
          </div>
          {expiringCount > 0 && (
            <div className="mt-3 px-3 py-2 rounded-xl bg-icm-amber-soft ring-1 ring-icm-amber/20 text-[11.5px] font-geist text-icm-text">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-icm-amber" />
                {expiringCount} expiring soon
              </div>
            </div>
          )}
        </aside>

        {/* Documents area */}
        <div className="flex-1 min-w-0">
          {visible.length === 0 ? (
            <div className="rounded-xl border border-dashed border-icm-border bg-icm-panel p-10 text-center">
              <CloudUpload className="w-10 h-10 text-icm-text-faint mx-auto mb-3" />
              <p className="font-manrope font-bold text-[14px] text-icm-text">
                No documents in this folder
              </p>
              <p className="text-[12px] text-icm-text-dim font-geist mt-1">
                Upload or scan to add the first document.
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {visible.map((d) => {
                const folder = folders.find((f) => f.id === d.folderId);
                return (
                  <DocumentCard
                    key={d.id}
                    doc={d}
                    folder={folder}
                    onOpen={() => setPreviewId(d.id)}
                  />
                );
              })}
            </div>
          ) : (
            <DocumentTable
              documents={visible}
              folders={folders}
              onOpen={(id) => setPreviewId(id)}
            />
          )}
        </div>
      </div>

      {/* Modals */}
      {showUpload && (
        <UploadModal folders={folders} onClose={() => setShowUpload(false)} />
      )}
      {showScan && <ScanModal onClose={() => setShowScan(false)} />}
      {showNewFolder && <NewFolderModal onClose={() => setShowNewFolder(false)} />}
      {previewDoc && (
        <PreviewPanel
          doc={previewDoc}
          folder={folders.find((f) => f.id === previewDoc.folderId)}
          scope={scope}
          onClose={() => setPreviewId(null)}
        />
      )}
    </div>
  );
}

function FolderRow({
  icon: Icon,
  label,
  count,
  dotClass,
  active,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  count: number;
  dotClass?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-[12px] font-geist transition-colors",
        active
          ? "bg-icm-accent-soft text-icm-accent font-semibold"
          : "text-icm-text hover:bg-icm-bg"
      )}
    >
      {dotClass ? (
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" />
      )}
      <span className="flex-1 truncate">{label}</span>
      <span className="text-[10.5px] text-icm-text-faint font-mono">{count}</span>
    </button>
  );
}

function DocumentCard({
  doc,
  folder,
  onOpen,
}: {
  doc: DocumentRecord;
  folder?: Folder;
  onOpen: () => void;
}) {
  const Icon = fileIcon(doc.ext);
  return (
    <button
      onClick={onOpen}
      className="text-left rounded-xl border border-icm-border bg-icm-panel hover:border-icm-border-strong hover:shadow-elevated transition-all overflow-hidden group"
    >
      {/* Preview area */}
      <div className="relative h-[120px] bg-icm-bg flex items-center justify-center border-b border-icm-border">
        <Icon className="w-10 h-10 text-icm-text-faint" />
        {folder && (
          <span
            className={cn("absolute top-2 left-2 w-2.5 h-2.5 rounded-full", folderDot(folder.color))}
            title={folder.name}
          />
        )}
        {doc.aiStatus === "indexed" && (
          <span
            className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center"
            title="AI has read this document"
          >
            <Sparkles className="w-3 h-3" />
          </span>
        )}
      </div>
      {/* Meta */}
      <div className="p-3">
        <p
          className="font-tight font-semibold text-[12.5px] text-icm-text truncate leading-tight"
          title={doc.name}
        >
          {doc.name}
        </p>
        <p className="text-[10.5px] text-icm-text-dim font-geist mt-0.5 uppercase">
          {doc.ext} · {formatSize(doc.sizeKB)}
        </p>
        <div className="flex items-center justify-between mt-2 gap-1">
          <span className="text-[10.5px] text-icm-text-faint font-mono">{doc.uploadedOn}</span>
          <ExpiryChip expires={doc.expiresOn} />
        </div>
      </div>
    </button>
  );
}

function DocumentTable({
  documents,
  folders,
  onOpen,
}: {
  documents: DocumentRecord[];
  folders: Folder[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-icm-border bg-icm-panel overflow-hidden">
      <table className="w-full text-[12px] font-geist">
        <thead className="bg-icm-bg text-icm-text-dim text-[10.5px] uppercase tracking-wider">
          <tr>
            <th className="text-left px-3 py-2 font-semibold">Name</th>
            <th className="text-left px-3 py-2 font-semibold">Type</th>
            <th className="text-left px-3 py-2 font-semibold">Folder</th>
            <th className="text-left px-3 py-2 font-semibold">Uploaded</th>
            <th className="text-left px-3 py-2 font-semibold">Size</th>
            <th className="text-left px-3 py-2 font-semibold">AI</th>
            <th className="text-left px-3 py-2 font-semibold">Expiry</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((d) => {
            const folder = folders.find((f) => f.id === d.folderId);
            const Icon = fileIcon(d.ext);
            return (
              <tr
                key={d.id}
                onClick={() => onOpen(d.id)}
                className="border-t border-icm-border hover:bg-icm-bg cursor-pointer"
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-icm-text-faint" />
                    <span className="text-icm-text font-medium">{d.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-icm-text-dim">{d.type}</td>
                <td className="px-3 py-2.5">
                  {folder && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1",
                        folderTone(folder.color)
                      )}
                    >
                      <span className={cn("w-1.5 h-1.5 rounded-full", folderDot(folder.color))} />
                      {folder.name}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-icm-text-dim font-mono text-[11px]">
                  {d.uploadedOn}
                </td>
                <td className="px-3 py-2.5 text-icm-text-dim">{formatSize(d.sizeKB)}</td>
                <td className="px-3 py-2.5">
                  <AIStatusBadge status={d.aiStatus} />
                </td>
                <td className="px-3 py-2.5">
                  <ExpiryChip expires={d.expiresOn} />
                </td>
                <td className="px-3 py-2.5 text-right">
                  <MoreHorizontal className="w-4 h-4 text-icm-text-faint inline" />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---- Modals -----------------------------------------------------------------

function UploadModal({ folders, onClose }: { folders: Folder[]; onClose: () => void }) {
  return (
    <ModalShell title="Upload Documents" onClose={onClose} width={560}>
      <div className="rounded-xl border-2 border-dashed border-icm-border bg-icm-bg p-10 text-center">
        <CloudUpload className="w-12 h-12 text-icm-text-faint mx-auto mb-2" />
        <p className="font-manrope font-bold text-[14px] text-icm-text">
          Drag files here or click to browse
        </p>
        <p className="text-[11.5px] text-icm-text-dim font-geist mt-1">
          PDF, PNG, JPG, JPEG, TIFF, DOC, DOCX, XLS, XLSX, TXT — max 50MB per file
        </p>
        <button className="mt-4 h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold inline-flex items-center gap-1.5">
          <Upload className="w-3.5 h-3.5" />
          Browse files
        </button>
      </div>
      <div className="mt-3 px-3 py-2 rounded-xl bg-icm-accent-soft ring-1 ring-icm-accent/20 text-[11.5px] font-geist text-icm-text flex items-start gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-icm-accent mt-0.5 shrink-0" />
        AI will detect document type, suggest a folder, and extract key fields automatically.
      </div>
      <div className="mt-3">
        <label className="text-[11px] font-semibold uppercase tracking-wider text-icm-text-dim font-geist">
          Default folder
        </label>
        <select className="mt-1 w-full h-9 px-2 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text">
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Upload
        </button>
      </div>
    </ModalShell>
  );
}

function ScanModal({ onClose }: { onClose: () => void }) {
  return (
    <ModalShell title="Scan Document" onClose={onClose} width={560}>
      <div className="grid grid-cols-2 gap-3">
        <button className="rounded-xl border border-icm-border bg-icm-panel p-4 text-left hover:border-icm-border-strong transition-colors">
          <div className="w-10 h-10 rounded-lg bg-icm-accent-soft text-icm-accent ring-1 ring-icm-accent/20 flex items-center justify-center">
            <Camera className="w-5 h-5" />
          </div>
          <p className="mt-3 font-manrope font-bold text-[13.5px] text-icm-text">Use camera</p>
          <p className="text-[11.5px] text-icm-text-dim font-geist mt-1 leading-relaxed">
            Point your camera at the document. AI will capture, enhance, and process it
            automatically.
          </p>
        </button>
        <button className="rounded-xl border border-icm-border bg-icm-panel p-4 text-left hover:border-icm-border-strong transition-colors">
          <div className="w-10 h-10 rounded-lg bg-icm-green-soft text-icm-green ring-1 ring-icm-green/20 flex items-center justify-center">
            <ScanLine className="w-5 h-5" />
          </div>
          <p className="mt-3 font-manrope font-bold text-[13.5px] text-icm-text">Upload scan</p>
          <p className="text-[11.5px] text-icm-text-dim font-geist mt-1 leading-relaxed">
            Upload a scanned PDF, photo of a document, or any image file.
          </p>
        </button>
      </div>
      <div className="mt-4 rounded-xl border border-icm-border bg-icm-bg p-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-icm-text-dim font-geist">
          AI processing pipeline
        </p>
        <ul className="mt-2 space-y-1 text-[11.5px] font-geist text-icm-text">
          {[
            "Enhance image quality",
            "Run OCR (text extraction)",
            "Identify document type",
            "Extract key information",
            "Index for AI search",
          ].map((s) => (
            <li key={s} className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-icm-green" />
              {s}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-end mt-4">
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
        >
          Close
        </button>
      </div>
    </ModalShell>
  );
}

function NewFolderModal({ onClose }: { onClose: () => void }) {
  const colors: { id: string; cls: string }[] = [
    { id: "blue", cls: "bg-icm-accent" },
    { id: "green", cls: "bg-icm-green" },
    { id: "red", cls: "bg-icm-red" },
    { id: "amber", cls: "bg-icm-amber" },
    { id: "purple", cls: "bg-purple-500" },
    { id: "pink", cls: "bg-pink-500" },
    { id: "teal", cls: "bg-teal-500" },
    { id: "gray", cls: "bg-icm-text-faint" },
  ];
  return (
    <ModalShell title="New Folder" onClose={onClose} width={420}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-icm-text-dim font-geist">
        Folder name
      </label>
      <input
        autoFocus
        placeholder="e.g. School records"
        className="mt-1 w-full h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-[12px] font-geist text-icm-text focus:outline-none focus:border-icm-border-strong"
      />
      <label className="mt-3 block text-[11px] font-semibold uppercase tracking-wider text-icm-text-dim font-geist">
        Color
      </label>
      <div className="mt-2 flex gap-2">
        {colors.map((c) => (
          <button
            key={c.id}
            className={cn(
              "w-7 h-7 rounded-full ring-2 ring-transparent hover:ring-icm-border-strong transition-all",
              c.cls
            )}
            title={c.id}
          />
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl border border-icm-border bg-icm-panel text-icm-text text-[12px] font-geist font-semibold"
        >
          Cancel
        </button>
        <button
          onClick={onClose}
          className="h-9 px-3 rounded-xl bg-icm-text text-icm-panel text-[12px] font-geist font-semibold"
        >
          Create
        </button>
      </div>
    </ModalShell>
  );
}

function PreviewPanel({
  doc,
  folder,
  scope,
  onClose,
}: {
  doc: DocumentRecord;
  folder?: Folder;
  scope: "individual" | "org";
  onClose: () => void;
}) {
  const Icon = fileIcon(doc.ext);
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/30" onClick={onClose} />
      <aside className="w-[640px] max-w-[100vw] bg-icm-panel border-l border-icm-border flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-icm-border">
          <div className="min-w-0">
            <p className="font-manrope font-bold text-[14px] text-icm-text truncate">
              {doc.name}
            </p>
            {folder && (
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ring-1",
                  folderTone(folder.color)
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", folderDot(folder.color))} />
                {folder.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {/* Action bar */}
        <div className="flex items-center gap-1 px-3 py-2 border-b border-icm-border">
          {[
            { icon: Download, label: "Download" },
            { icon: Printer, label: "Print" },
            { icon: FolderIcon, label: "Move" },
            { icon: Share2, label: "Share" },
            { icon: Pencil, label: "Rename" },
            { icon: Trash2, label: "Delete" },
          ].map(({ icon: I, label }) => (
            <button
              key={label}
              title={label}
              className="h-8 w-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
            >
              <I className="w-4 h-4" />
            </button>
          ))}
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Viewer placeholder */}
          <div className="bg-icm-bg border-b border-icm-border h-[280px] flex flex-col items-center justify-center">
            <Icon className="w-14 h-14 text-icm-text-faint" />
            <p className="text-[11.5px] text-icm-text-dim font-geist mt-2 uppercase">
              {doc.ext} preview
            </p>
          </div>

          <div className="p-4 space-y-4">
            {/* Details */}
            <Section title="Document details">
              <DetailRow label="Type" value={doc.type} />
              <DetailRow label="Uploaded" value={`${doc.uploadedOn} · ${doc.uploadedBy}`} />
              <DetailRow label="Size" value={formatSize(doc.sizeKB)} />
              {doc.expiresOn && (
                <DetailRow
                  label="Expires"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {doc.expiresOn}
                      <ExpiryChip expires={doc.expiresOn} />
                    </span>
                  }
                />
              )}
              {doc.notes && <DetailRow label="Notes" value={doc.notes} />}
            </Section>

            {/* AI summary */}
            {doc.aiSummary && (
              <Section
                title="AI summary"
                badge={<AIStatusBadge status={doc.aiStatus} />}
              >
                <p className="text-[12.5px] font-geist text-icm-text leading-relaxed">
                  {doc.aiSummary}
                </p>
                <button className="mt-2 text-[11.5px] font-geist font-semibold text-icm-accent inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Ask me about this document →
                </button>
              </Section>
            )}

            {/* Extracted fields */}
            {doc.extracted && doc.extracted.length > 0 && (
              <Section title="AI extraction">
                <div className="rounded-xl border border-icm-border overflow-hidden">
                  {doc.extracted.map((f, i) => (
                    <div
                      key={i}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-2 text-[12px] font-geist",
                        i > 0 && "border-t border-icm-border"
                      )}
                    >
                      <span className="text-icm-text-dim">{f.label}</span>
                      <span className="text-icm-text font-medium text-right truncate">
                        {f.value}{" "}
                        <span className="text-icm-text-faint font-mono text-[10.5px]">
                          ({Math.round(f.confidence * 100)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
                {scope === "individual" && (
                  <button className="mt-2 h-8 px-2.5 rounded-lg bg-icm-accent text-white text-[11.5px] font-geist font-semibold">
                    Apply to profile
                  </button>
                )}
              </Section>
            )}

            {/* Tags */}
            {doc.tags.length > 0 && (
              <Section title="Tags">
                <div className="flex flex-wrap gap-1.5">
                  {doc.tags.map((t) => (
                    <span
                      key={t}
                      className="px-1.5 py-0.5 rounded-full text-[10px] font-geist font-semibold bg-icm-bg text-icm-text-dim ring-1 ring-icm-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

function Section({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10.5px] font-geist font-semibold uppercase tracking-wider text-icm-text-dim">
          {title}
        </p>
        {badge}
      </div>
      {children}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-[12px] font-geist">
      <span className="text-icm-text-dim">{label}</span>
      <span className="text-icm-text font-medium text-right">{value}</span>
    </div>
  );
}

function ModalShell({
  title,
  onClose,
  width = 480,
  children,
}: {
  title: string;
  onClose: () => void;
  width?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="rounded-2xl bg-icm-panel border border-icm-border shadow-elevated w-full"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-icm-border">
          <h2 className="font-manrope font-bold text-[15px] text-icm-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-icm-bg text-icm-text-dim flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
