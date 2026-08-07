import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "../utils/cn";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: TooltipPrimitive.TooltipProviderProps) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: TooltipPrimitive.TooltipProps) {
  return <TooltipPrimitive.Root {...props} />;
}

function TooltipTrigger({
  ...props
}: TooltipPrimitive.TooltipTriggerProps) {
  return <TooltipPrimitive.Trigger {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  ...props
}: TooltipPrimitive.TooltipContentProps) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 rounded-lg bg-white px-3 py-1.5 text-xs text-black shadow-lg",
          className
        )}
        {...props}
      >
        {props.children}

        <TooltipPrimitive.Arrow
          className="fill-white shadow-lg"
          width={10}
          height={5}
        />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
};