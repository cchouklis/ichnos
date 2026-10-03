/**
 * Module resolution hook for the unit tests. Application code imports siblings without a file
 * extension (as the Angular compiler requires); Node needs the extension, so this tries `.ts`
 * and `/index.ts` for relative specifiers that fail to resolve as written.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    const relative = specifier.startsWith('./') || specifier.startsWith('../');
    if (!relative || error?.code !== 'ERR_MODULE_NOT_FOUND') throw error;
    for (const suffix of ['.ts', '/index.ts']) {
      try {
        return await nextResolve(specifier + suffix, context);
      } catch {
        // try the next candidate
      }
    }
    throw error;
  }
}
