import { useNavigate, useParams } from "react-router-dom";
import { ICMShell } from "@/components/icm/ICMShell";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { getPerson } from "@/data/people";
import { getDocumentsForIndividual } from "@/data/documents";
import { ChevronLeft } from "lucide-react";

const PersonDocuments = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const person = getPerson(id);

  if (!person) {
    return (
      <ICMShell title="Documents" showAIPanel={false}>
        <p className="text-[13px] font-geist text-icm-text-dim">Individual not found.</p>
      </ICMShell>
    );
  }

  const { folders, documents } = getDocumentsForIndividual(person.id);

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
            onClick={() => navigate(`/people/${person.id}/echart`)}
            className="hover:text-icm-text transition-colors inline-flex items-center gap-1"
          >
            <ChevronLeft className="w-3 h-3" />
            {person.firstName} {person.lastName}
          </button>
          <span>›</span>
          <span className="text-icm-text font-medium">Documents</span>
        </div>

        <DocumentVault
          folders={folders}
          documents={documents}
          scope="individual"
          scopeLabel={`${person.firstName} ${person.lastName} · Document vault`}
        />
      </div>
    </ICMShell>
  );
};

export default PersonDocuments;
