import { useState, useRef, useMemo, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { useIndividual } from "@/hooks/useIndividuals";
import { toast } from "sonner";
import {
  ChevronLeft, ChevronRight, Folder, FolderPlus, Upload, FileText, FileImage, FileSpreadsheet,
  File as FileIcon, Search, MoreVertical, Download, Trash2, Pencil, Star, ArrowLeft, Home,
  Eye, Calendar, User, X, FolderOpen, Archive, Loader2
} from "lucide-react";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { writeAudit } from "@/lib/auditService";
import { useAuth } from "@/contexts/AuthContext";
import { AuthorCell } from "@/components/icm/AuthorCell";

// ─── Types ──────────────────────────────────────────────────────────────────
type Node = {
  id: string;
  name: string;
  type: "folder" | "file";
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  starred?: boolean;
  // file-only
  size?: number;
  mime?: string;
  dataUrl?: string; // for preview (images & pdfs)
};

// ─── Default folder structure ───────────────────────────────────────────────
const DEFAULT_FOLDERS: { name: string; children?: string[] }[] = [
  { name: "Intake & Eligibility", children: ["Application Forms", "Eligibility Determinations", "Medicaid Cards"] },
  { name: "Person-Centered Plans", children: ["Current Plan", "Previous Plans", "Addendums"] },
  { name: "Assessments", children: ["SIS Assessments", "Functional Assessments", "Risk Assessments"] },
  { name: "Medical & Health", children: ["Diagnoses & Conditions", "Medication Lists", "Doctor Visits", "Lab Results", "Immunizations"] },
  { name: "Behavioral", children: ["Behavior Support Plans", "Incident Reports", "Functional Behavior Assessments"] },
  { name: "Legal & Guardianship", children: ["Guardianship Documents", "Power of Attorney", "Advance Directives"] },
  { name: "Education & Employment" },
  { name: "Financial & Benefits" },
  { name: "Signed Consents" },
  { name: "Photos & ID" },
];

const SEEDED_FILES: { folderName: string; fileName: string; size: number; mime: string }[] = [
  { folderName: "Current Plan", fileName: "PCP_2026_Annual.pdf", size: 482000, mime: "application/pdf" },
  { folderName: "Current Plan", fileName: "PCP_Signature_Page.pdf", size: 92000, mime: "application/pdf" },
  { folderName: "Medicaid Cards", fileName: "Medicaid_Card_Front.jpg", size: 215000, mime: "image/jpeg" },
  { folderName: "Medicaid Cards", fileName: "Medicaid_Card_Back.jpg", size: 198000, mime: "image/jpeg" },
  { folderName: "Diagnoses & Conditions", fileName: "Diagnosis_Summary.pdf", size: 124000, mime: "application/pdf" },
  { folderName: "Medication Lists", fileName: "Current_Medications_May2026.pdf", size: 88000, mime: "application/pdf" },
  { folderName: "SIS Assessments", fileName: "SIS_Assessment_2025.pdf", size: 612000, mime: "application/pdf" },
  { folderName: "Guardianship Documents", fileName: "Guardianship_Order_2018.pdf", size: 320000, mime: "application/pdf" },
  { folderName: "Photos & ID", fileName: "Profile_Photo.jpg", size: 540000, mime: "image/jpeg" },
];

const uid = () => Math.random().toString(36).slice(2, 11);

function seedTree(personId: string): Node[] {
  const nodes: Node[] = [];
  const now = new Date().toISOString();
  const map = new Map<string, string>(); // folder name -> id
  DEFAULT_FOLDERS.forEach((f) => {
    const id = uid();
    map.set(f.name, id);
    nodes.push({ id, name: f.name, type: "folder", parentId: null, createdAt: now, updatedAt: now, createdBy: "System" });
    f.children?.forEach((c) => {
      const cid = uid();
      map.set(c, cid);
      nodes.push({ id: cid, name: c, type: "folder", parentId: id, createdAt: now, updatedAt: now, createdBy: "System" });
    });
  });
  SEEDED_FILES.forEach((f) => {
    const parentId = map.get(f.folderName);
    if (!parentId) return;
    nodes.push({
      id: uid(), name: f.fileName, type: "file", parentId,
      createdAt: now, updatedAt: now, createdBy: "Jordan Reyes",
      size: f.size, mime: f.mime,
    });
  });
  return nodes;
}

function fmtSize(b?: number) {
  if (!b) return "—";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fileIcon(mime?: string) {
  if (!mime) return FileIcon;
  if (mime.startsWith("image/")) return FileImage;
  if (mime.includes("pdf")) return FileText;
  if (mime.includes("sheet") || mime.includes("excel") || mime.includes("csv")) return FileSpreadsheet;
  return FileText;
}

function fileColor(mime?: string) {
  if (!mime) return "text-slate-500 bg-slate-100";
  if (mime.startsWith("image/")) return "text-emerald-600 bg-emerald-50";
  if (mime.includes("pdf")) return "text-red-600 bg-red-50";
  if (mime.includes("sheet") || mime.includes("excel")) return "text-green-600 bg-green-50";
  if (mime.includes("word") || mime.includes("doc")) return "text-blue-600 bg-blue-50";
  return "text-slate-500 bg-slate-100";
}

// ─── Component ──────────────────────────────────────────────────────────────
export default function PersonManagedDocuments() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { individual, loading: individualLoading } = useIndividual(id);
  const { currentUser, userProfile } = useAuth();
  const orgId = userProfile?.organizationId || currentUser?.organizationId || "demo";

  const [dbDocs, setDbDocs] = useState<any[]>([]);
  const [docsLoading, setDocsLoading] = useState(true);

  useEffect(() => {
    if (!id || !orgId) return;
    setDocsLoading(true);
    const q = query(
      collection(db, "managed_documents"),
      where("individualId", "==", id),
      where("organizationId", "==", orgId)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setDbDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setDocsLoading(false);
      },
      (err) => {
        console.error("Error loading managed documents:", err);
        setDocsLoading(false);
      }
    );
    return unsub;
  }, [id, orgId]);

  const personLabel = individual ? `${individual.last_name}, ${individual.first_name}` : "Person";

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [previewFile, setPreviewFile] = useState<Node | null>(null);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nodes = useMemo(() => {
    return (dbDocs || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      type: d.type || "file",
      parentId: d.parent_id || null,
      createdAt: d.created_at_iso || new Date().toISOString(),
      updatedAt: d.updated_at_iso || new Date().toISOString(),
      createdBy: d.created_by || "System",
      starred: d.starred || false,
      size: d.size || 0,
      mime: d.mime || "",
      dataUrl: d.data_url || "",
    }));
  }, [dbDocs]);

  useEffect(() => {
    if (!docsLoading && (dbDocs || []).length === 0 && id) {
      const seeded = seedTree(id);
      seeded.forEach(async (n) => {
        try {
          await addDoc(collection(db, "managed_documents"), {
            individual_id: id,
            individualId: id,
            organizationId: orgId,
            organization_id: orgId,
            name: n.name,
            type: n.type,
            parent_id: n.parentId || "",
            created_at_iso: n.createdAt,
            updated_at_iso: n.updatedAt,
            created_by: n.createdBy,
            starred: n.starred || false,
            size: n.size || 0,
            mime: n.mime || "",
            data_url: n.dataUrl || "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });
        } catch (err) {
          console.error("Error seeding document:", err);
        }
      });
    }
  }, [dbDocs, docsLoading, id]);

  useEffect(() => {
    const onDoc = () => setMenuOpen(null);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // Breadcrumb path
  const breadcrumbs = useMemo(() => {
    const trail: Node[] = [];
    let cur = currentFolderId;
    while (cur) {
      const n = nodes.find((x) => x.id === cur);
      if (!n) break;
      trail.unshift(n);
      cur = n.parentId;
    }
    return trail;
  }, [currentFolderId, nodes]);

  // Items in current folder (or search results)
  const items = useMemo(() => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return nodes.filter((n) => n.name.toLowerCase().includes(q));
    }
    return nodes
      .filter((n) => n.parentId === currentFolderId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }, [nodes, currentFolderId, search]);

  const stats = useMemo(() => {
    const files = nodes.filter((n) => n.type === "file");
    const folders = nodes.filter((n) => n.type === "folder");
    const totalSize = files.reduce((sum, f) => sum + (f.size || 0), 0);
    return { fileCount: files.length, folderCount: folders.length, totalSize };
  }, [nodes]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, "managed_documents"), {
        individual_id: id,
        individualId: id,
        organizationId: orgId,
        organization_id: orgId,
        name,
        type: "folder",
        parent_id: currentFolderId || "",
        created_at_iso: now,
        updated_at_iso: now,
        created_by: userProfile?.displayName || userProfile?.email || "Kathy Martinez",
        starred: false,
        size: 0,
        mime: "",
        data_url: "",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });
      await writeAudit("edit_note", "individual", id ?? "", {
        action: "document_folder_created",
        folderName: name,
      });
      setNewFolderName("");
      setShowNewFolder(false);
      toast.success("Folder created", { description: name });
    } catch (err) {
      console.error(err);
      toast.error("Failed to create folder");
    }
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !files.length) return;
    const now = new Date().toISOString();
    let processed = 0;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = (file.size < 2_000_000 && (file.type.startsWith("image/") || file.type.includes("pdf")))
          ? (e.target?.result as string) : undefined;
        try {
          await addDoc(collection(db, "managed_documents"), {
            individual_id: id,
            individualId: id,
            organizationId: orgId,
            organization_id: orgId,
            name: file.name,
            type: "file",
            parent_id: currentFolderId || "",
            created_at_iso: now,
            updated_at_iso: now,
            created_by: userProfile?.displayName || userProfile?.email || "Kathy Martinez",
            starred: false,
            size: file.size,
            mime: file.type || "application/octet-stream",
            data_url: dataUrl || "",
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          });

          await writeAudit("edit_note", "individual", id ?? "", {
            action: "document_uploaded",
            documentName: file.name,
            documentSizeKb: Math.round(file.size / 1024),
          });
        } catch (err) {
          console.error("Error saving uploaded file:", err);
        }

        processed++;
        if (processed === files.length) {
          toast.success(`${files.length} file${files.length > 1 ? "s" : ""} uploaded`, {
            description: `Saved to ${breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].name : "All Documents"}`,
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteNode = async (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    if (!confirm(`Delete "${node.name}"${node.type === "folder" ? " and all its contents" : ""}?`)) return;

    try {
      const toDelete = new Set<string>([nodeId]);
      if (node.type === "folder") {
        let changed = true;
        while (changed) {
          changed = false;
          nodes.forEach((n) => {
            if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
              toDelete.add(n.id);
              changed = true;
            }
          });
        }
      }

      for (const deleteId of Array.from(toDelete)) {
        await deleteDoc(doc(db, "managed_documents", deleteId));
      }

      await writeAudit("edit_note", "individual", id ?? "", {
        action: "document_deleted",
        documentName: node.name,
        documentType: node.type,
      });

      toast.success(`Deleted "${node.name}"`, { description: "Audit log updated." });
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete item");
    }
  };

  const startRename = (n: Node) => { setRenaming(n.id); setRenameValue(n.name); setMenuOpen(null); };
  const commitRename = async () => {
    if (!renaming) return;
    const v = renameValue.trim();
    if (v) {
      try {
        await updateDoc(doc(db, "managed_documents", renaming), {
          name: v,
          updated_at_iso: new Date().toISOString(),
          updated_at: serverTimestamp(),
        });
        toast.success("Renamed", { description: v });
      } catch (err) {
        console.error(err);
        toast.error("Failed to rename");
      }
    }
    setRenaming(null);
  };

  const toggleStar = async (nodeId: string) => {
    const n = nodes.find((x) => x.id === nodeId);
    if (!n) return;
    try {
      await updateDoc(doc(db, "managed_documents", nodeId), {
        starred: !n.starred,
        updated_at: serverTimestamp(),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const downloadFile = (n: Node) => {
    if (n.dataUrl) {
      const a = document.createElement("a");
      a.href = n.dataUrl;
      a.download = n.name;
      a.click();
    } else {
      toast.success(`Download started`, { description: n.name });
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  if (individualLoading || docsLoading) {
    return (
      <ICMShell title="Managed Documents" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading Documents…</span>
        </div>
      </ICMShell>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <ICMShell title="Managed Documents" showAIPanel={false}>
      <div className="space-y-4">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[11.5px] font-geist text-icm-text-dim">
          <button onClick={() => navigate("/people")} className="hover:text-icm-text">People</button>
          <span className="text-icm-text-faint">›</span>
          <button onClick={() => navigate(`/people/${id}/echart`)} className="hover:text-icm-text">{personLabel}</button>
          <span className="text-icm-text-faint">›</span>
          <span className="text-icm-text font-medium">Managed Documents</span>
        </nav>

        {/* Header card */}
        <div className="bg-gradient-to-br from-white to-blue-50/40 border border-icm-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                <Archive className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-manrope text-xl font-black tracking-tight text-slate-900">Managed Documents</h1>
                <p className="text-[12px] text-slate-500">Central document repository for {personLabel}'s chart.</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[11.5px] text-slate-600">
              <Stat label="Folders" value={stats.folderCount} />
              <Stat label="Files" value={stats.fileCount} />
              <Stat label="Total size" value={fmtSize(stats.totalSize)} />
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate(currentFolderId ? "" : "")}
            disabled={!currentFolderId}
            onClickCapture={(e) => { e.preventDefault(); if (currentFolderId) {
              const parent = nodes.find((n) => n.id === currentFolderId)?.parentId ?? null;
              setCurrentFolderId(parent);
            }}}
            className="h-9 w-9 rounded-xl border border-icm-border bg-white flex items-center justify-center hover:bg-slate-50 disabled:opacity-40"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </button>
          <button
            onClick={() => setCurrentFolderId(null)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <Home className="w-3.5 h-3.5" /> All Documents
          </button>

          {/* Folder path crumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1 text-[12px] text-slate-500 flex-wrap">
              {breadcrumbs.map((b, i) => (
                <div key={b.id} className="flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                  <button onClick={() => setCurrentFolderId(b.id)} className={`px-1.5 py-0.5 rounded hover:bg-slate-100 ${i === breadcrumbs.length - 1 ? "text-slate-900 font-semibold" : ""}`}>
                    {b.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex-1" />

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search all documents…"
              className="h-9 w-64 pl-9 pr-3 rounded-xl border border-icm-border bg-white text-[12.5px] focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={() => setShowNewFolder(true)}
            className="h-9 px-3 rounded-xl border border-icm-border bg-white text-[12px] font-medium text-slate-700 hover:bg-slate-50 inline-flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5" /> New folder
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[12px] font-semibold shadow-sm hover:shadow-md inline-flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" /> Upload files
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* New folder inline */}
        {showNewFolder && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-50/60 border border-blue-100">
            <FolderPlus className="w-4 h-4 text-blue-600" />
            <input
              autoFocus
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") createFolder(); if (e.key === "Escape") setShowNewFolder(false); }}
              placeholder="Folder name…"
              className="flex-1 h-8 px-2 rounded-lg border border-blue-200 bg-white text-[13px] focus:outline-none focus:border-blue-400"
            />
            <button onClick={createFolder} className="h-8 px-3 rounded-lg bg-blue-600 text-white text-[12px] font-semibold hover:bg-blue-700">Create</button>
            <button onClick={() => setShowNewFolder(false)} className="h-8 px-2 rounded-lg text-slate-500 hover:bg-slate-100 text-[12px]">Cancel</button>
          </div>
        )}

        {/* Drop zone wrapper */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`rounded-2xl border ${dragOver ? "border-blue-400 bg-blue-50/40" : "border-icm-border bg-white"} transition`}
        >
          {/* List */}
          {items.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center mb-3">
                <FolderOpen className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-[13px] font-semibold text-slate-700">{search ? "No matches" : "This folder is empty"}</p>
              <p className="text-[12px] text-slate-500 mt-1">{search ? "Try a different search term." : "Drag files here or click Upload."}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="text-left px-5 py-3">Name</th>
                  <th className="text-left px-3 py-3 hidden md:table-cell">Owner</th>
                  <th className="text-left px-3 py-3 hidden md:table-cell">Modified</th>
                  <th className="text-left px-3 py-3 hidden sm:table-cell">Size</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((n) => {
                  const Icon = n.type === "folder" ? Folder : fileIcon(n.mime);
                  const iconColor = n.type === "folder" ? "text-blue-600 bg-blue-50" : fileColor(n.mime);
                  const isRenaming = renaming === n.id;
                  return (
                    <tr
                      key={n.id}
                      className="group border-b border-slate-50 hover:bg-blue-50/40 transition cursor-pointer"
                      onDoubleClick={() => {
                        if (n.type === "folder") { setCurrentFolderId(n.id); setSearch(""); }
                        else setPreviewFile(n);
                      }}
                    >
                      <td className="px-5 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconColor}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          {isRenaming ? (
                            <input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={commitRename}
                              onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setRenaming(null); }}
                              className="h-7 px-2 rounded-md border border-blue-300 bg-white text-[13px] focus:outline-none focus:border-blue-500 flex-1"
                            />
                          ) : (
                            <button
                              onClick={() => {
                                if (n.type === "folder") { setCurrentFolderId(n.id); setSearch(""); }
                                else setPreviewFile(n);
                              }}
                              className="text-left text-[13px] font-medium text-slate-800 hover:text-blue-600 truncate"
                            >
                              {n.name}
                            </button>
                          )}
                          {n.starred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <AuthorCell name={n.createdBy} size="sm" showName={true} />
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-[12px] text-slate-600">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {fmtDate(n.updatedAt)}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 hidden sm:table-cell text-[12px] text-slate-600 font-mono">
                        {n.type === "folder" ? "—" : fmtSize(n.size)}
                      </td>
                      <td className="px-3 py-2.5 text-right relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === n.id ? null : n.id); }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-slate-100 rounded-md p-1 transition"
                        >
                          <MoreVertical className="w-3.5 h-3.5 text-slate-500" />
                        </button>
                        {menuOpen === n.id && (
                          <div className="absolute right-3 top-9 z-30 w-44 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-900/10 py-1 text-left">
                            {n.type === "file" && (
                              <>
                                <MenuItem icon={Eye} label="Preview" onClick={() => { setPreviewFile(n); setMenuOpen(null); }} />
                                <MenuItem icon={Download} label="Download" onClick={() => { downloadFile(n); setMenuOpen(null); }} />
                              </>
                            )}
                            <MenuItem icon={Pencil} label="Rename" onClick={() => startRename(n)} />
                            <MenuItem icon={Star} label={n.starred ? "Unstar" : "Star"} onClick={() => { toggleStar(n.id); setMenuOpen(null); }} />
                            <div className="my-1 border-t border-slate-100" />
                            <MenuItem icon={Trash2} label="Delete" danger onClick={() => { deleteNode(n.id); setMenuOpen(null); }} />
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {dragOver && (
            <div className="px-5 py-4 border-t border-blue-200 bg-blue-50/60 text-center text-[12.5px] text-blue-700 font-semibold">
              Drop files here to upload to {breadcrumbs.length ? breadcrumbs[breadcrumbs.length - 1].name : "All Documents"}
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      {previewFile && (
        <div onClick={() => setPreviewFile(null)} className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${fileColor(previewFile.mime)}`}>
                  {(() => { const I = fileIcon(previewFile.mime); return <I className="w-4 h-4" />; })()}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-slate-800">{previewFile.name}</p>
                  <p className="text-[11px] text-slate-500">{fmtSize(previewFile.size)} · {fmtDate(previewFile.updatedAt)} · {previewFile.createdBy}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => downloadFile(previewFile)} className="h-8 px-2.5 rounded-lg hover:bg-slate-100 text-[12px] inline-flex items-center gap-1.5 text-slate-700">
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
                <button onClick={() => setPreviewFile(null)} className="h-8 w-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X className="w-4 h-4 text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 flex items-center justify-center p-6">
              {previewFile.dataUrl && previewFile.mime?.startsWith("image/") ? (
                <img src={previewFile.dataUrl} alt={previewFile.name} className="max-w-full max-h-[60vh] rounded-lg shadow" />
              ) : previewFile.dataUrl && previewFile.mime?.includes("pdf") ? (
                <iframe src={previewFile.dataUrl} className="w-full h-[60vh] rounded-lg bg-white shadow" title={previewFile.name} />
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-slate-300" />
                  <p className="mt-3 text-[13px] font-medium text-slate-600">Preview not available</p>
                  <p className="text-[11.5px] text-slate-500 mt-1">Download to view this file.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </ICMShell>
  );
}

const Stat = ({ label, value }: { label: string; value: number | string }) => (
  <div className="text-right">
    <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">{label}</p>
    <p className="text-[14px] font-black text-slate-800 tabular-nums">{value}</p>
  </div>
);

const MenuItem = ({ icon: Icon, label, onClick, danger }: { icon: any; label: string; onClick: () => void; danger?: boolean }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-2 px-3 py-1.5 text-[12.5px] hover:bg-slate-50 ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-700"}`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
  </button>
);
