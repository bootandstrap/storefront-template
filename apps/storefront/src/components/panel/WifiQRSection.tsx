'use client'

/**
 * WifiQRSection — Standalone WiFi QR generator wrapper.
 *
 * Extracted from UtilitiesClient for use in the Ajustes hub tab.
 * Wraps the existing WiFiQRCard component with matching WifiQrLabels.
 */

import WiFiQRCard from '@/components/panel/WiFiQRCard'

interface WifiQRSectionProps {
    businessName: string
}

export default function WifiQRSection({ businessName }: WifiQRSectionProps) {
    return (
        <WiFiQRCard
            defaultSsid={businessName}
            businessName={businessName}
            labels={{
                title: 'WiFi QR',
                ssid: 'Nombre de red (SSID)',
                password: 'Contraseña',
                encryption: 'Cifrado',
                save: 'Guardar',
                add: 'Añadir red',
                delete: 'Eliminar',
                setDefault: 'Usar por defecto',
                print: 'Imprimir',
                noNetworks: 'No hay redes guardadas',
                detectHint: 'Se detectará automáticamente si estás conectado a WiFi',
                useLast: 'Usar última red',
            }}
        />
    )
}
