import { resolve } from 'node:path';

export const TEST_TOKEN = 'e2e-test-token-12345';
export const TEST_PORT = 3030;
export const FIXTURE_SOURCE = resolve(__dirname, 'fixtures', 'sample-project');
export const PROJECT_ROOT = resolve(__dirname, '.tmp-fixture');
export const PLUGIN_ROOT = resolve(__dirname, '..', '..', '..');
