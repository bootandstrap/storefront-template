import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge({
    extend: {
        theme: {
            text: ["display-xs", "display-sm", "display-md", "display-lg", "display-xl", "display-2xl"],
        },
    },
});

/**
 * Merge and deduplicate Tailwind CSS classes.
 * Wrapper around tailwind-merge with UUI display text sizes registered.
 */
export const cx = twMerge;

/**
 * Identity function that enables Tailwind IntelliSense
 * sorting support inside style object literals.
 */
export function sortCx<T extends Record<string, string | number | Record<string, string | number | Record<string, string | number>>>>(classes: T): T {
    return classes;
}
