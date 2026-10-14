import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes } from 'react';

export function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`ui-card p-4 sm:p-6 ${className}`} {...props} />;
}

export function Button({ className = '', variant = 'primary', type = 'button', ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' }) {
  return <button type={type} className={`ui-button ${variant === 'primary' ? 'bg-primary text-white hover:bg-primary-vivid' : 'border border-primary-light bg-white text-gray-700 hover:bg-primary-light'} ${className}`} {...props} />;
}

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`ui-input ${className}`} {...props} />;
}

// Navigation-style tabs use ordinary buttons, keeping native keyboard behavior.
export function Tabs({ items, value, onChange, label }: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return <div role="group" aria-label={label} className="flex flex-wrap gap-2">
    {items.map(item => <Button key={item.value} aria-pressed={value === item.value}
      variant={value === item.value ? 'primary' : 'secondary'} className="rounded-full"
      onClick={() => onChange(item.value)}>{item.label}</Button>)}
  </div>;
}