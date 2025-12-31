/**
 * Custom implementation of monkey-patching utility
 * Replaces the monkey-around package with a minimal, focused implementation
 */

type AnyFunction = (...args: any[]) => any;

type MethodFactories<T> = {
    [K in keyof T]?: T[K] extends AnyFunction
        ? (next: T[K]) => T[K]
        : never;
};

/**
 * Wrap methods on an object with custom implementations
 * @param obj The object whose methods to wrap
 * @param factories Object mapping method names to wrapper factories
 * @returns Uninstaller function that restores original methods
 */
export function around<T extends object>(
    obj: T,
    factories: MethodFactories<T>
): () => void {
    const originals = new Map<keyof T, AnyFunction>();

    for (const key of Object.keys(factories) as (keyof T)[]) {
        const factory = factories[key];
        if (typeof factory !== "function") continue;

        const original = obj[key];
        if (typeof original !== "function") continue;

        // Store original method
        originals.set(key, original as AnyFunction);

        // Create wrapper using the factory
        const wrapper = factory(original as any);

        // Preserve prototype chain for proper instanceof checks
        Object.setPrototypeOf(wrapper, original);

        // Replace method with wrapper
        (obj as any)[key] = wrapper;
    }

    // Return uninstaller function
    return () => {
        for (const [key, original] of originals) {
            // Only restore if our wrapper is still in place
            const current = obj[key];
            if (typeof current === "function" && current !== original) {
                (obj as any)[key] = original;
            }
        }
        originals.clear();
    };
}
