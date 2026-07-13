'use client';

import { useId, useRef, useState, forwardRef } from 'react';
import { CircleXIcon } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export interface InputWithClearProps
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'onChange' | 'onValueChange'
  > {
  label?: string;
  onValueChange?: (value: string) => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showClearButton?: boolean;
  clearButtonAriaLabel?: string;
  className?: string;
  labelClassName?: string;
  containerClassName?: string;
  onClear?: () => void;
}

const InputWithClear = forwardRef<HTMLInputElement, InputWithClearProps>(
  (
    {
      label,
      value: controlledValue,
      defaultValue,
      onValueChange,
      onChange,
      showClearButton = true,
      clearButtonAriaLabel = 'Clear input',
      className,
      labelClassName,
      containerClassName,
      id: propId,
      onClear,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const id = propId || generatedId;
    const inputRef = useRef<HTMLInputElement>(null);
    const combinedRef = (node: HTMLInputElement) => {
      inputRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    // Handle controlled vs uncontrolled state
    const [internalValue, setInternalValue] = useState(defaultValue || '');
    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : internalValue;

    const handleValueChange = (newValue: string) => {
      if (!isControlled) {
        setInternalValue(newValue);
      }
      onValueChange?.(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      handleValueChange(newValue);
      onChange?.(e);
    };

    const handleClearInput = () => {
      handleValueChange('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
      onClear?.();
    };

    const shouldShowClearButton =
      showClearButton && currentValue && currentValue.toString().trim() !== '';

    return (
      <div className={cn('*:not-first:mt-2', containerClassName)}>
        {label && (
          <Label htmlFor={id} className={labelClassName}>
            {label}
          </Label>
        )}
        <div className='relative'>
          <Input
            {...props}
            id={id}
            ref={combinedRef}
            className={cn('pe-9', className)}
            value={currentValue}
            onChange={handleInputChange}
          />
          {shouldShowClearButton && (
            <button
              className='text-muted-foreground/80 hover:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 absolute inset-y-0 end-0 flex h-full w-9 items-center justify-center rounded-e-md transition-[color,box-shadow] outline-none focus:z-10 focus-visible:ring-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50'
              aria-label={clearButtonAriaLabel}
              onClick={handleClearInput}
              type='button'
            >
              <CircleXIcon size={16} aria-hidden='true' />
            </button>
          )}
        </div>
      </div>
    );
  },
);

InputWithClear.displayName = 'InputWithClear';

export default InputWithClear;
