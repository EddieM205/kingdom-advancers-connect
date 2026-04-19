"use client"

import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

// ── Mobile detection (coarse pointer = touch device) ──────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = React.useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    const handler = (e) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
}

// ── Context to share open/value state between Select root and SelectContent ───
const SelectInternalContext = React.createContext(null);

// ── Select root — wraps Radix Root; on mobile we intercept open state ─────────
const Select = ({ children, value, defaultValue, onValueChange, open: controlledOpen, onOpenChange: controlledOnOpenChange, ...props }) => {
  const isMobile = useIsMobile();

  const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isValueControlled = value !== undefined;
  const isOpenControlled  = controlledOpen !== undefined;

  const resolvedValue = isValueControlled ? value : internalValue;
  const resolvedOpen  = isOpenControlled  ? controlledOpen : internalOpen;

  const handleOpenChange = React.useCallback((next) => {
    if (!isOpenControlled) setInternalOpen(next);
    controlledOnOpenChange?.(next);
  }, [isOpenControlled, controlledOnOpenChange]);

  const handleValueChange = React.useCallback((next) => {
    if (!isValueControlled) setInternalValue(next);
    onValueChange?.(next);
    if (isMobile) handleOpenChange(false);
  }, [isValueControlled, onValueChange, isMobile, handleOpenChange]);

  const ctx = React.useMemo(() => ({
    isMobile,
    open: resolvedOpen,
    onOpenChange: handleOpenChange,
    value: resolvedValue,
    onValueChange: handleValueChange,
  }), [isMobile, resolvedOpen, handleOpenChange, resolvedValue, handleValueChange]);

  return (
    <SelectInternalContext.Provider value={ctx}>
      <SelectPrimitive.Root
        value={resolvedValue}
        onValueChange={handleValueChange}
        open={isMobile ? false : resolvedOpen}   // on mobile, Radix never opens; drawer takes over
        onOpenChange={isMobile ? undefined : handleOpenChange}
        {...props}
      >
        {children}
      </SelectPrimitive.Root>
    </SelectInternalContext.Provider>
  );
};
Select.displayName = 'Select';

const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

// ── Trigger — on mobile, clicking opens the drawer instead of Radix ───────────
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => {
  const ctx = React.useContext(SelectInternalContext);

  const mobileProps = ctx?.isMobile
    ? {
        onClick: (e) => {
          e.preventDefault();
          ctx.onOpenChange(true);
          props.onClick?.(e);
        },
        // Prevent Radix from capturing the click
        onPointerDown: (e) => e.preventDefault(),
      }
    : {};

  return (
    <SelectPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
        className
      )}
      {...props}
      {...mobileProps}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
})
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName = SelectPrimitive.ScrollDownButton.displayName

// ── SelectContent — Drawer on mobile, Radix popover on desktop ────────────────
const SelectContent = React.forwardRef(({ className, children, position = "popper", ...props }, ref) => {
  const ctx = React.useContext(SelectInternalContext);

  if (ctx?.isMobile) {
    return (
      <Drawer open={ctx.open} onOpenChange={ctx.onOpenChange}>
        <DrawerContent className="max-h-[70vh]">
          <DrawerHeader className="pb-0">
            <DrawerTitle className="sr-only">Select an option</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto px-2 py-2 pb-8">
            <MobileOptionList ctx={ctx}>{children}</MobileOptionList>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={cn(
          "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
          className
        )}
        position={position}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "p-1",
            position === "popper" &&
              "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
})
SelectContent.displayName = SelectPrimitive.Content.displayName

// ── Mobile option list — walks the React children tree ────────────────────────
function MobileOptionList({ children, ctx }) {
  const rows = [];
  extractItems(children, rows, ctx);
  return <div className="space-y-0.5">{rows}</div>;
}

function extractItems(children, out, ctx) {
  React.Children.forEach(children, (child) => {
    if (!child) return;
    const displayName = child.type?.displayName ?? '';

    if (displayName === 'SelectItem') {
      const isSelected = ctx?.value === child.props.value;
      out.push(
        <button
          key={child.props.value}
          type="button"
          onClick={() => ctx?.onValueChange(child.props.value)}
          className={cn(
            "w-full flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors text-left",
            isSelected
              ? "bg-accent text-accent-foreground font-medium"
              : "hover:bg-accent/50"
          )}
        >
          <span>{child.props.children}</span>
          {isSelected && <Check className="h-4 w-4 shrink-0 ml-2" />}
        </button>
      );
    } else if (displayName === 'SelectLabel') {
      out.push(
        <p key={`label-${out.length}`} className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {child.props.children}
        </p>
      );
    } else if (displayName === 'SelectSeparator') {
      out.push(<hr key={`sep-${out.length}`} className="my-1 border-border" />);
    } else if (child.props?.children) {
      extractItems(child.props.children, out, ctx);
    }
  });
}

// ── Standard label / separator ────────────────────────────────────────────────
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("px-2 py-1.5 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
))
SelectItem.displayName = 'SelectItem'

const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = 'SelectSeparator'

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}