import { StatCard } from '@/components/ui/StatCard';

export function KpiStrip({ items }: { items: { title: string; value: string | number; meta?: string }[] }) {
  return (
    <div className="kpi-strip">
      {items.map((item) => (
        <StatCard key={item.title} title={item.title} value={item.value} meta={item.meta} />
      ))}
    </div>
  );
}
