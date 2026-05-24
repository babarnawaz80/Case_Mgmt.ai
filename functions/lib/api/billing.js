"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCheckoutSession = createCheckoutSession;
exports.createPortalSession = createPortalSession;
exports.stripeWebhook = stripeWebhook;
exports.simulateWebhookPayment = simulateWebhookPayment;
const admin = __importStar(require("firebase-admin"));
const stripe_1 = __importDefault(require("stripe"));
const collections_1 = require("../config/collections");
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";
// Standard packages matching the seeded config packs
const PACKS = {
    starter: { name: "Starter", credits: 50000, price: 50 },
    standard: { name: "Standard", credits: 150000, price: 100 },
    professional: { name: "Professional", credits: 400000, price: 250 },
    agency: { name: "Agency", credits: 1000000, price: 500 },
};
// Lazy initialization of Stripe SDK
let stripeInstance = null;
function getStripe() {
    if (!stripeInstance && STRIPE_SECRET_KEY) {
        stripeInstance = new stripe_1.default(STRIPE_SECRET_KEY, {
            apiVersion: "2023-10-16",
        });
    }
    return stripeInstance;
}
/**
 * Creates a Stripe Checkout Session for a credit package purchase.
 * If Stripe secret key is not set, falls back to a sandbox simulation.
 */
async function createCheckoutSession(req, res) {
    try {
        const { packId, organizationId } = req.body;
        if (!packId || !organizationId) {
            return res.status(400).json({ error: "Missing packId or organizationId" });
        }
        const pack = PACKS[packId.toLowerCase()];
        if (!pack) {
            return res.status(400).json({ error: "Invalid packId" });
        }
        const db = admin.firestore();
        const orgRef = db.collection(collections_1.COLLECTIONS.ORGANIZATIONS).doc(organizationId);
        const orgSnap = await orgRef.get();
        if (!orgSnap.exists) {
            return res.status(404).json({ error: "Organization not found" });
        }
        const orgData = orgSnap.data();
        const stripe = getStripe();
        // Check if Stripe is configured, otherwise fallback to sandbox simulation
        if (!stripe) {
            console.log(`[Stripe] Secret key missing — initiating Sandbox Checkout Simulation for org ${organizationId}`);
            const simSessionId = `sim_chk_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
            // Determine redirect URL to our client-side checkout simulation screen
            const baseUrl = req.headers.referer || "http://localhost:5000";
            const redirectUrl = `${new URL(baseUrl).origin}/settings/billing/checkout-simulation?session_id=${simSessionId}&pack_id=${packId}&org_id=${organizationId}`;
            return res.json({ url: redirectUrl, simulated: true, sessionId: simSessionId });
        }
        // --- Real Stripe Implementation ---
        let stripeCustomerId = orgData.stripe_customer_id;
        // Create Stripe customer if they don't have one
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: orgData.billing_email || undefined,
                name: orgData.name,
                metadata: { organizationId },
            });
            stripeCustomerId = customer.id;
            await orgRef.update({ stripe_customer_id: stripeCustomerId });
        }
        const baseUrl = req.headers.referer || "https://casemanagement-ai.web.app";
        const checkoutSession = await stripe.checkout.sessions.create({
            customer: stripeCustomerId,
            payment_method_types: ["card"],
            line_items: [
                {
                    price_data: {
                        currency: "usd",
                        product_data: {
                            name: `CaseManagement.AI — ${pack.name} Pack`,
                            description: `Add ${pack.credits.toLocaleString()} AI credits to your organization's balance.`,
                        },
                        unit_amount: pack.price * 100, // Stripe expects cents
                    },
                    quantity: 1,
                },
            ],
            mode: "payment",
            success_url: `${new URL(baseUrl).origin}/settings/ai-usage?checkout_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${new URL(baseUrl).origin}/settings/ai-usage?checkout_cancelled=true`,
            metadata: {
                organizationId,
                packId,
                credits: String(pack.credits),
                price: String(pack.price),
            },
        });
        return res.json({ url: checkoutSession.url, simulated: false, sessionId: checkoutSession.id });
    }
    catch (err) {
        console.error("[Stripe] Failed to create checkout session:", err);
        return res.status(500).json({ error: err.message || "Failed to initiate payment" });
    }
}
/**
 * Creates a Stripe Billing Portal session for card management and invoice retrieval.
 * If Stripe secret key is not set, falls back to a sandbox simulation.
 */
async function createPortalSession(req, res) {
    try {
        const { organizationId } = req.body;
        if (!organizationId) {
            return res.status(400).json({ error: "Missing organizationId" });
        }
        const db = admin.firestore();
        const orgRef = db.collection(collections_1.COLLECTIONS.ORGANIZATIONS).doc(organizationId);
        const orgSnap = await orgRef.get();
        if (!orgSnap.exists) {
            return res.status(404).json({ error: "Organization not found" });
        }
        const orgData = orgSnap.data();
        const stripe = getStripe();
        // Check if Stripe is configured, otherwise fallback to sandbox simulation
        if (!stripe) {
            console.log(`[Stripe] Secret key missing — initiating Sandbox Portal Simulation for org ${organizationId}`);
            const baseUrl = req.headers.referer || "http://localhost:5000";
            const redirectUrl = `${new URL(baseUrl).origin}/settings/billing/portal-simulation?org_id=${organizationId}`;
            return res.json({ url: redirectUrl, simulated: true });
        }
        // --- Real Stripe Implementation ---
        let stripeCustomerId = orgData.stripe_customer_id;
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: orgData.billing_email || undefined,
                name: orgData.name,
                metadata: { organizationId },
            });
            stripeCustomerId = customer.id;
            await orgRef.update({ stripe_customer_id: stripeCustomerId });
        }
        const baseUrl = req.headers.referer || "https://casemanagement-ai.web.app";
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${new URL(baseUrl).origin}/settings/ai-usage`,
        });
        return res.json({ url: portalSession.url, simulated: false });
    }
    catch (err) {
        console.error("[Stripe] Failed to create billing portal session:", err);
        return res.status(500).json({ error: err.message || "Failed to initiate billing portal" });
    }
}
/**
 * Stripe Live Webhook Handler.
 * Processes successful payments to credit organization accounts in real-time.
 */
async function stripeWebhook(req, res) {
    const sig = req.headers["stripe-signature"];
    if (!sig) {
        return res.status(400).send("Webhook Error: Missing Stripe signature");
    }
    const stripe = getStripe();
    if (!stripe) {
        return res.status(500).send("Webhook Error: Stripe is not configured on this server");
    }
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        console.error("[Stripe] Webhook signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    // Handle successful checkouts
    if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const metadata = session.metadata;
        if (!metadata || !metadata.organizationId || !metadata.packId) {
            console.error("[Stripe Webhook] Missing vital metadata in checkout session completion:", session.id);
            return res.status(200).send("Ignored: Missing metadata");
        }
        const { organizationId, packId, credits, price } = metadata;
        console.log(`[Stripe Webhook] Confirmed payment of $${price} for ${credits} credits by org ${organizationId}`);
        try {
            await applyRealCredits(organizationId, packId, Number(credits), Number(price), session.id, "Stripe Checkout Credit Card Purchase");
        }
        catch (dbErr) {
            console.error("[Stripe Webhook] Failed to apply credits to database:", dbErr.message);
            return res.status(500).send("Database Update Failed");
        }
    }
    return res.json({ received: true });
}
/**
 * Sandbox-only Secure Simulated Payment webhook endpoint.
 * Called by the simulated checkout screen to credit balance.
 */
async function simulateWebhookPayment(req, res) {
    try {
        const { packId, organizationId, sessionId } = req.body;
        if (!packId || !organizationId || !sessionId) {
            return res.status(400).json({ error: "Missing packId, organizationId, or sessionId" });
        }
        // Double check that we are actually in simulation mode to prevent exploit in live environment
        if (STRIPE_SECRET_KEY) {
            return res.status(403).json({ error: "Access denied: Simulated endpoints are disabled in production mode." });
        }
        const pack = PACKS[packId.toLowerCase()];
        if (!pack) {
            return res.status(400).json({ error: "Invalid packId" });
        }
        console.log(`[Stripe Sandbox] Simulating payment processing for session: ${sessionId}`);
        await applyRealCredits(organizationId, pack.name, pack.credits, pack.price, sessionId, "Simulated Sandbox Credit Card Purchase");
        return res.json({ success: true, creditsAdded: pack.credits });
    }
    catch (err) {
        console.error("[Stripe Sandbox] Failed to apply simulated payment:", err);
        return res.status(500).json({ error: err.message || "Failed to process simulated payment" });
    }
}
/**
 * Helper to credit Firestore organizations atomic balance and write transaction history log.
 */
async function applyRealCredits(organizationId, packName, credits, price, transactionId, description) {
    const db = admin.firestore();
    const orgRef = db.collection(collections_1.COLLECTIONS.ORGANIZATIONS).doc(organizationId);
    await db.runTransaction(async (tx) => {
        var _a, _b;
        const orgSnap = await tx.get(orgRef);
        if (!orgSnap.exists)
            throw new Error("Organization document not found");
        const org = orgSnap.data();
        const currentBalance = (_a = org.credit_balance) !== null && _a !== void 0 ? _a : 0;
        const newBalance = currentBalance + credits;
        const totalPurchased = ((_b = org.total_credits_purchased) !== null && _b !== void 0 ? _b : 0) + credits;
        tx.update(orgRef, {
            credit_balance: newBalance,
            total_credits_purchased: totalPurchased,
            ai_features_enabled: true, // Auto-unpause AI features on payment
            low_balance_alert_sent: false, // Reset alert trigger
            ai_paused_at: null,
        });
        // Write a credit transaction history entry inside the transaction to keep it atomic
        const historyRef = db.collection(collections_1.COLLECTIONS.CREDIT_HISTORY).doc();
        tx.set(historyRef, {
            id: historyRef.id,
            organizationId,
            amount: credits,
            priceUsd: price,
            type: "purchase",
            description: `${description} — ${packName}`,
            transactionId,
            balanceAfter: newBalance,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
    });
}
//# sourceMappingURL=billing.js.map