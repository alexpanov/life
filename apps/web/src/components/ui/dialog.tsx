import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { X } from "lucide-react";
export function Dialog({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 bg-black/80 z-40" />
        <DialogPrimitive.Content
          className="dialog-surface fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-24px)] max-w-xl max-h-[88dvh] overflow-y-auto border border-slate-600 bg-slate-950 rounded-xl p-6 shadow-2xl"
          aria-describedby={undefined}
        >
          <div className="flex justify-between items-start gap-4">
            <DialogPrimitive.Title className="type-h2">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="p-2 -m-2"
              aria-label="Close dialog"
            >
              <X size={20} />
            </DialogPrimitive.Close>
          </div>
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
