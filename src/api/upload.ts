import { readAnyPersistedSession, useAuthStore } from '@/app/store/auth-store';
import { ApiError } from './client';

const COOKIE_SESSION_MARKER = '__cookie_session__';
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;

function trimTrailingSlash(value: string): string {
  return String(value || '').replace(/\/+$/, '');
}

function resolveDirectUploadOrigin(): string {
  return trimTrailingSlash(import.meta.env.VITE_DIRECT_UPLOAD_API_ORIGIN || import.meta.env.VITE_AZURE_API_ORIGIN || '');
}

function toApiPath(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/api/')) return path;
  if (path.startsWith('/')) return `/api/v1${path}`;
  return `/api/v1/${path}`;
}

function uploadUrl(path: string): string {
  const apiPath = toApiPath(path);
  if (/^https?:\/\//i.test(apiPath)) return apiPath;

  const directOrigin = resolveDirectUploadOrigin();
  if (directOrigin) return `${directOrigin}${apiPath}`;

  return apiPath;
}

function isCrossOriginUrl(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return false;
  if (typeof window === 'undefined') return true;
  try {
    return new URL(url).origin !== window.location.origin;
  } catch {
    return true;
  }
}

function authSnapshot() {
  const state = useAuthStore.getState();
  if (state?.token || state?.refreshToken || state?.user) return state;
  const persisted = readAnyPersistedSession();
  return { ...state, token: persisted.token, refreshToken: persisted.refreshToken, user: persisted.user };
}

function headersForUpload(): Headers {
  const headers = new Headers();
  const session = authSnapshot();
  const access = session.token;

  if (access && access !== COOKIE_SESSION_MARKER) {
    headers.append('Authorization', `Bearer ${access}`);
  }

  headers.append('Accept', 'application/json');
  return headers;
}

function validateFile(file: File): void {
  if (!(file instanceof File) || file.size <= 0) {
    throw new ApiError('Geen bestand geselecteerd voor upload.', 400);
  }

  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    throw new ApiError('Bestand is groter dan 25MB.', 413);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let details: unknown = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      details = contentType.includes('application/json') ? await response.json() : await response.text();
    } catch {
      details = null;
    }

    console.error('[upload] request failed', {
      status: response.status,
      statusText: response.statusText,
      details,
    });

    const detail = details as { message?: string; error?: string; detail?: string | { message?: string; error?: string } } | null;
    const message =
      typeof details === 'string'
        ? details
        : detail?.message ||
          detail?.error ||
          (typeof detail?.detail === 'string' ? detail.detail : detail?.detail?.message || detail?.detail?.error);

    throw new ApiError(message || response.statusText || 'Upload failed', response.status, details);
  }

  if (response.status === 204) return undefined as T;

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return (await response.json()) as T;

  return (await response.text()) as T;
}

function dedupeFiles(files: File[]): File[] {
  const out: File[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const marker = `${file.name}|${file.size}|${file.lastModified}|${file.type}`;
    if (seen.has(marker)) {
      console.warn('[upload] duplicate file skipped', marker);
      continue;
    }

    seen.add(marker);
    out.push(file);
  }

  return out;
}

export function filesFromInput(input: FormData | File | File[]): File[] {
  if (input instanceof File) {
    validateFile(input);
    return [input];
  }

  if (Array.isArray(input)) {
    return dedupeFiles(
      input.filter((item): item is File => item instanceof File && item.size > 0),
    );
  }

  const files: File[] = [];

  for (const value of input.values()) {
    if (value instanceof File && value.size > 0) {
      validateFile(value);
      files.push(value);
    }
  }

  return dedupeFiles(files);
}

export async function uploadOne<T = unknown>(path: string, file: File, extra?: Record<string, string | number | boolean | null | undefined>): Promise<T> {
  validateFile(file);

  const formData = new FormData();
  formData.append('file', file, file.name);

  if (extra) {
    Object.entries(extra).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      formData.append(key, String(value));
    });
  }

  const url = uploadUrl(path);

  console.info('[upload] starting upload', {
    path,
    fileName: file.name,
    size: file.size,
    type: file.type,
  });

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers: headersForUpload(),
    credentials: 'include',
    mode: isCrossOriginUrl(url) ? 'cors' : 'same-origin',
  });

  console.info('[upload] upload completed', {
    path,
    fileName: file.name,
    status: response.status,
  });

  return parse<T>(response);
}

export async function uploadMany<T = unknown>(path: string, input: FormData | File | File[], extra?: Record<string, string | number | boolean | null | undefined>): Promise<T[]> {
  const files = filesFromInput(input);

  if (!files.length) {
    throw new ApiError('Geen bestand geselecteerd voor upload.', 400);
  }

  const uploaded: T[] = [];

  for (const file of files) {
    uploaded.push(await uploadOne<T>(path, file, extra));
  }

  return uploaded;
}
