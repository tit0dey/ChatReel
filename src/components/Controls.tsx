import type { ReactNode } from 'react';

interface SegmentedOption<T extends string | number> {
  value: T;
  label: string;
  icon?: ReactNode;
}

export function SegmentedControl<T extends string | number>({ value, options, onChange, label }: {
  value: T;
  options: Array<SegmentedOption<T>>;
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          type="button"
          key={String(option.value)}
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.icon}
          <span>{option.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="toggle-row">
      <span className="toggle-copy">
        <span className="field-label">{label}</span>
        {description && <span className="field-help">{description}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
    </label>
  );
}

export function SectionHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="section-header">
      <div>
        <h3>{title}</h3>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
