import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { validateDataForSeo } from '../../../../shared/dataforseo-validate.mjs';

export type DataForSeoMode = 'standard' | 'live' | 'async' | 'offline';

export interface DataForSeoCredentials {
  dataforseo_login: string;
  dataforseo_password: string;
  dataforseo_mode: DataForSeoMode;
  updated_at: string;
}

export interface DataForSeoStatus {
  configured: boolean;
  masked_login: string | null;
  mode: DataForSeoMode | null;
  updated_at: string | null;
  source: string | null;
}

const CREDENTIALS_PATH = join(homedir(), '.agentic-seo', 'credentials.json');
const VALID_MODES: DataForSeoMode[] = ['standard', 'live', 'async', 'offline'];

export function readDataForSeoStatus(): DataForSeoStatus {
  if (!existsSync(CREDENTIALS_PATH)) {
    return { configured: false, masked_login: null, mode: null, updated_at: null, source: null };
  }
  try {
    const data = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8')) as Partial<DataForSeoCredentials>;
    return {
      configured: Boolean(data.dataforseo_login && data.dataforseo_password),
      masked_login: maskSecret(data.dataforseo_login || ''),
      mode: (VALID_MODES as string[]).includes(data.dataforseo_mode || '')
        ? (data.dataforseo_mode as DataForSeoMode)
        : null,
      updated_at: data.updated_at || null,
      source: homeRelative(CREDENTIALS_PATH),
    };
  } catch {
    return { configured: false, masked_login: null, mode: null, updated_at: null, source: null };
  }
}

export interface SaveResult {
  ok: boolean;
  reason?: string;
  validated?: boolean;
  validated_at?: string | null;
  status: DataForSeoStatus;
}

export async function saveDataForSeoCredentials(
  login: string,
  password: string,
  mode: string,
  fetchImpl: typeof fetch = fetch
): Promise<SaveResult> {
  if (!login || !password) {
    return { ok: false, reason: 'missing-credentials', status: readDataForSeoStatus() };
  }
  if (!(VALID_MODES as string[]).includes(mode)) {
    return { ok: false, reason: 'invalid-mode', status: readDataForSeoStatus() };
  }
  const validation = await validateDataForSeo(login, password, mode as DataForSeoMode, fetchImpl);
  if (mode !== 'offline' && !validation.validated) {
    return {
      ok: false,
      reason: `validation-failed: ${validation.reason}`,
      validated: false,
      status: readDataForSeoStatus(),
    };
  }
  mkdirSync(dirname(CREDENTIALS_PATH), { recursive: true });
  const payload: DataForSeoCredentials = {
    dataforseo_login: login,
    dataforseo_password: password,
    dataforseo_mode: mode as DataForSeoMode,
    updated_at: new Date().toISOString(),
  };
  writeFileSync(CREDENTIALS_PATH, JSON.stringify(payload, null, 2));
  chmodSync(CREDENTIALS_PATH, 0o600);
  return {
    ok: true,
    validated: validation.validated,
    validated_at: validation.validated_at ?? null,
    status: readDataForSeoStatus(),
  };
}

function maskSecret(value: string, visible = 4) {
  if (!value) return '';
  if (value.length <= visible) return '*'.repeat(value.length);
  return '*'.repeat(value.length - visible) + value.slice(-visible);
}

function homeRelative(absolute: string) {
  const home = homedir();
  return absolute.startsWith(home) ? '~' + absolute.slice(home.length) : absolute;
}
