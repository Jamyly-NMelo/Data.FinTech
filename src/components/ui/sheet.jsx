import React from 'react';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogContent,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export const Sheet = Dialog;
export const SheetTrigger = DialogTrigger;
export const SheetClose = DialogClose;
export const SheetHeader = DialogHeader;
export const SheetTitle = DialogTitle;
export const SheetDescription = DialogDescription;

export const SheetContent = React.forwardRef(({ className, side = 'right', ...props }, ref) => (
  <DialogContent
    ref={ref}
    className={cn(
      'inset-y-0 h-dvh w-[min(85vw,18rem)] max-w-none translate-x-0 translate-y-0 rounded-none border-y-0 p-0',
      side === 'left' ? 'left-0 border-l-0 border-r' : 'right-0 left-auto border-r-0 border-l',
      className,
    )}
    {...props}
  />
));
SheetContent.displayName = 'SheetContent';
