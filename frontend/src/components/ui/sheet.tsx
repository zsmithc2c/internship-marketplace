// frontend/src/components/ui/sheet.tsx
import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                   Primitives                               */
/* -------------------------------------------------------------------------- */
export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

/* -------------------------------------------------------------------------- */
/*                                   Content                                  */
/* -------------------------------------------------------------------------- */
export function SheetContent({
  className,
  side = "right",
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <Dialog.Portal>
      {/* Backdrop */}
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />

      {/* Slide-over panel */}
      <Dialog.Content
        className={cn(
          "fixed z-50 flex w-full flex-col bg-background shadow-xl transition-all sm:max-w-sm",
          side === "right" &&
            "inset-y-0 right-0 [&[data-state=open]]:animate-in slide-in-from-right-80",
          side === "left" &&
            "inset-y-0 left-0 [&[data-state=open]]:animate-in slide-in-from-left-80",
          side === "top" &&
            "inset-x-0 top-0 h-auto [&[data-state=open]]:animate-in slide-in-from-top-40",
          side === "bottom" &&
            "inset-x-0 bottom-0 h-auto [&[data-state=open]]:animate-in slide-in-from-bottom-40",
          className,
        )}
        {...props}
      >
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Header                                   */
/* -------------------------------------------------------------------------- */
export function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 px-4 py-3", className)} {...props} />
  );
}
SheetHeader.displayName = "SheetHeader";
