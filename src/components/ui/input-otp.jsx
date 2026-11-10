import React, { createContext, useContext, useRef } from 'react';
import { cn } from '@/lib/utils';

const OTPContext = createContext(null);

export function InputOTP({ maxLength = 6, value = '', onChange, className, children, ...props }) {
  const inputRef = useRef(null);
  const context = { maxLength, value, inputRef };
  return (
    <OTPContext.Provider value={context}>
      <div className={cn('relative flex items-center', className)} onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          value={value}
          onChange={(event) => onChange?.(event.target.value.replace(/\D/g, '').slice(0, maxLength))}
          maxLength={maxLength}
          autoComplete="one-time-code"
          className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          aria-label="Código de verificação"
          {...props}
        />
        {children}
      </div>
    </OTPContext.Provider>
  );
}

export function InputOTPGroup({ className, ...props }) {
  return <div className={cn('flex items-center gap-2', className)} {...props} />;
}

export function InputOTPSlot({ index, className }) {
  const context = useContext(OTPContext);
  if (!context) throw new Error('InputOTPSlot precisa estar dentro de InputOTP.');
  const focused = context.value.length === index;
  return (
    <div
      className={cn(
        'flex h-11 w-10 items-center justify-center rounded-lg border border-input bg-background text-sm font-medium',
        focused && 'border-ring ring-2 ring-ring/30',
        className,
      )}
      aria-hidden="true"
    >
      {context.value[index] || ''}
    </div>
  );
}
