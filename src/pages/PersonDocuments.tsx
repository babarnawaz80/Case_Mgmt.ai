import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { useIndividual } from "@/hooks/useIndividuals";
import { getDocumentsForIndividual } from "@/data/documents";
import { ChevronLeft, Loader2 } from "lucide-react";

const PersonDocuments = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { individual, loading } = useIndividual(id);

  if (loading) {
    return (
      <ICMShell title="Documents" showAIPanel={false}>
        <div className="flex items-center justify-center py-24 gap-3 text-icm-text-dim">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-[13px] font-geist">Loading…</span>
        </div>
      </ICMShell>
    );
  }

  if (!individual) {
    return (
      <ICMShell title="Documents" showAIPanel={false}>
        <p className="text-[13px] font-geist text-icm-text-dim">Individual not found.</p>
      </ICMShell>
    );
  }

  const { folders, documents } = getDocumentsForIndividual(individual.id);

  return (
    <ICMShell title="Documents" showAIPanel={false}>
      <div className="space-y-3 max-w-[1200px]">
        <div className="text-[11.5px] font-geist text-icm-text-dim flex items-center gap-1">
          <button
            onClick={() => navigate("/people")}
            className="hover:text-icm-text transition-colors"
          >
            People
          </button>
          <span>›</span>
          <button
            onClick={() => navigate(`/people/${individual.id}/echart`)}
            className="hover:text-icm-text transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            {individual.first_name} {individual.last_name}
          </button>
          <span>›</span>
          <span className="text-icm-text font-medium">Documents</span>
        </div>

        <DocumentVault
          folders={folders}
          documents={documents}
          scope="individual"
          scopeLabel={`${individual.first_name} ${individual.last_name} · Document vault`}
          activePersonId={individual.id}
        />
      </div>
    </ICMShell>
  );
};

export default PersonDocuments;
