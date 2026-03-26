import { describe, expect, it, beforeEach, vi } from 'vitest'

/**
 * WiFiQRCard tests — Focus on the pure logic (localStorage contracts + QR string format).
 * UI rendering is not tested here because WiFiQRCard uses framer-motion + qrcode.react
 * which require a full browser DOM. The logic functions are extracted for testing.
 */

// ── localStorage mock ──
const store: Record<string, string> = {}
const localStorageMock = {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { for (const k of Object.keys(store)) delete store[k] }),
    length: 0,
    key: vi.fn(() => null),
}
vi.stubGlobal('localStorage', localStorageMock)

const STORAGE_KEY = 'panel-wifi-networks'

// ── Replicate the pure functions from WiFiQRCard ──
// These are the critical contracts we test

interface SavedNetwork {
    id: string
    ssid: string
    password: string
    encryption: 'WPA' | 'WEP' | 'nopass'
    isDefault: boolean
    createdAt: string
}

function loadNetworks(): SavedNetwork[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function saveNetworks(networks: SavedNetwork[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(networks))
}

function generateWifiQR(ssid: string, password: string, encryption: 'WPA' | 'WEP' | 'nopass'): string {
    const escapedSsid = ssid.replace(/[\\;,"]/g, c => `\\${c}`)
    const escapedPassword = password.replace(/[\\;,"]/g, c => `\\${c}`)
    if (encryption === 'nopass') {
        return `WIFI:T:nopass;S:${escapedSsid};;`
    }
    return `WIFI:T:${encryption};S:${escapedSsid};P:${escapedPassword};;`
}

describe('WiFiQRCard — localStorage contract', () => {
    beforeEach(() => {
        localStorageMock.clear()
        localStorageMock.getItem.mockImplementation((key: string) => store[key] ?? null)
        localStorageMock.setItem.mockImplementation((key: string, value: string) => { store[key] = value })
    })

    it('loadNetworks returns empty array when nothing saved', () => {
        expect(loadNetworks()).toEqual([])
    })

    it('saveNetworks persists and loadNetworks retrieves', () => {
        const networks: SavedNetwork[] = [{
            id: 'wifi_1', ssid: 'TestNet', password: 'pass123',
            encryption: 'WPA', isDefault: true, createdAt: new Date().toISOString(),
        }]
        saveNetworks(networks)
        const loaded = loadNetworks()
        expect(loaded).toHaveLength(1)
        expect(loaded[0].ssid).toBe('TestNet')
        expect(loaded[0].isDefault).toBe(true)
    })

    it('supports multiple networks', () => {
        const networks: SavedNetwork[] = [
            { id: 'w1', ssid: 'Net1', password: 'p1', encryption: 'WPA', isDefault: true, createdAt: '' },
            { id: 'w2', ssid: 'Net2', password: 'p2', encryption: 'WEP', isDefault: false, createdAt: '' },
        ]
        saveNetworks(networks)
        expect(loadNetworks()).toHaveLength(2)
    })

    it('delete network removes it from list', () => {
        const networks: SavedNetwork[] = [
            { id: 'w1', ssid: 'Net1', password: 'p1', encryption: 'WPA', isDefault: true, createdAt: '' },
            { id: 'w2', ssid: 'Net2', password: 'p2', encryption: 'WEP', isDefault: false, createdAt: '' },
        ]
        saveNetworks(networks)

        // Simulate delete
        const updated = loadNetworks().filter(n => n.id !== 'w1')
        if (updated.length > 0 && !updated.some(n => n.isDefault)) {
            updated[0].isDefault = true
        }
        saveNetworks(updated)

        const result = loadNetworks()
        expect(result).toHaveLength(1)
        expect(result[0].ssid).toBe('Net2')
        expect(result[0].isDefault).toBe(true) // promoted to default
    })

    it('set default changes isDefault flag', () => {
        const networks: SavedNetwork[] = [
            { id: 'w1', ssid: 'Net1', password: 'p1', encryption: 'WPA', isDefault: true, createdAt: '' },
            { id: 'w2', ssid: 'Net2', password: 'p2', encryption: 'WEP', isDefault: false, createdAt: '' },
        ]
        saveNetworks(networks)

        const updated = loadNetworks().map(n => ({ ...n, isDefault: n.id === 'w2' }))
        saveNetworks(updated)

        const result = loadNetworks()
        expect(result.find(n => n.id === 'w1')?.isDefault).toBe(false)
        expect(result.find(n => n.id === 'w2')?.isDefault).toBe(true)
    })
})

describe('WiFiQRCard — QR string format', () => {
    it('generates WPA QR string', () => {
        const qr = generateWifiQR('MyNetwork', 'mypassword', 'WPA')
        expect(qr).toBe('WIFI:T:WPA;S:MyNetwork;P:mypassword;;')
    })

    it('generates WEP QR string', () => {
        const qr = generateWifiQR('OldNet', 'wepkey', 'WEP')
        expect(qr).toBe('WIFI:T:WEP;S:OldNet;P:wepkey;;')
    })

    it('generates open network QR string (nopass)', () => {
        const qr = generateWifiQR('OpenNet', '', 'nopass')
        expect(qr).toBe('WIFI:T:nopass;S:OpenNet;;')
    })

    it('escapes special characters in SSID', () => {
        const qr = generateWifiQR('My;Net"work', 'pass', 'WPA')
        expect(qr).toContain('My\\;Net\\"work')
    })

    it('escapes special characters in password', () => {
        const qr = generateWifiQR('Net', 'pass;word', 'WPA')
        expect(qr).toContain('P:pass\\;word')
    })
})
