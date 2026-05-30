"use strict";
// getGuidelinesEngine.ts — Shared utility for dynamic engine selection
// Selects the correct guidelines engine per individual based on state + program.
// Results are cached within a single run to avoid redundant Firestore queries.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearEngineCache = clearEngineCache;
exports.getGuidelinesEngineForIndividual = getGuidelinesEngineForIndividual;
const admin = __importStar(require("firebase-admin"));
// Module-level cache — resets between function cold starts (intended)
const _runCache = new Map();
function clearEngineCache() {
    _runCache.clear();
}
async function getGuidelinesEngineForIndividual(orgId, individualState, individualProgram, db) {
    var _a;
    if (!individualState)
        return null;
    const firestoreDb = db !== null && db !== void 0 ? db : admin.firestore();
    const cacheKey = `${orgId}::${individualState}::${individualProgram !== null && individualProgram !== void 0 ? individualProgram : ""}`;
    if (_runCache.has(cacheKey)) {
        return (_a = _runCache.get(cacheKey)) !== null && _a !== void 0 ? _a : null;
    }
    try {
        // Query all published engines for this org + state
        const snap = await firestoreDb
            .collection("guidelines_engines")
            .where("organizationId", "==", orgId)
            .where("state", "==", individualState)
            .where("status", "==", "published")
            .orderBy("effectiveDate", "desc")
            .limit(5)
            .get();
        if (snap.empty) {
            // Try without organizationId filter (some orgs may not set it)
            const broadSnap = await firestoreDb
                .collection("guidelines_engines")
                .where("state", "==", individualState)
                .where("status", "==", "published")
                .orderBy("effectiveDate", "desc")
                .limit(5)
                .get();
            if (broadSnap.empty) {
                _runCache.set(cacheKey, null);
                return null;
            }
            const engines = broadSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
            const result = findBestMatch(engines, individualProgram);
            _runCache.set(cacheKey, result);
            return result;
        }
        const engines = snap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const result = findBestMatch(engines, individualProgram);
        _runCache.set(cacheKey, result);
        return result;
    }
    catch (_b) {
        // Non-fatal — return null so orchestrator can fall back gracefully
        _runCache.set(cacheKey, null);
        return null;
    }
}
function findBestMatch(engines, program) {
    var _a, _b;
    if (!engines.length)
        return null;
    if (!program)
        return (_a = engines[0]) !== null && _a !== void 0 ? _a : null;
    const prog = program.toLowerCase();
    // Try exact program match
    const exact = engines.find(e => { var _a, _b, _c; return ((_a = e.program) === null || _a === void 0 ? void 0 : _a.toLowerCase().includes(prog)) || prog.includes((_c = (_b = e.program) === null || _b === void 0 ? void 0 : _b.toLowerCase()) !== null && _c !== void 0 ? _c : ""); });
    return (_b = exact !== null && exact !== void 0 ? exact : engines[0]) !== null && _b !== void 0 ? _b : null;
}
//# sourceMappingURL=getGuidelinesEngine.js.map