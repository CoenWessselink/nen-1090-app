/**
 * FIXED helpers.ts
 * Removed invalid Python-style syntax and replaced with valid JS/TS
 */

export function isWriteMethod(method: string): boolean {
  return ["PATCH", "PUT"].includes(method.toUpperCase());
}

// example usage in route handler
export function handleMethod(method: string) {
  if (isWriteMethod(method)) {
    return true;
  }
  return false;
}