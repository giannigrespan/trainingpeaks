interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div className={`bg-white rounded-xl border border-[var(--color-border)] p-6 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  color?: string;
}

export function StatCard({ title, value, unit, subtitle, color = "var(--color-primary)" }: StatCardProps) {
  return (
    <Card>
      <p className="text-sm text-[var(--color-text-secondary)] mb-1">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-semibold tabular-nums" style={{ color }}>
          {value}
        </span>
        {unit && <span className="text-sm text-[var(--color-text-secondary)]">{unit}</span>}
      </div>
      {subtitle && <p className="text-xs text-[var(--color-text-secondary)] mt-1">{subtitle}</p>}
    </Card>
  );
}
