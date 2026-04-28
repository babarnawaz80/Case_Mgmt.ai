import { ICMShell } from "@/components/icm/ICMShell";
import { Breadcrumbs } from "@/components/icm/Breadcrumbs";
import { DocumentVault } from "@/components/documents/DocumentVault";
import { getOrgLibrary } from "@/data/documents";

const Documents = () => {
  const { folders, documents } = getOrgLibrary();
  return (
    <ICMShell title="Documents" showAIPanel={false}>
      <div className="max-w-[1200px] space-y-4">
        <Breadcrumbs
          backTo="/dashboard"
          backLabel="Dashboard"
          items={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Documents" },
          ]}
        />
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
