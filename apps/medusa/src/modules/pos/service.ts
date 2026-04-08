import { MedusaService } from "@medusajs/framework/utils"
import PosSession from "./models/pos-session"
import PosTransaction from "./models/pos-transaction"
import PosShift from "./models/pos-shift"

/**
 * PosModuleService
 *
 * Extends MedusaService factory to auto-generate CRUD for:
 *   - PosSession: listPosSessions, createPosSessions, etc.
 *   - PosTransaction: listPosTransactions, createPosTransactions, etc.
 *   - PosShift: listPosShifts, createPosShifts, etc.
 *
 * Custom business methods will be added as the POS module matures:
 *   - openShift(operator, terminalId, openingBalance)
 *   - closeShift(shiftId, actualCash, notes)
 *   - processTransaction(sessionId, items, paymentMethod)
 *   - getShiftSummary(shiftId)
 */
class PosModuleService extends MedusaService({
    PosSession,
    PosTransaction,
    PosShift,
}) { }

export default PosModuleService
