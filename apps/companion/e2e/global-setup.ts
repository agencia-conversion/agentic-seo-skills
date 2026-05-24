import { cpSync, rmSync } from 'node:fs';
import { FIXTURE_SOURCE, PROJECT_ROOT } from './test-constants';

async function globalSetup() {
  rmSync(PROJECT_ROOT, { recursive: true, force: true });
  cpSync(FIXTURE_SOURCE, PROJECT_ROOT, { recursive: true });
}

export default globalSetup;
