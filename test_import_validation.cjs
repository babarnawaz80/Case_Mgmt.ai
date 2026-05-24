const fs = require('fs');
const xlsx = require('xlsx');

const INDIVIDUAL_FIELDS = [
  { key: "first_name",              label: "First Name",                required: true },
  { key: "last_name",               label: "Last Name",                 required: true },
  { key: "middle_name",             label: "Middle Name" },
  { key: "preferred_name",          label: "Preferred Name / Nickname" },
  { key: "dob",                     label: "Date of Birth",             hint: "YYYY-MM-DD or MM/DD/YYYY" },
  { key: "gender",                  label: "Gender" },
  { key: "pronouns",                label: "Pronouns" },
  { key: "primary_language",        label: "Primary Language" },
  { key: "race",                    label: "Race" },
  { key: "ethnicity",               label: "Ethnicity" },
  { key: "marital_status",          label: "Marital Status" },
  { key: "medicaid_id",             label: "Medicaid ID" },
  { key: "ssn_last4",               label: "SSN (Last 4 digits)" },
  { key: "secondary_state_id",      label: "Secondary State ID" },
  { key: "street",                  label: "Street Address" },
  { key: "city",                    label: "City" },
  { key: "state",                   label: "State" },
  { key: "zip",                     label: "ZIP Code" },
  { key: "county",                  label: "County" },
  { key: "phone",                   label: "Phone Number" },
  { key: "email",                   label: "Email Address" },
  { key: "diagnosis",               label: "Primary Diagnosis (ICD-10)" },
  { key: "level_of_care",           label: "Level of Need Score" },
  { key: "enrollment_status",       label: "Enrollment Status",         hint: "active, pending, transition, discharged" },
  { key: "program",                 label: "Program / Service Line" },
  { key: "program_start_date",      label: "Program Start Date" },
  { key: "waiver_effective_date",   label: "Waiver Effective Date" },
  { key: "assigned_case_manager_name", label: "Assigned Case Manager" },
  { key: "assigned_supervisor_name",   label: "Assigned Supervisor" },
  { key: "pcp_due_date",            label: "PCP Due Date" },
  { key: "notes",                   label: "Intake Notes" },
];

const ALIASES = {
  first_name:        ["firstname","fname","givenname","given","firstnm","participantfirst","clientfirst","memberfirst","first_name","first_name_*"],
  last_name:         ["lastname","lname","surname","familyname","lastnm","participantlast","clientlast","memberlast","last_name","last_name_*"],
  middle_name:       ["middlename","mname","midname","middle"],
  preferred_name:    ["preferredname","nickname","preferredname","alias","knownname","goesbyname","preferred_name"],
  dob:               ["dateofbirth","birthdate","bd","bday","dob","birthday","birth","date_of_birth","date_of_birth_*"],
  gender:            ["sex","gender","genderidentity","sexatbirth","gender_*"],
  medicaid_id:       ["medicaidid","medicaid","medicaidnumber","medicaidnum","stateid","waivernumber","recipientid","maid","ma_id","maid_*","ma_id_*"],
  ssn_last4:         ["ssn","socialsecurity","ssn4","ssnlast4","last4ssn"],
  phone:             ["phonenumber","phone","mobile","cell","cellphone","telephone","primaryphone","phone_home","phone_cell","phonehome","phonecell"],
  email:             ["emailaddress","email","emailaddr","mail"],
  county:            ["county","countyofresidence","residentcounty","county_*"],
  street:            ["streetaddress","address1","addr1","street","streetaddr","primaryaddress","address_street","addressstreet"],
  city:              ["city","cityofresidence","town","address_city","addresscity"],
  state:             ["state","statecode","stateofresidence","st","address_state","addressstate"],
  zip:               ["zipcode","zip","postalcode","postal","address_zip","addresszip"],
  diagnosis:         ["diagnosis","primarydiagnosis","icd10","icdcode","condition","primarycondition","dx","primary_diagnosis","icd10_codes","icd10codes"],
  enrollment_status: ["status","enrollmentstatus","participantstatus","memberstatus","clientstatus","active","status_*"],
  program:           ["program","programname","serviceline","waiver","programtype","service","program_type","waiver_type"],
  program_start_date:["programstartdate","startdate","enrollmentdate","waiverstart","servicestart","admission_date","admission_date_*","admissiondate"],
  pcp_due_date:      ["pcpduedate","pcpdue","planofduedate","reviewdate","planreview","next_isp_date","last_annual_plan_date","nextispdate"],
  notes:             ["notes","comments","intakenotes","remarks","additionalnotes","memo","medical_notes","medicalnotes","special_instructions","specialinstructions","living_situation","livingsituation","communication_notes","communicationnotes"],
  assigned_case_manager_name: ["assignedcasemanager","assignedcasemanagername","casemanager","casemanagername","assigned_case_manager","assigned_case_manager_*","assignedcasemanager*"],
  assigned_supervisor_name: ["assignedsupervisor","assignedsupervisorname","supervisor","supervisorname","assigned_supervisor"],
};

function normalize(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, ""); }

function autoMap(headers, fields) {
  return headers.map((h) => {
    const nh = normalize(h);
    let best = null;
    let confidence = "none";

    for (const field of fields) {
      const nf = normalize(field.key);
      const nl = normalize(field.label);
      const aliases = ALIASES[field.key] ?? [];

      if (nh === nf || nh === nl || aliases.includes(nh)) {
        best = field.key;
        confidence = "auto";
        break;
      }
    }
    return { excelCol: h, systemField: best, confidence };
  });
}

function formatDateValue(val) {
  if (val instanceof Date) {
    const yyyy = val.getFullYear();
    const mm = String(val.getMonth() + 1).padStart(2, "0");
    const dd = String(val.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return val !== undefined && val !== null ? String(val).trim() : "";
}

function extractMappedData(row, mappings) {
  const out = {};
  for (const m of mappings) {
    if (!m.systemField) continue;
    const val = row[m.excelCol];
    if (val !== undefined && val !== "") out[m.systemField] = formatDateValue(val);
  }
  out.enrollment_status = out.enrollment_status ?? "active";
  return out;
}

function validateRow(row, fields, rowIdx) {
  return fields.filter(f => f.required).flatMap(f => {
    const val = row[f.key];
    return (!val || val.trim() === "") ? [{ row: rowIdx, field: f.key, message: `${f.label} is required` }] : [];
  });
}

try {
  const filePath = '/Users/kamal/Documents/CaseManagement.ai/test CaseManagementAI_Individual_Import.xlsx';
  const buf = fs.readFileSync(filePath);
  const wb = xlsx.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // 1. Read first 8 rows as raw arrays to auto-detect optimal header row index
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: "" });
  
  let bestHeaderIndex = 0;
  let maxMatches = 0;

  for (let i = 0; i < Math.min(8, rawRows.length); i++) {
    const row = rawRows[i];
    if (!Array.isArray(row)) continue;

    let matches = 0;
    for (const cell of row) {
      const sc = normalize(String(cell ?? ""));
      if (!sc) continue;

      const isMatch = INDIVIDUAL_FIELDS.some(field => {
        const fk = normalize(field.key);
        const fl = normalize(field.label);
        const aliases = ALIASES[field.key] ?? [];
        return sc === fk || sc === fl || aliases.includes(sc) || sc.includes(fk) || sc.includes(fl);
      });
      if (isMatch) matches++;
    }

    if (matches > maxMatches && matches >= 3) {
      maxMatches = matches;
      bestHeaderIndex = i;
    }
  }

  console.log('Detected bestHeaderIndex:', bestHeaderIndex);

  const json = xlsx.utils.sheet_to_json(sheet, { range: bestHeaderIndex, defval: "" });
  console.log('Parsed rows count:', json.length);

  const headers = Object.keys(json[0]);
  const mappings = autoMap(headers, INDIVIDUAL_FIELDS);
  
  console.log('\nMappings summary:');
  mappings.forEach(m => {
    if (m.systemField) {
      console.log(`  - "${m.excelCol}" -> "${m.systemField}" (${m.confidence})`);
    }
  });

  const mappedRows = json.map(r => extractMappedData(r, mappings));
  console.log('\nMapped rows count:', mappedRows.length);

  const allErrors = mappedRows.flatMap((row, i) => validateRow(row, INDIVIDUAL_FIELDS, i + 1));
  console.log('\nTotal validation errors:', allErrors.length);
  if (allErrors.length > 0) {
    console.log('First 5 errors:', allErrors.slice(0, 5));
  } else {
    console.log('Zero validation errors! Row 1 mapped preview:', mappedRows[0]);
  }
} catch (err) {
  console.error('Error running validation:', err);
}
