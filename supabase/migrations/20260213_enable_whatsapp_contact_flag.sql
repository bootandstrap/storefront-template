-- Add enable_whatsapp_contact flag to separate WhatsApp as a CONTACT channel
-- from WhatsApp as a CHECKOUT method (enable_whatsapp_checkout).
--
-- enable_whatsapp_contact: floating button, header nav link, footer number, HeroSection CTA
-- enable_whatsapp_checkout: payment method in checkout modal, "Order via WhatsApp" in cart

ALTER TABLE feature_flags
ADD COLUMN IF NOT EXISTS enable_whatsapp_contact BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN feature_flags.enable_whatsapp_contact IS
  'Shows WhatsApp floating button, header/footer contact links, and HeroSection CTA. Independent from enable_whatsapp_checkout (checkout payment method).';
