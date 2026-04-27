import { cn } from '@/utils/cn';

export function Tabs({ tabs, value, onChange }: { tabs: { value: string; label: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={cn('tab-button', value === tab.value && 'tab-button-active')}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
