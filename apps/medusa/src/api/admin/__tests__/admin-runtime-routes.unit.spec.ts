import { GET as getAutomationExecutions } from "../automation/executions/route"
import { GET as getAutomationRules, POST as postAutomationRule } from "../automation/rules/route"
import { GET as getCrmContacts, POST as postCrmContact } from "../crm/contacts/route"
import { GET as getPosSessions, POST as postPosSession } from "../pos/sessions/route"
import { GET as getPosTransactions, POST as postPosTransaction } from "../pos/transactions/route"
import { AUTOMATION_MODULE } from "../../../modules/automation"
import { CRM_MODULE } from "../../../modules/crm"
import { POS_MODULE } from "../../../modules/pos"
import fs from "node:fs"
import path from "node:path"

type MockResponse = {
    status: jest.Mock
    json: jest.Mock
    statusCode?: number
}

function createResponse(): MockResponse {
    const res: MockResponse = {
        status: jest.fn(),
        json: jest.fn(),
    }
    res.status.mockImplementation((code: number) => {
        res.statusCode = code
        return res
    })
    res.json.mockReturnValue(res)
    return res
}

function createRequest(service: unknown, query: Record<string, string> = {}, body: Record<string, unknown> = {}) {
    return {
        query,
        body,
        scope: {
            resolve: jest.fn().mockReturnValue(service),
        },
    } as any
}

const routeSourcePaths = [
    "apps/medusa/src/api/admin/automation/rules/route.ts",
    "apps/medusa/src/api/admin/crm/contacts/route.ts",
    "apps/medusa/src/api/admin/pos/sessions/route.ts",
    "apps/medusa/src/api/admin/custom/route.ts",
    "apps/medusa/src/api/store/custom/route.ts",
] as const

describe("admin/store custom route source contracts", () => {
    it.each(routeSourcePaths)("%s exports a GET route without live payment mutations", (sourcePath) => {
        const source = fs.readFileSync(path.resolve(process.cwd(), "../..", sourcePath), "utf8")

        expect(source).toContain("export async function GET")
        expect(source).not.toMatch(/stripe\.(paymentIntents|refunds|charges|tax\.registrations)\.create/i)
        expect(source).not.toMatch(/process\.env\.[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|TOKEN|PASSWORD)/i)
    })
})

describe("admin automation runtime routes", () => {
    it("GET /admin/automation/executions applies filters and deterministic ordering", async () => {
        const service = { listAutomationExecutions: jest.fn().mockResolvedValue([{ id: "exec_1" }]) }
        const req = createRequest(service, { rule_id: "rule_1", status: "failed" })
        const res = createResponse()

        await getAutomationExecutions(req, res as any)

        expect(req.scope.resolve).toHaveBeenCalledWith(AUTOMATION_MODULE)
        expect(service.listAutomationExecutions).toHaveBeenCalledWith({
            rule_id: "rule_1",
            status: "failed",
        }, {
            order: { created_at: "DESC" },
            take: 200,
        })
        expect(res.json).toHaveBeenCalledWith({ executions: [{ id: "exec_1" }] })
    })

    it("GET /admin/automation/rules maps active status filters", async () => {
        const service = { listAutomationRules: jest.fn().mockResolvedValue([{ id: "rule_1" }]) }
        const req = createRequest(service, { status: "active", trigger_event: "order.placed" })
        const res = createResponse()

        await getAutomationRules(req, res as any)

        expect(req.scope.resolve).toHaveBeenCalledWith(AUTOMATION_MODULE)
        expect(service.listAutomationRules).toHaveBeenCalledWith({
            is_active: true,
            trigger_event: "order.placed",
        }, {
            order: { created_at: "DESC" },
            take: 100,
        })
        expect(res.json).toHaveBeenCalledWith({ rules: [{ id: "rule_1" }] })
    })

    it("POST /admin/automation/rules validates required fields and creates active rules", async () => {
        const service = { createAutomationRules: jest.fn().mockResolvedValue({ id: "rule_1" }) }

        const invalidRes = createResponse()
        await postAutomationRule(createRequest(service, {}, { name: "Missing actions", trigger_event: "cart.abandoned" }), invalidRes as any)
        expect(invalidRes.status).toHaveBeenCalledWith(400)
        expect(service.createAutomationRules).not.toHaveBeenCalled()

        const res = createResponse()
        await postAutomationRule(createRequest(service, {}, {
            name: "Recover carts",
            trigger_event: "cart.abandoned",
            actions: [{ type: "email" }],
        }), res as any)

        expect(service.createAutomationRules).toHaveBeenCalledWith({
            name: "Recover carts",
            trigger_event: "cart.abandoned",
            actions: [{ type: "email" }],
            is_active: true,
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({ rule: { id: "rule_1" } })
    })
})

describe("admin CRM runtime routes", () => {
    it("GET /admin/crm/contacts applies stage and source filters", async () => {
        const service = { listCrmContacts: jest.fn().mockResolvedValue([{ id: "contact_1" }]) }
        const req = createRequest(service, { stage: "lead", source: "form" })
        const res = createResponse()

        await getCrmContacts(req, res as any)

        expect(req.scope.resolve).toHaveBeenCalledWith(CRM_MODULE)
        expect(service.listCrmContacts).toHaveBeenCalledWith({
            stage: "lead",
            source: "form",
        }, {
            order: { created_at: "DESC" },
            take: 200,
        })
        expect(res.json).toHaveBeenCalledWith({ contacts: [{ id: "contact_1" }] })
    })

    it("POST /admin/crm/contacts validates names and applies manual lead defaults", async () => {
        const service = { createCrmContacts: jest.fn().mockResolvedValue({ id: "contact_1" }) }

        const invalidRes = createResponse()
        await postCrmContact(createRequest(service, {}, { first_name: "Ada" }), invalidRes as any)
        expect(invalidRes.status).toHaveBeenCalledWith(400)
        expect(service.createCrmContacts).not.toHaveBeenCalled()

        const res = createResponse()
        await postCrmContact(createRequest(service, {}, {
            first_name: "Ada",
            last_name: "Lovelace",
            email: "ada@example.com",
        }), res as any)

        expect(service.createCrmContacts).toHaveBeenCalledWith({
            first_name: "Ada",
            last_name: "Lovelace",
            email: "ada@example.com",
            stage: "lead",
            source: "manual",
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({ contact: { id: "contact_1" } })
    })
})

describe("admin POS runtime routes", () => {
    it("GET /admin/pos/sessions applies status and terminal filters", async () => {
        const service = { listPosSessions: jest.fn().mockResolvedValue([{ id: "session_1" }]) }
        const req = createRequest(service, { status: "open", terminal_id: "terminal_1" })
        const res = createResponse()

        await getPosSessions(req, res as any)

        expect(req.scope.resolve).toHaveBeenCalledWith(POS_MODULE)
        expect(service.listPosSessions).toHaveBeenCalledWith({
            status: "open",
            terminal_id: "terminal_1",
        }, {
            order: { created_at: "DESC" },
            take: 100,
        })
        expect(res.json).toHaveBeenCalledWith({ sessions: [{ id: "session_1" }] })
    })

    it("POST /admin/pos/sessions requires an operator and opens sessions with defaults", async () => {
        const service = { createPosSessions: jest.fn().mockResolvedValue({ id: "session_1" }) }

        const invalidRes = createResponse()
        await postPosSession(createRequest(service, {}, { terminal_id: "terminal_1" }), invalidRes as any)
        expect(invalidRes.status).toHaveBeenCalledWith(400)
        expect(service.createPosSessions).not.toHaveBeenCalled()

        const res = createResponse()
        await postPosSession(createRequest(service, {}, {
            terminal_id: "terminal_1",
            operator: "owner@example.com",
        }), res as any)

        expect(service.createPosSessions).toHaveBeenCalledWith({
            terminal_id: "terminal_1",
            operator: "owner@example.com",
            status: "open",
            opening_balance: 0,
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({ session: { id: "session_1" } })
    })

    it("GET /admin/pos/transactions applies session and payment filters", async () => {
        const service = { listPosTransactions: jest.fn().mockResolvedValue([{ id: "tx_1" }]) }
        const req = createRequest(service, { session_id: "session_1", payment_method: "cash" })
        const res = createResponse()

        await getPosTransactions(req, res as any)

        expect(req.scope.resolve).toHaveBeenCalledWith(POS_MODULE)
        expect(service.listPosTransactions).toHaveBeenCalledWith({
            session_id: "session_1",
            payment_method: "cash",
        }, {
            order: { created_at: "DESC" },
            take: 200,
        })
        expect(res.json).toHaveBeenCalledWith({ transactions: [{ id: "tx_1" }] })
    })

    it("POST /admin/pos/transactions validates required fields and records completed payments", async () => {
        const service = { createPosTransactions: jest.fn().mockResolvedValue({ id: "tx_1" }) }

        const invalidRes = createResponse()
        await postPosTransaction(createRequest(service, {}, {
            session_id: "session_1",
            amount: 1000,
        }), invalidRes as any)
        expect(invalidRes.status).toHaveBeenCalledWith(400)
        expect(service.createPosTransactions).not.toHaveBeenCalled()

        const res = createResponse()
        await postPosTransaction(createRequest(service, {}, {
            session_id: "session_1",
            order_id: "order_1",
            amount: 1000,
            currency_code: "eur",
            payment_method: "cash",
            receipt_number: "POS-1",
        }), res as any)

        expect(service.createPosTransactions).toHaveBeenCalledWith({
            session_id: "session_1",
            order_id: "order_1",
            amount: 1000,
            currency_code: "eur",
            payment_method: "cash",
            receipt_number: "POS-1",
            status: "completed",
        })
        expect(res.status).toHaveBeenCalledWith(201)
        expect(res.json).toHaveBeenCalledWith({ transaction: { id: "tx_1" } })
    })
})
