interface StatCardProps {
    label: string
    value: string | number
    icon: React.ReactNode
    trend?: { value: number; label: string }
    className?: string
}

export default function StatCard({ label, value, icon, trend, className = '' }: StatCardProps) {
    return (
        <div className={`glass rounded-2xl p-5 ${className}`}>
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-sm text-text-muted font-medium">{label}</p>
                    <p className="text-2xl font-bold font-display text-text-primary mt-1">
                        {value}
                    </p>
                    {trend && (
                        <p className={`text-xs mt-1.5 font-medium ${trend.value >= 0 ? 'text-green-600' : 'text-red-500'
                            }`}>
                            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                        </p>
                    )}
                </div>
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                    {icon}
                </div>
            </div>
        </div>
    )
}
