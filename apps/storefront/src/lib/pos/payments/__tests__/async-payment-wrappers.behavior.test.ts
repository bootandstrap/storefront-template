import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  createTerminal: vi.fn(), pollTerminal: vi.fn(), cancelTerminal: vi.fn(), listReaders: vi.fn(),
  createTwint: vi.fn(), pollTwint: vi.fn(), cancelTwint: vi.fn(),
}))

vi.mock('@/app/[lang]/(panel)/panel/pos/actions', () => ({
  createTerminalPaymentAction: mocks.createTerminal,
  pollTerminalPaymentAction: mocks.pollTerminal,
  cancelTerminalActionAction: mocks.cancelTerminal,
  listTerminalReadersAction: mocks.listReaders,
  createTwintPaymentAction: mocks.createTwint,
  pollTwintPaymentAction: mocks.pollTwint,
  cancelTwintPaymentAction: mocks.cancelTwint,
}))

import {
  cancelTerminalPayment, listReaders, pollTerminalStatus, processTerminalPayment,
} from '../stripe-terminal'
import { cancelTwintPayment, pollTwintStatus, processTwintPayment } from '../twint-payment'

describe('POS async payment wrappers (local simulator only)', () => {
  beforeEach(() => vi.clearAllMocks())

  it('starts Terminal presentation without claiming a completed charge', async () => {
    mocks.createTerminal.mockResolvedValue({ success: true, payment_intent_id: 'pi_local' })
    await expect(processTerminalPayment({
      amount: 1250, currency: 'chf', reader_id: 'reader-local',
    })).resolves.toEqual({
      success: false,
      requires_action: 'present_card',
      action_data: { reader_display: 'CHF 12.50', payment_intent_id: 'pi_local' },
    })
  })

  it('propagates Terminal rejection and degrades action transport failures', async () => {
    mocks.createTerminal.mockResolvedValueOnce({ success: false, error: 'reader busy' })
    await expect(processTerminalPayment({ amount: 100, currency: 'chf', reader_id: 'reader' }))
      .resolves.toEqual({ success: false, error: 'reader busy' })
    mocks.createTerminal.mockRejectedValueOnce(new Error('transport down'))
    await expect(processTerminalPayment({ amount: 100, currency: 'chf', reader_id: 'reader' }))
      .resolves.toEqual({ success: false, error: 'transport down' })
  })

  it('polls, cancels, and lists Terminal state with safe fallbacks', async () => {
    mocks.pollTerminal.mockResolvedValue({ status: 'succeeded', payment_intent_id: 'pi_local' })
    mocks.cancelTerminal.mockResolvedValue(true)
    mocks.listReaders.mockResolvedValue([{ id: 'r1', label: 'Local', status: 'online', device_type: 'simulated' }])
    await expect(pollTerminalStatus('r1')).resolves.toMatchObject({ status: 'succeeded' })
    await expect(cancelTerminalPayment('r1')).resolves.toBe(true)
    await expect(listReaders()).resolves.toHaveLength(1)

    mocks.pollTerminal.mockRejectedValue(new Error('offline'))
    mocks.cancelTerminal.mockRejectedValue(new Error('offline'))
    mocks.listReaders.mockRejectedValue(new Error('offline'))
    await expect(pollTerminalStatus('r1')).resolves.toEqual({ status: 'failed', failure_message: 'Poll failed' })
    await expect(cancelTerminalPayment('r1')).resolves.toBe(false)
    await expect(listReaders()).resolves.toEqual([])
  })

  it('starts Twint QR flow without claiming payment success', async () => {
    mocks.createTwint.mockResolvedValue({
      success: true, qr_url: 'data:image/png;base64,local', expires_at: 123, payment_intent_id: 'pi_twint_local',
    })
    await expect(processTwintPayment({ amount: 900, currency: 'chf' })).resolves.toEqual({
      success: false,
      requires_action: 'scan_qr',
      action_data: {
        qr_url: 'data:image/png;base64,local', expires_at: 123, payment_intent_id: 'pi_twint_local',
      },
    })
  })

  it('propagates Twint rejection and supplies poll/cancel fallbacks', async () => {
    mocks.createTwint.mockResolvedValue({ success: false, error: 'not enabled' })
    await expect(processTwintPayment({ amount: 900, currency: 'chf' }))
      .resolves.toEqual({ success: false, error: 'not enabled' })
    mocks.pollTwint.mockResolvedValueOnce({ status: 'processing' })
    mocks.cancelTwint.mockResolvedValueOnce(true)
    await expect(pollTwintStatus('pi')).resolves.toEqual({ status: 'processing' })
    await expect(cancelTwintPayment('pi')).resolves.toBe(true)
    mocks.pollTwint.mockRejectedValue(new Error('offline'))
    mocks.cancelTwint.mockRejectedValue(new Error('offline'))
    await expect(pollTwintStatus('pi')).resolves.toEqual({ status: 'failed', error: 'Poll failed' })
    await expect(cancelTwintPayment('pi')).resolves.toBe(false)
  })
})
