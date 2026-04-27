import { ICMShell } from "@/components/icm/ICMShell";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { getOrgLibrary } from "@/data/documents";

const Documents = () => {
  const { folders, documents } = getOrgLibrary();
  return (
    <ICMShell title="Documents" showAIPanel={false}>
      <div className="max-w-[1200px]">
        <DocumentVault
          folders={folders}
          documents={documents}
          scope="org"
          scopeLabel="Organization document library"
        />
      </div>
    </ICMShell>
  );
};

export default Documents;
