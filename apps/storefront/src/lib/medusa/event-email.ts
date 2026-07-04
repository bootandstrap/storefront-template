import type { EmailPayload } from "@/lib/email";

export interface MedusaEventPayload {
  event_type: string;
  data: Record<string, unknown>;
}

interface MedusaEventContext {
  defaultCurrency: string;
  storeName: string;
  storeUrl: string;
  ownerEmail?: string;
}

type PreparedMedusaEvent =
  | {
      kind: "email";
      email: EmailPayload;
      logMessage: string;
      logContext: Record<string, unknown>;
    }
  | { kind: "skip"; warning: string }
  | { kind: "unhandled"; eventType: string };

function prepareOrderPlaced(
  data: Record<string, unknown>,
  context: MedusaEventContext,
): PreparedMedusaEvent {
  const { customer_email, display_id, total, currency, customer_name } =
    data as {
      customer_email?: string;
      display_id?: number;
      total?: number;
      currency?: string;
      customer_name?: string;
    };
  if (!customer_email) {
    return {
      kind: "skip",
      warning: "[medusa-events] order.placed: no customer email",
    };
  }

  return {
    kind: "email",
    email: {
      to: customer_email,
      subject: `🎉 Order #${display_id || ""} Confirmed!`,
      template: "order_confirmation",
      data: {
        customerName: customer_name || customer_email.split("@")[0],
        orderId: String(display_id || ""),
        total: typeof total === "number" ? (total / 100).toFixed(2) : "0.00",
        currency:
          currency?.toUpperCase() || context.defaultCurrency.toUpperCase(),
        storeName: context.storeName,
        storeUrl: context.storeUrl,
      },
    },
    logMessage: "[medusa-events] order.placed email sent",
    logContext: { customer_email },
  };
}

function prepareOrderShipped(
  data: Record<string, unknown>,
  context: MedusaEventContext,
): PreparedMedusaEvent {
  const { customer_email, display_id, tracking_numbers, customer_name } =
    data as {
      customer_email?: string;
      display_id?: number;
      tracking_numbers?: string[];
      customer_name?: string;
    };
  if (!customer_email) {
    return {
      kind: "skip",
      warning: "[medusa-events] order.shipped: no customer email",
    };
  }

  return {
    kind: "email",
    email: {
      to: customer_email,
      subject: `📦 Order #${display_id || ""} Has Shipped!`,
      template: "order_shipped",
      data: {
        customerName: customer_name || customer_email.split("@")[0],
        orderId: String(display_id || ""),
        trackingUrl: tracking_numbers?.[0]
          ? `https://track.aftership.com/${tracking_numbers[0]}`
          : undefined,
        storeName: context.storeName,
        storeUrl: context.storeUrl,
      },
    },
    logMessage: "[medusa-events] order.shipped email sent",
    logContext: { customer_email },
  };
}

function prepareLowStock(
  data: Record<string, unknown>,
  context: MedusaEventContext,
): PreparedMedusaEvent {
  const { sku, title, available_stock, out_of_stock, owner_email } = data as {
    sku?: string;
    title?: string;
    available_stock?: number;
    out_of_stock?: boolean;
    owner_email?: string;
  };
  const recipientEmail = owner_email || context.ownerEmail;
  if (!recipientEmail) {
    return {
      kind: "skip",
      warning: "[medusa-events] low_stock: no owner email configured",
    };
  }

  return {
    kind: "email",
    email: {
      to: recipientEmail,
      subject: `📉 ${out_of_stock ? "OUT OF STOCK" : "Low Stock"}: ${title || sku || "Unknown product"}`,
      template: "low_stock_alert",
      data: {
        title: title || "Unknown",
        sku: sku || "",
        availableStock: available_stock ?? 0,
        outOfStock: out_of_stock || false,
        storeName: context.storeName,
      },
    },
    logMessage: "[medusa-events] low_stock alert sent",
    logContext: { recipientEmail, sku },
  };
}

export function prepareMedusaEventEmail(
  payload: MedusaEventPayload,
  context: MedusaEventContext,
): PreparedMedusaEvent {
  switch (payload.event_type) {
    case "order.placed":
      return prepareOrderPlaced(payload.data, context);
    case "order.shipped":
      return prepareOrderShipped(payload.data, context);
    case "inventory.low_stock":
      return prepareLowStock(payload.data, context);
    default:
      return { kind: "unhandled", eventType: payload.event_type };
  }
}
