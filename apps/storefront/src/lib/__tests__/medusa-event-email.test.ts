import { describe, expect, it } from "vitest";
import { prepareMedusaEventEmail } from "@/lib/medusa/event-email";

const context = {
  defaultCurrency: "chf",
  storeName: "Demo Store",
  storeUrl: "https://example.test",
  ownerEmail: "owner@example.test",
};

describe("prepareMedusaEventEmail", () => {
  it("prepares an order confirmation without transport concerns", () => {
    const result = prepareMedusaEventEmail(
      {
        event_type: "order.placed",
        data: {
          customer_email: "buyer@example.test",
          display_id: 42,
          total: 1299,
          currency: "eur",
        },
      },
      context,
    );

    expect(result).toEqual({
      kind: "email",
      email: {
        to: "buyer@example.test",
        subject: "🎉 Order #42 Confirmed!",
        template: "order_confirmation",
        data: {
          customerName: "buyer",
          orderId: "42",
          total: "12.99",
          currency: "EUR",
          storeName: "Demo Store",
          storeUrl: "https://example.test",
        },
      },
      logContext: { customer_email: "buyer@example.test" },
      logMessage: "[medusa-events] order.placed email sent",
    });
  });

  it("skips customer events that do not contain a recipient", () => {
    expect(
      prepareMedusaEventEmail(
        {
          event_type: "order.shipped",
          data: { display_id: 42 },
        },
        context,
      ),
    ).toEqual({
      kind: "skip",
      warning: "[medusa-events] order.shipped: no customer email",
    });
  });

  it("uses the configured owner for low-stock alerts", () => {
    const result = prepareMedusaEventEmail(
      {
        event_type: "inventory.low_stock",
        data: { sku: "SKU-1", title: "Apple", available_stock: 3 },
      },
      context,
    );

    expect(result.kind).toBe("email");
    if (result.kind !== "email") throw new Error("Expected an email result");
    expect(result.email).toMatchObject({
      to: "owner@example.test",
      subject: "📉 Low Stock: Apple",
      template: "low_stock_alert",
      data: { availableStock: 3, outOfStock: false },
    });
  });

  it("marks unknown events as unhandled", () => {
    expect(
      prepareMedusaEventEmail(
        {
          event_type: "future.event",
          data: {},
        },
        context,
      ),
    ).toEqual({
      kind: "unhandled",
      eventType: "future.event",
    });
  });
});
