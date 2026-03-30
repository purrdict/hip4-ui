/**
 * Popover — thin re-export for local dev + type-checking.
 *
 * In the npm package / local dev, this re-exports from @radix-ui/react-popover.
 * In the shadcn registry output, generate-registry.ts rewrites the import to
 * @/components/ui/popover — so the consumer's own shadcn Popover is used.
 */
"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";

export const Popover = PopoverPrimitive.Root;
export const PopoverTrigger = PopoverPrimitive.Trigger;
export const PopoverContent = PopoverPrimitive.Content;
