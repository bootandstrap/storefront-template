# Checkout Flows — Dynamic N-Method Payment System

## Architecture

Payment/order methods are **entirely feature-flag driven**. The system renders 1-N methods dynamically — no method is hardcoded.

### Payment Method Feature Flags

| Flag | Default | Method |
|------|---------|--------|
| `enable_whatsapp_checkout` | `true` | Pedir por WhatsApp |
| `enable_online_payments` | `true` | Pagar con Tarjeta (Stripe) |
| `enable_cash_on_delivery` | `true` | Pago Contra Entrega |
| `enable_bank_transfer` | `false` | Transferencia Bancaria |

### Smart Rendering (`PaymentMethodSelector`)

| Enabled Count | UI |
|---------------|-----|
| **1** | Single full-width button |
| **2** | Two side-by-side buttons |
| **3+** | Default (highest priority) as primary button + "Otras formas de pago" dropdown |

### Payment Method Registry (`lib/payment-methods.ts`)

```ts
type PaymentMethod = {
  id: string           // 'whatsapp', 'stripe', 'cod', 'bank_transfer'
  flag: string         // feature_flags column name
  label: string        // "Pedir por WhatsApp"
  icon: LucideIcon     // MessageCircle, CreditCard, Truck, Building
  description: string  // "Te contactamos para confirmar"
  component: ComponentType  // WhatsAppCheckoutFlow, StripeCheckoutFlow...
  priority: number     // 10=highest priority (default), 20, 30, 40
}
```

## Shared Checkout Flow

All payment methods share the same `CheckoutModal`:

```
Cart Page → "Realizar Pedido" button
    │
    ▼
CheckoutModal opens:
    1. Shipping address form (shared across ALL methods)
    2. Payment method selection (PaymentMethodSelector)
    3. Method-specific UI:
       - WhatsApp → message preview → "Enviar por WhatsApp"
       - Stripe → Stripe Elements card form → "Pagar"
       - COD → confirmation + delivery notes → "Confirmar Pedido"
       - Bank Transfer → account details → "Confirmar"
```

## Flow 1: WhatsApp Checkout

```
Select "Pedir por WhatsApp"
    │
    ▼
Server Action: validate cart + create order (status: pending)
    │
    ▼
Build message from Supabase template (whatsapp_templates table)
    │
    ▼
Show message preview (editable by customer)
    │
    ▼
"Enviar por WhatsApp" → opens wa.me/{phone}?text={encoded_message}
    │
    ▼
Admin receives WhatsApp → confirms order in Medusa Admin
```

### WhatsApp Message Template Engine

Templates stored in `whatsapp_templates` table with `{{variable}}` + `{{#each}}` syntax:

```
🛒 *Nuevo Pedido — {{store_name}}*

📦 *Productos:*
{{#each items}}
• {{name}} ({{variant}}) x{{qty}} — {{price}}
{{/each}}

💰 *Total: {{total}}*
📍 *Envío:* {{address}}
👤 {{customer_name}} — {{customer_phone}}
📝 {{notes}}
```

Templates are editable from Supabase without code changes. Multiple templates can exist; one is marked `is_default`.

## Flow 2: Stripe Online Payment

```
Select "Pagar con Tarjeta"
    │
    ▼
Stripe Elements card form
    │
    ▼
Server Action: completeCart()
├── Medusa validates prices server-side
├── Stripe PaymentIntent created
└── Order created (status: pending)
    │
    ▼
Stripe Webhook: payment_intent.succeeded
├── Order → confirmed
└── Confirmation email (Resend)
    │
    ▼
Order Confirmation Page
```

## Flow 3: Cash on Delivery

```
Select "Pago Contra Entrega"
    │
    ▼
Confirm delivery address + notes
    │
    ▼
Server Action: create order (status: pending_cod)
    │
    ▼
Admin confirms delivery → marks paid
```

## Adding a New Payment Method

1. Add flag to `feature_flags`: `enable_my_method`
2. Create `src/components/checkout/MyMethodFlow.tsx`
3. Register in `src/lib/payment-methods.ts` with id, flag, label, icon, component, priority
4. **Done** — auto-renders in checkout when flag is enabled

## Security

1. **Price tampering**: Cart prices validated server-side by Medusa
2. **Idempotency**: Order creation uses idempotency keys
3. **Rate limiting**: Checkout endpoints rate-limited per IP
4. **CSRF**: Server Actions inherently CSRF-protected
