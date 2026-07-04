/**
 * Internal Medusa Events Webhook
 *
 * Receives event payloads from Medusa subscribers (order.placed, order.shipped,
 * low-stock-alert) and dispatches emails via the tenant's configured provider.
 *
 * Architecture: Medusa runs in a separate container and has no access to tenant
 * email config (stored in Supabase). This route bridges that gap — Medusa
 * subscribers POST here, and the storefront sends emails via `sendEmailForTenant()`.
 *
 * Security: Protected by `MEDUSA_EVENTS_SECRET` shared between Medusa and storefront.
 * Falls back to checking that the request comes from localhost (same Docker network).
 *
 * Zone: 🔴 LOCKED — platform infrastructure
 */

import { NextRequest, NextResponse } from "next/server";
import { sendEmailForTenant, sendEmail } from "@/lib/email";
import { getConfig } from "@/lib/config";
import { logger } from "@/lib/logger";
import {
  prepareMedusaEventEmail,
  type MedusaEventPayload,
} from "@/lib/medusa/event-email";

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // ── Auth: shared secret (MANDATORY) ──
  const secret = process.env.MEDUSA_EVENTS_SECRET;
  if (!secret) {
    logger.error(
      "[medusa-events] MEDUSA_EVENTS_SECRET is not configured — rejecting all requests",
    );
    return NextResponse.json(
      { error: "Webhook not configured. Set MEDUSA_EVENTS_SECRET." },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("x-medusa-events-secret");
  if (authHeader !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: MedusaEventPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.event_type || !payload.data) {
    return NextResponse.json(
      { error: "Missing event_type or data" },
      { status: 400 },
    );
  }

  try {
    const appConfig = await getConfig();
    const prepared = prepareMedusaEventEmail(payload, {
      defaultCurrency: appConfig.config.default_currency,
      storeName: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
      storeUrl: process.env.NEXT_PUBLIC_SITE_URL || "",
      ownerEmail: process.env.STORE_OWNER_EMAIL,
    });

    if (prepared.kind === "skip") {
      logger.warn(prepared.warning);
      return NextResponse.json({ received: true });
    }
    if (prepared.kind === "unhandled") {
      logger.warn("[medusa-events] Unhandled event type", {
        event_type: prepared.eventType,
      });
      return NextResponse.json({ received: true });
    }

    const tenantId = process.env.TENANT_ID;
    if (tenantId) {
      await sendEmailForTenant(tenantId, prepared.email);
    } else {
      await sendEmail(prepared.email);
    }
    logger.info(prepared.logMessage, prepared.logContext);

    return NextResponse.json({ received: true });
  } catch (err) {
    logger.error("[medusa-events] Error processing event:", err);
    return NextResponse.json({ error: "Processing error" }, { status: 500 });
  }
}
