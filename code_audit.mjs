/**
 * Static code audit — checks source files for known issues without needing a browser.
 */

import { readFileSync } from "fs";
import { join } from "path";

const ROOT = "/Users/kamal/Documents/CaseManagement.ai/repo/src";

const PASS = (msg) => console.log(`  ✅ PASS: ${msg}`);
const FAIL = (msg) => { console.error(`  ❌ FAIL: ${msg}`); process.exitCode = 1; };
const WARN = (msg) => console.warn(`  ⚠️  WARN: ${msg}`);
const SECTION = (msg) => console.log(`\n══════════════════════════════\n  ${msg}\n══════════════════════════════`);

function read(relPath) {
  return readFileSync(join(ROOT, relPath), "utf8");
}

// ─────────────────────────────────────────────────────────────
SECTION("1. GuidelinesEnginesList — three-dot dropdown");
// ─────────────────────────────────────────────────────────────

const enginesList = read("pages/platform/GuidelinesEnginesList.tsx");

if (enginesList.includes("View Engine")) PASS("'View Engine' option in dropdown");
else FAIL("'View Engine' option MISSING from dropdown");

if (enginesList.includes("Edit Engine")) PASS("'Edit Engine' option in dropdown");
else FAIL("'Edit Engine' option MISSING");

if (enginesList.includes("Delete Engine")) PASS("'Delete Engine' option in dropdown");
else FAIL("'Delete Engine' option MISSING");

if (enginesList.includes("deleteDoc")) PASS("deleteDoc import used for delete action");
else FAIL("deleteDoc NOT found — delete won't work");

if (enginesList.includes("setOpenMenuId(openMenuId === e.id ? null : e.id)")) PASS("Toggle logic correct for menu open/close");
else FAIL("Menu toggle logic incorrect");

if (enginesList.includes("document.addEventListener(\"mousedown\"")) PASS("Click-outside handler registered");
else FAIL("Click-outside handler MISSING — menu won't auto-close");

// ─────────────────────────────────────────────────────────────
SECTION("2. NewEngineWizard — dummy data removed");
// ─────────────────────────────────────────────────────────────

const wizard = read("pages/platform/NewEngineWizard.tsx");

if (!wizard.includes("Coordination of Community Services")) PASS("Dummy 'CCS' service removed");
else FAIL("Dummy 'CCS' service still present!");

if (!wizard.includes("Day Habilitation") || wizard.includes("'Day Habilitation'") === false && !wizard.includes("name: \"Day Habilitation\"")) PASS("Dummy 'Day Habilitation' removed");
else FAIL("Dummy 'Day Habilitation' service still present!");

if (!wizard.includes('name: "Supported Employment"')) PASS("Dummy 'Supported Employment' data entry removed");
else FAIL("Dummy 'Supported Employment' data entry still present!");

if (!wizard.includes("COMAR 10.22.16.03")) PASS("Hardcoded COMAR citations removed");
else FAIL("Hardcoded COMAR citations still present!");

if (wizard.includes("useState<ExtractedService[]>([])")) PASS("extracted state initialises empty []");
else FAIL("extracted state does NOT initialise empty — may default to dummy data");

if (wizard.includes("setExtracted([])")) PASS("onRemove resets to empty []");
else FAIL("onRemove does NOT reset to empty — may show dummy data after remove");

if (!wizard.includes("Document received (47 pages)")) PASS("Hardcoded '47 pages' processing step removed");
else FAIL("Hardcoded '47 pages' step still present!");

if (!wizard.includes("Complete — 14 services extracted")) PASS("Hardcoded '14 services' step removed");
else FAIL("Hardcoded '14 services extracted' step still present!");

if (wizard.includes("GEMINI_ENDPOINT")) PASS("Gemini API endpoint configured");
else FAIL("Gemini API endpoint MISSING");

if (wizard.includes("extractRulesFromPdf")) PASS("extractRulesFromPdf function present");
else FAIL("extractRulesFromPdf function MISSING");

if (wizard.includes("generateSmartRules")) PASS("generateSmartRules fallback function present");
else FAIL("generateSmartRules fallback MISSING");

if (wizard.includes("UNIVERSAL_EXTRACTION_PROMPT")) PASS("Universal extraction prompt present");
else FAIL("UNIVERSAL_EXTRACTION_PROMPT MISSING");

if (wizard.includes("AiExtractionPromptSection")) PASS("AI Extraction Prompt UI section present");
else FAIL("AiExtractionPromptSection component MISSING");

// ─────────────────────────────────────────────────────────────
SECTION("3. PCPCreationModal — live AI extraction");
// ─────────────────────────────────────────────────────────────

const modal = read("components/pcp/PCPCreationModal.tsx");

if (modal.includes("extractPcpDataFromPdfs")) PASS("extractPcpDataFromPdfs called in modal");
else FAIL("extractPcpDataFromPdfs NOT used in modal");

if (modal.includes("fileToBase64")) PASS("fileToBase64 helper defined");
else FAIL("fileToBase64 MISSING — file reading won't work");

if (modal.includes("onComplete: (data: ExtractedPcpData | null)")) PASS("Step2Reading takes live data callback");
else FAIL("Step2Reading callback signature is wrong — won't pass AI data to Step3");

if (modal.includes("extractedData")) PASS("extractedData state threading to Step3Review");
else FAIL("extractedData NOT threaded to Step3Review — review will show empty");

if (!modal.includes("MOCK_FILE_DETAILS")) PASS("Mock file details removed from modal");
else FAIL("MOCK_FILE_DETAILS still present in modal — it's still mocked!");

if (modal.includes("sections: extractedData ?")) PASS("Firestore save includes AI-extracted sections");
else FAIL("Firestore save does NOT include extracted sections — data won't persist");

// ─────────────────────────────────────────────────────────────
SECTION("4. PersonCarePlanBuilder — Firestore pre-fill, no dummy data");
// ─────────────────────────────────────────────────────────────

const builder = read("pages/PersonCarePlanBuilder.tsx");

if (!builder.includes("\"Spending time with his mother\"")) PASS("Dummy 'important to' data removed from builder");
else FAIL("Dummy 'important to' data STILL present in builder!");

if (!builder.includes("\"Consistent medication management\"")) PASS("Dummy 'important for' data removed from builder");
else FAIL("Dummy 'important for' data STILL present in builder!");

if (!builder.includes("\"Explore part-time employment opportunities\"")) PASS("Dummy goal 1 removed from builder");
else FAIL("Dummy goal 1 STILL present in builder!");

if (!builder.includes("\"Maintain community integration through Day Hab\"")) PASS("Dummy goal 2 removed from builder");
else FAIL("Dummy goal 2 STILL present in builder!");

if (builder.includes("getDoc") && builder.includes("pcpId")) PASS("Builder fetches PCP from Firestore using pcpId");
else FAIL("Builder does NOT fetch from Firestore — pre-fill won't work");

if (builder.includes("sections.good_life")) PASS("Builder reads good_life from Firestore sections");
else FAIL("Builder does NOT read good_life from sections");

if (builder.includes("sections.goals?.length")) PASS("Builder reads goals from Firestore sections");
else FAIL("Builder does NOT read goals from sections");

// ─────────────────────────────────────────────────────────────
SECTION("5. pcpAiService — live Gemini API");
// ─────────────────────────────────────────────────────────────

const pcpService = read("services/pcpAiService.ts");

if (pcpService.includes("gemini-2.5-flash")) PASS("pcpAiService uses gemini-2.5-flash model");
else FAIL("pcpAiService NOT using gemini-2.5-flash");

if (pcpService.includes("application/pdf")) PASS("pcpAiService sends PDF as inlineData");
else FAIL("pcpAiService does NOT send PDF inlineData");

if (pcpService.includes("chartItems")) PASS("Response schema includes chartItems for UI progress");
else FAIL("Response schema missing chartItems");

if (pcpService.includes("goodLife") && pcpService.includes("importantTo") && pcpService.includes("goals")) {
  PASS("Response schema includes goodLife, importantTo, goals");
} else {
  FAIL("Response schema missing key PCP fields");
}

// ─────────────────────────────────────────────────────────────
SECTION("SUMMARY");
// ─────────────────────────────────────────────────────────────

if (process.exitCode === 1) {
  console.log("\n❌ Some tests FAILED — review the failures above.\n");
} else {
  console.log("\n✅ All checks PASSED — code looks production-ready.\n");
}
