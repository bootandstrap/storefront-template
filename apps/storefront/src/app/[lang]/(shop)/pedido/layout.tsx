import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Detalle de pedido',
    robots: { index: false },
}

export default function PedidoLayout({ children }: { children: React.ReactNode }) {
    return children
}
