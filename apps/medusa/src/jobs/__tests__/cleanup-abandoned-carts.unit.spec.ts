import cleanupAbandonedCarts, { config } from "../cleanup-abandoned-carts"

describe("cleanup-abandoned-carts job", () => {
    const logSpy = jest.spyOn(console, "log").mockImplementation()
    const warnSpy = jest.spyOn(console, "warn").mockImplementation()
    const errorSpy = jest.spyOn(console, "error").mockImplementation()

    beforeEach(() => {
        jest.clearAllMocks()
        jest.useFakeTimers().setSystemTime(new Date("2026-07-20T03:00:00.000Z"))
    })

    afterEach(() => {
        jest.useRealTimers()
    })

    afterAll(() => {
        logSpy.mockRestore()
        warnSpy.mockRestore()
        errorSpy.mockRestore()
    })

    function createContainer(cartModule: unknown) {
        return {
            resolve: jest.fn().mockReturnValue(cartModule),
        } as any
    }

    it("runs daily with a stable job identity", () => {
        expect(config).toEqual({
            name: "cleanup-abandoned-carts",
            schedule: "0 3 * * *",
        })
    })

    it("deletes only the listed abandoned cart batch and logs cleanup evidence", async () => {
        const cartModule = {
            listAndCountCarts: jest.fn().mockResolvedValue([
                [{ id: "cart_1" }, { id: "cart_2" }],
                2,
            ]),
            deleteCarts: jest.fn().mockResolvedValue(undefined),
        }

        await cleanupAbandonedCarts(createContainer(cartModule))

        expect(cartModule.listAndCountCarts).toHaveBeenCalledWith({
            created_at: { $lt: "2026-07-13T03:00:00.000Z" },
        }, {
            select: ["id", "created_at"],
            take: 500,
        })
        expect(cartModule.deleteCarts).toHaveBeenCalledWith(["cart_1"])
        expect(cartModule.deleteCarts).toHaveBeenCalledWith(["cart_2"])
        expect(JSON.parse(logSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
            event: "cart_cleanup",
            total_found: 2,
            deleted: 2,
            errors: 0,
        })
    })

    it("continues cleanup when one cart delete fails", async () => {
        const cartModule = {
            listAndCountCarts: jest.fn().mockResolvedValue([
                [{ id: "cart_1" }, { id: "cart_2" }],
                2,
            ]),
            deleteCarts: jest.fn()
                .mockRejectedValueOnce(new Error("locked"))
                .mockResolvedValueOnce(undefined),
        }

        await cleanupAbandonedCarts(createContainer(cartModule))

        expect(cartModule.deleteCarts).toHaveBeenCalledTimes(2)
        expect(JSON.parse(warnSpy.mock.calls[0][0] as string)).toMatchObject({
            event: "cart_cleanup.delete_error",
            cart_id: "cart_1",
            error: "locked",
        })
        expect(JSON.parse(logSpy.mock.calls.at(-1)?.[0] as string)).toMatchObject({
            deleted: 1,
            errors: 1,
        })
    })

    it("logs fatal errors without throwing out of the worker", async () => {
        const cartModule = {
            listAndCountCarts: jest.fn().mockRejectedValue(new Error("database offline")),
        }

        await expect(cleanupAbandonedCarts(createContainer(cartModule))).resolves.toBeUndefined()
        expect(JSON.parse(errorSpy.mock.calls[0][0] as string)).toMatchObject({
            event: "cart_cleanup.fatal",
            error: "database offline",
        })
    })
})
