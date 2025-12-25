"use client";

import { Dialog as DialogPrimitive } from "radix-ui";
import type * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

function Sheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      className={cn(
        "fixed inset-0 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      data-slot="sheet-overlay"
      style={{
        background: "oklch(0.05 0.02 270 / 80%)",
        backdropFilter: "blur(4px)",
      }}
      {...props}
    />
  );
}

interface SheetContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: "left" | "right";
}

function SheetContent({
  className,
  children,
  side = "left",
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex h-full flex-col gap-4 shadow-2xl duration-300 ease-out data-[state=open]:animate-in data-[state=closed]:animate-out",
          side === "left" &&
            "left-0 top-0 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left",
          side === "right" &&
            "right-0 top-0 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right",
          className
        )}
        data-slot="sheet-content"
        style={{
          width: "min(85vw, 320px)",
          background: "oklch(0.08 0.02 270 / 95%)",
          backdropFilter: "blur(20px)",
          borderRight:
            side === "left"
              ? "1px solid oklch(0.65 0.25 290 / 20%)"
              : undefined,
          borderLeft:
            side === "right"
              ? "1px solid oklch(0.65 0.25 290 / 20%)"
              : undefined,
          boxShadow:
            side === "left"
              ? "4px 0 30px oklch(0.08 0.02 270 / 60%)"
              : "-4px 0 30px oklch(0.08 0.02 270 / 60%)",
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-full p-1.5 opacity-70 ring-offset-background transition-all hover:opacity-100 hover:bg-sidebar-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          style={{
            color: "oklch(0.65 0.04 280)",
          }}
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 p-4", className)}
      data-slot="sheet-header"
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      data-slot="sheet-footer"
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "font-heading font-semibold text-lg leading-none tracking-tight",
        className
      )}
      data-slot="sheet-title"
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-muted-foreground text-sm", className)}
      data-slot="sheet-description"
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
  SheetTrigger,
};
