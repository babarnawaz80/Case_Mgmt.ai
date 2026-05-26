// Platform Data Seeder
// CaseManagement.AI
// Call once at app startup to ensure Firestore has seed data for the platform features.

import { seedGuidelinesEngines } from '../services/guidelinesEngineService';
import { seedAgents } from '../services/agentsService';
import { seedAgentRuns } from '../services/agentRunsService';

let seeded = false;

export async function seedPlatformData(): Promise<void> {
  if (seeded) return;
  seeded = true;

  try {
    await Promise.all([
      seedGuidelinesEngines(),
      seedAgents(),
    ]);
    // Runs after agents (slight delay to let agents seed complete)
    await seedAgentRuns();
  } catch (err) {
    // Seed failures are non-fatal — app works without them
    console.warn('[seedPlatformData] Seed error (non-fatal):', err);
    seeded = false; // allow retry
  }
}
