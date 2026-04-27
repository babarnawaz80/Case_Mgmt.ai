import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Search,
  X,
  User,
  MapPin,
  FileText,
  ClipboardList,
  Eye,
  ChevronDown,
  Plus,
  Download,
  Clock,
  Sparkles,
  LayoutDashboard,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  gender: string;
  dob: string;
  age: number;
  admittedOn: string;
  county: string;
  status: "Active" | "Pending" | "Discharged";
  updatedOn: string;
  updatedBy: string;
  serviceContact?: string;
}

const people: Person[] = [
  { id: "1", firstName: "Joseph", lastName: "Brown", nickname: "Joe", gender: "M", dob: "01/01/1990", age: 36, admittedOn: "09/01/2022", county: "Carroll County", status: "Active", updatedOn: "08/01/2023", updatedBy: "Babar Nawaz CM", serviceContact: "Jennie Thollander" },
  { id: "2", firstName: "Dwight", lastName: "Doe", gender: "M", dob: "05/05/2024", age: 1, admittedOn: "09/15/1993", county: "Franklin County", status: "Active", updatedOn: "11/01/2024", updatedBy: "Samara Johnson" },
  { id: "3", firstName: "Travis", lastName: "Langston", gender: "M", dob: "01/05/2000", age: 26, admittedOn: "01/01/2021", county: "Dallas County", status: "Active", updatedOn: "08/01/2023", updatedBy: "Babar Nawaz CM", serviceContact: "Brenda Smith" },
  { id: "4", firstName: "Muhammad", lastName: "Raaza", gender: "M", dob: "01/29/2013", age: 13, admittedOn: "01/01/2024", county: "Carroll County", status: "Active", updatedOn: "06/12/2024", updatedBy: "Babar Nawaz CM" },
  { id: "5", firstName: "Mohsin", lastName: "Raza", gender: "M", dob: "05/06/2020", age: 5, admittedOn: "09/15/2023", county: "Bremer County", status: "Active", updatedOn: "09/19/2023", updatedBy: "Babar Nawaz CM" },
  { id: "6", firstName: "Sarah", lastName: "Williams", gender: "F", dob: "03/15/1985", age: 40, admittedOn: "06/01/2020", county: "Polk County", status: "Active", updatedOn: "01/15/2025", updatedBy: "Kathy Adams", serviceContact: "Tom Rivera" },
  { id: "7", firstName: "James", lastName: "Thompson", gender: "M", dob: "11/22/1995", age: 30, admittedOn: "03/10/2023", county: "Linn County", status: "Active", updatedOn: "02/01/2025", updatedBy: "Babar Nawaz CM" },
];

const PeopleSupported = () => {
  const navigate = useNavigate();
  const [searchFirst, setSearchFirst] = useState("");
  const [searchLast, setSearchLast] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const filtered = people.filter((p) => {
    const matchFirst = p.firstName.toLowerCase().includes(searchFirst.toLowerCase());
    const matchLast = p.lastName.toLowerCase().includes(searchLast.toLowerCase());
    const matchStatus = statusFilter === "All" || p.status === statusFilter;
    return matchFirst && matchLast && matchStatus;
  });

  const clearFilters = () => {
    setSearchFirst("");
    setSearchLast("");
    setStatusFilter("All");
  };

  return (
    <div className="flex flex-col min-h-screen w-full bg-background">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-6 border-b border-border glass shrink-0">
        <h2 className="font-display font-semibold text-foreground text-lg">People Supported</h2>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-primary-foreground font-medium text-sm transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Companion</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground font-medium text-sm transition-all border border-border"
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </motion.button>
          <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="max-w-[1600px] mx-auto space-y-5">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => toast({ title: "Add Person", description: "New person supported form would open here. This connects to the iCM People module." })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Add Person Supported
            </button>
            <button
              onClick={() => { setStatusFilter("Pending"); toast({ title: "Filtered", description: "Showing pending individuals." }); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-warning text-warning-foreground text-sm font-medium"
            >
              <Clock className="w-4 h-4" /> Pending
            </button>
            <button
              onClick={() => { setStatusFilter("Discharged"); toast({ title: "Filtered", description: "Showing discharged individuals." }); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium border border-border"
            >
              Discharged
            </button>
            <button
              onClick={() => toast({ title: "Export Started", description: "Exporting all records to Excel. File will download shortly." })}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm font-medium border border-border"
            >
              <Download className="w-4 h-4" /> Export to Excel
            </button>
          </div>

          {/* Search Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="appearance-none rounded-lg px-4 py-2.5 pr-9 text-sm bg-card border border-border text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="All">All</option>
                <option value="Active">Active</option>
                <option value="Pending">Pending</option>
                <option value="Discharged">Discharged</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
            <input
              value={searchFirst}
              onChange={(e) => setSearchFirst(e.target.value)}
              placeholder="First Name"
              className="rounded-lg px-4 py-2.5 text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
            />
            <input
              value={searchLast}
              onChange={(e) => setSearchLast(e.target.value)}
              placeholder="Last Name"
              className="rounded-lg px-4 py-2.5 text-sm bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-40"
            />
            <button
              onClick={() => toast({ title: "Search Applied", description: `Showing results matching your filters.` })}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg gradient-primary text-primary-foreground text-sm font-medium"
            >
              <Search className="w-4 h-4" /> Search
            </button>
            <button onClick={clearFilters} className="px-4 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4 inline mr-1" /> Clear
            </button>
          </div>

          {/* Results Count */}
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {people.length} Records
          </p>

          {/* People List */}
          <div className="space-y-3">
            {filtered.map((person, i) => (
              <motion.div
                key={person.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass rounded-xl p-5 flex items-center gap-5 hover:glow-border transition-all duration-200"
              >
                {/* Avatar */}
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center shrink-0">
                  <User className="w-8 h-8 text-muted-foreground" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-display font-semibold text-foreground text-base">
                    {person.lastName}, {person.firstName}
                    {person.nickname && <span className="text-muted-foreground font-normal"> ({person.nickname})</span>}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {person.gender} / {person.age} - {person.dob}
                  </p>
                  <p className="text-sm text-muted-foreground">Admitted On {person.admittedOn}</p>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> {person.county}
                  </p>
                </div>

                {/* Status & Meta */}
                <div className="text-right space-y-1 shrink-0">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">Status:</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      person.status === "Active" ? "bg-success text-success-foreground" :
                      person.status === "Pending" ? "bg-warning text-warning-foreground" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {person.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">Updated On: {person.updatedOn}</p>
                  <p className="text-xs text-muted-foreground">Updated By: {person.updatedBy}</p>
                  {person.serviceContact && (
                    <p className="text-xs text-muted-foreground">Service Contact: {person.serviceContact}</p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    onClick={() => navigate(`/people/${person.id}/echart`)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive/90 text-destructive-foreground text-xs font-medium hover:bg-destructive transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> e-Chart
                  </button>
                  <button
                    onClick={() => toast({ title: "Face Sheet", description: `Opening Face Sheet for ${person.firstName} ${person.lastName}. This connects to the iCM Face Sheet module.` })}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                  >
                    <ClipboardList className="w-3.5 h-3.5" /> FaceSheet
                  </button>
                  <button
                    onClick={() => toast({ title: "View Profile", description: `Opening full profile for ${person.firstName} ${person.lastName}. This connects to the iCM Individual Detail module.` })}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-success text-success-foreground text-xs font-medium hover:bg-success/90 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Profile
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default PeopleSupported;
