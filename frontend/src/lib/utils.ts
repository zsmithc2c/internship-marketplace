import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Tailwind-aware cn() helper (shadcn style) */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
