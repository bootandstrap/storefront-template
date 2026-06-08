/**
 * Email Template Registry — SSOT for all BootandStrap email templates
 *
 * Each template is a React component that receives typed props.
 * The registry maps EmailTemplate → component + default subjects.
 *
 * To add a new template:
 *   1. Create the component in src/emails/
 *   2. Add it to this registry
 *   3. Add the template name to EmailTemplate type in email.ts
 *   4. Add governance entry in TEMPLATE_GOVERNANCE
 *
 * Zone: 🟡 EXTEND — add templates freely
 */

export { loadEmailLayout } from './email-layout-registry'
export { loadEmailTemplate } from './email-template-loaders'
export { DEFAULT_SUBJECTS, getDefaultSubject } from './email-subjects'
export { EMAIL_DESIGNS, getDesignBySlug } from './email-designs'
export type { EmailDesign } from './email-designs'
