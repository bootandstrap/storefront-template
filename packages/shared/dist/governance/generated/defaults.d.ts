import type { FeatureFlags, PlanLimits } from './schemas';
/**
 * Fail-closed fallback feature flags.
 *
 * SECURITY: When Supabase is unreachable, ALL flags are OFF
 * except enable_maintenance_mode (prevents unpaid access).
 */
export declare const FALLBACK_FLAGS: FeatureFlags;
/**
 * Fail-closed fallback plan limits.
 *
 * SECURITY: All numeric limits are ZERO during degradation.
 * No capacity granted — no products, no orders, no customers.
 */
export declare const FALLBACK_LIMITS: PlanLimits;
/**
 * Module catalog for client-side use (renders, upsells, tier comparison).
 */
export declare const MODULE_CATALOG: readonly [{
    readonly key: "ecommerce";
    readonly name: "Tienda Online";
    readonly icon: "🛍️";
    readonly description: "Catálogo, carrito, checkout, cuentas de cliente y panel de gestión";
    readonly category: "sell";
    readonly popular: true;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 25;
        readonly features: readonly ["50 productos / 5 categorías", "100 pedidos/mes / 100 clientes", "Carrito + Checkout + Cuentas", "Seguimiento y direcciones", "Búsqueda de productos"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 45;
        readonly features: readonly ["200 productos / 20 categorías", "500 pedidos/mes / 500 clientes", "Insignias + Productos relacionados", "Promociones (max 5 activas)", "Reseñas + Wishlist + CMS + Carousel"];
        readonly recommended: true;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 75;
        readonly features: readonly ["Productos y categorías ilimitados", "5000 pedidos/mes / Clientes ∞", "Devoluciones self-service", "API externa", "Todo de Pro incluido"];
        readonly recommended: false;
    }];
}, {
    readonly key: "sales_channels";
    readonly name: "Canales de Venta y Pago";
    readonly icon: "💬";
    readonly description: "WhatsApp, tarjeta, efectivo, transferencia y más canales de venta";
    readonly category: "sell";
    readonly popular: true;
    readonly requires: readonly ["ecommerce"];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 15;
        readonly features: readonly ["WhatsApp Checkout + Contacto", "5 templates WhatsApp", "1 método de pago"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 30;
        readonly features: readonly ["15 templates WhatsApp", "Pago con tarjeta (Stripe)", "Efectivo contra entrega", "Newsletter (1000 suscriptores)", "3 métodos de pago"];
        readonly recommended: true;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 50;
        readonly features: readonly ["Templates ilimitados", "Transferencia bancaria", "Reservas (usuario registrado)", "Newsletter (5000 suscriptores)", "Métodos de pago ∞"];
        readonly recommended: false;
    }];
}, {
    readonly key: "chatbot";
    readonly name: "Chatbot IA";
    readonly icon: "🤖";
    readonly description: "Asistente inteligente entrenado con tu negocio. Widget de chat en tu web con IA conversacional.";
    readonly category: "engage";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 25;
        readonly features: readonly ["Widget de chat en tu web", "IA entrenada con tu negocio", "500 mensajes/mes"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 40;
        readonly features: readonly ["Todo lo de Basic", "5000 mensajes/mes", "Analítica de conversaciones"];
        readonly recommended: true;
    }];
}, {
    readonly key: "crm";
    readonly name: "CRM";
    readonly icon: "📁";
    readonly description: "Gestión de contactos, clientes e interacciones";
    readonly category: "engage";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 15;
        readonly features: readonly ["Lista de contactos + notas", "Historial de interacciones", "Max 200 contactos"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 30;
        readonly features: readonly ["Max 5000 contactos", "Segmentación / etiquetas", "Exportar CSV"];
        readonly recommended: false;
    }];
}, {
    readonly key: "seo";
    readonly name: "SEO Modular";
    readonly icon: "🚀";
    readonly description: "Posiciónate en Google y atrae clientes de forma orgánica.";
    readonly category: "grow";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "medio";
        readonly name: "MEDIO";
        readonly price_chf: 85;
        readonly features: readonly ["SEO on-page básico", "Optimización de metadatos", "Google Search Console"];
        readonly recommended: false;
    }, {
        readonly key: "avanzado";
        readonly name: "AVANZADO";
        readonly price_chf: 230;
        readonly features: readonly ["Todo lo de MEDIO", "SEO técnico completo", "Link building", "Reportes mensuales"];
        readonly recommended: true;
    }];
}, {
    readonly key: "rrss";
    readonly name: "Redes Sociales";
    readonly icon: "📱";
    readonly description: "Gestión profesional de Instagram, Facebook y Google Maps para crecer.";
    readonly category: "engage";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "google_maps";
        readonly name: "Google Maps";
        readonly price_chf: 90;
        readonly features: readonly ["Gestión Google My Business", "Optimización ficha", "Reseñas y respuestas"];
        readonly recommended: false;
    }, {
        readonly key: "instagram";
        readonly name: "Instagram";
        readonly price_chf: 85;
        readonly features: readonly ["Gestión de perfil", "Publicaciones mensuales", "Estrategia de contenido"];
        readonly recommended: false;
    }, {
        readonly key: "google_maps_instagram";
        readonly name: "Google Maps + Instagram";
        readonly price_chf: 150;
        readonly features: readonly ["Todo de Google Maps", "Todo de Instagram", "Estrategia integrada"];
        readonly recommended: true;
    }, {
        readonly key: "paquete_basico";
        readonly name: "Paquete básico de recursos visuales";
        readonly price_chf: 105;
        readonly features: readonly ["Sesión fotográfica básica", "Diseño de contenido visual", "Pack de plantillas"];
        readonly recommended: false;
    }, {
        readonly key: "paquete_avanzado";
        readonly name: "Paquete avanzado de recursos visuales";
        readonly price_chf: 145;
        readonly features: readonly ["Sesión fotográfica profesional", "Vídeo corto para redes", "Diseño de marca completo"];
        readonly recommended: false;
    }];
}, {
    readonly key: "i18n";
    readonly name: "Multi-idioma y Moneda";
    readonly icon: "🌐";
    readonly description: "Soporte multilingüe y multi-moneda (independiente)";
    readonly category: "automate";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "2 Idiomas";
        readonly price_chf: 15;
        readonly features: readonly ["2 idiomas + 1 moneda", "URLs localizadas"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "5 Idiomas + Monedas";
        readonly price_chf: 35;
        readonly features: readonly ["5 idiomas + 5 monedas", "Conversión automática"];
        readonly recommended: false;
    }];
}, {
    readonly key: "automation";
    readonly name: "Automatizaciones";
    readonly icon: "🔌";
    readonly description: "Conecta tus herramientas y deja que los datos fluyan solos.";
    readonly category: "automate";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 75;
        readonly features: readonly ["Automatizaciones ilimitadas", "Webhooks custom", "Integración n8n / Zapier / Make"];
        readonly recommended: false;
    }];
}, {
    readonly key: "auth_advanced";
    readonly name: "Auth Avanzada";
    readonly icon: "🛡️";
    readonly description: "Login social con Google y otros proveedores OAuth";
    readonly category: "automate";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 5;
        readonly features: readonly ["Google OAuth"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 12;
        readonly features: readonly ["Google + Apple + Facebook"];
        readonly recommended: false;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 25;
        readonly features: readonly ["2FA", "Magic Link"];
        readonly recommended: false;
    }];
}, {
    readonly key: "email_marketing";
    readonly name: "Email Marketing";
    readonly icon: "📧";
    readonly description: "Emails transaccionales, abandono de carrito y campañas";
    readonly category: "grow";
    readonly popular: true;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 15;
        readonly features: readonly ["Emails transaccionales (pedido, envío, bienvenida)", "500 emails/mes", "Templates predefinidos"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 30;
        readonly features: readonly ["2000 emails/mes", "Abandono de carrito automático", "Review requests post-compra", "Delay configurable (1h/3h/24h)"];
        readonly recommended: true;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 50;
        readonly features: readonly ["10.000 emails/mes", "Campañas manuales", "Segmentación de clientes", "Templates custom (editor no-code)", "Métricas: opens, clicks, bounces"];
        readonly recommended: false;
    }];
}, {
    readonly key: "pos";
    readonly name: "Punto de Venta";
    readonly icon: "🏪";
    readonly description: "Terminal POS web con escáner, recibos, modo kiosco y draft orders de Medusa";
    readonly category: "sell";
    readonly popular: true;
    readonly requires: readonly ["ecommerce"];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 20;
        readonly features: readonly ["Terminal POS web", "Escáner código de barras", "Búsqueda de productos", "Recibo (browser print)", "1 método de pago"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 35;
        readonly features: readonly ["3 métodos de pago", "Modo Kiosco (pantalla completa)", "Atajos de teclado (F2/F4/F11)", "Quick Sale sin producto", "Sonidos + háptica", "Carrito offline (localStorage)"];
        readonly recommended: true;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 55;
        readonly features: readonly ["Métodos de pago ∞", "Impresora térmica ESC/POS", "Descuentos por línea", "Búsqueda de clientes", "Todo de Pro incluido"];
        readonly recommended: false;
    }];
}, {
    readonly key: "capacidad";
    readonly name: "Capacidad de Tráfico";
    readonly icon: "📊";
    readonly description: "Amplía la capacidad de peticiones diarias y añade analítica de tráfico para tu web";
    readonly category: "automate";
    readonly popular: false;
    readonly requires: readonly [];
    readonly tiers: readonly [{
        readonly key: "basic";
        readonly name: "Basic";
        readonly price_chf: 10;
        readonly features: readonly ["10.000 peticiones/día", "Monitorización básica de uso", "Alertas de límite por email"];
        readonly recommended: false;
    }, {
        readonly key: "pro";
        readonly name: "Pro";
        readonly price_chf: 25;
        readonly features: readonly ["50.000 peticiones/día", "Dashboard de tráfico en tiempo real", "Analítica de consumo diario/mensual", "Alertas avanzadas"];
        readonly recommended: true;
    }, {
        readonly key: "enterprise";
        readonly name: "Enterprise";
        readonly price_chf: 50;
        readonly features: readonly ["Peticiones ilimitadas", "Autoscaling automático", "Dashboard de tráfico avanzado", "SLA de disponibilidad", "Todo de Pro incluido"];
        readonly recommended: false;
    }];
}];
/**
 * Flag groups for admin UI organization.
 */
export declare const FLAG_GROUPS: {
    readonly ___checkout: {
        readonly label: "🛒 Checkout";
        readonly color: "#22c55e";
        readonly flags: readonly ["enable_whatsapp_checkout", "enable_whatsapp_contact", "enable_online_payments", "enable_cash_on_delivery", "enable_bank_transfer", "enable_guest_checkout", "require_auth_to_order", "enable_order_notes", "enable_promotions"];
    };
    readonly ___auth___accounts: {
        readonly label: "🔐 Auth & Accounts";
        readonly color: "#3b82f6";
        readonly flags: readonly ["enable_user_registration", "enable_email_auth", "enable_google_auth", "enable_customer_accounts", "enable_address_management", "enable_order_tracking"];
    };
    readonly ___content___discovery: {
        readonly label: "📦 Content & Discovery";
        readonly color: "#f59e0b";
        readonly flags: readonly ["enable_ecommerce", "enable_carousel", "enable_cms_pages", "enable_product_search", "enable_reviews", "enable_wishlist", "enable_related_products", "enable_product_comparisons", "enable_product_badges", "enable_pos", "enable_pos_kiosk", "enable_pos_keyboard_shortcuts", "enable_pos_quick_sale", "enable_pos_offline_cart", "enable_pos_thermal_printer", "enable_pos_line_discounts", "enable_pos_customer_search", "enable_pos_multi_device", "enable_pos_shifts"];
    };
    readonly ___internationalization: {
        readonly label: "🌐 Internationalization";
        readonly color: "#06b6d4";
        readonly flags: readonly ["enable_multi_language", "enable_multi_currency"];
    };
    readonly ___business___branding: {
        readonly label: "🏪 Business & Branding";
        readonly color: "#ec4899";
        readonly flags: readonly ["enable_social_links", "enable_owner_panel", "enable_newsletter"];
    };
    readonly ___system: {
        readonly label: "⚙️ System";
        readonly color: "#8b5cf6";
        readonly flags: readonly ["enable_analytics", "enable_admin_api", "enable_maintenance_mode", "enable_cookie_consent", "enable_chatbot", "enable_self_service_returns", "owner_lite_enabled", "owner_advanced_modules_enabled"];
    };
    readonly ___crm: {
        readonly label: "📁 CRM";
        readonly color: "#f59e0b";
        readonly flags: readonly ["enable_crm", "enable_crm_segmentation", "enable_crm_export"];
    };
    readonly ___email_marketing: {
        readonly label: "📧 Email Marketing";
        readonly color: "#e11d48";
        readonly flags: readonly ["enable_email_notifications", "enable_abandoned_cart_emails", "enable_email_campaigns", "enable_email_templates"];
    };
    readonly ___traffic_capacity: {
        readonly label: "📊 Traffic Capacity";
        readonly color: "#6366f1";
        readonly flags: readonly ["enable_traffic_expansion", "enable_traffic_analytics", "enable_traffic_autoscale"];
    };
};
/**
 * Pricing constants.
 */
export declare const PRICING: {
    readonly maintenance_chf_month: 40;
    readonly web_base_chf_onetime: 1500;
};
//# sourceMappingURL=defaults.d.ts.map