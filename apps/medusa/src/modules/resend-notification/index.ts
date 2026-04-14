/**
 * Resend Notification Provider — Module Registration
 *
 * Registers the Resend email provider with Medusa's Notification Module.
 * This is the entry point referenced in medusa-config.ts.
 *
 * @module modules/resend-notification
 */

import ResendNotificationProviderService from "./service"
import {
    ModuleProvider,
    Modules,
} from "@medusajs/framework/utils"

export default ModuleProvider(Modules.NOTIFICATION, {
    services: [ResendNotificationProviderService],
})
