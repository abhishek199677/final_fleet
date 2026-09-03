'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface MoneyInputProps {
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  onCurrencyChange?: (currency: string) => void;
  currencies?: string[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS', 'XOF'];

export function MoneyInput({
  value,
  onChange,
  currency = 'USD',
  onCurrencyChange,
  currencies = DEFAULT_CURRENCIES,
  placeholder = '0.00',
  className,
  disabled = false,
}: MoneyInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow only numbers and one decimal point
    const cleaned = raw.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
    onChange(cleaned);
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {onCurrencyChange ? (
        <select
          value={currency}
          onChange={(e) => onCurrencyChange(e.target.value)}
          disabled={disabled}
          className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          {currencies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      ) : (
        <span className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-medium">
          {currency}
        </span>
      )}
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
}
