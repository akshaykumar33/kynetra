import { describe, it, expect } from 'vitest';
import {
  isPlaceholder,
  redact,
  scanContent,
  scanPath,
  scanSize,
  isBinary,
  MAX_FILE_BYTES,
} from './patterns.mjs';

/**
 * Every fixture is assembled at runtime rather than written as a literal, so
 * no credential-shaped string ever exists in this file's source.
 *
 * This is not paranoia. Testing a secret scanner requires secret-shaped
 * inputs, and any scanner pointed at this repository will read the test suite
 * as a leak — ours did, and so did GitGuardian on the first push. Suppression
 * markers would silence the report while leaving the literal in git history
 * forever. Splitting the values means there is nothing to find.
 */
const join = (...parts) => parts.join('');

/** Synthetic credentials. Shaped like the real thing, valid nowhere. */
const FAKE = {
  awsKeyId: join('AKIA', 'Q7RLMN4XPZWD2KVB'),
  anthropic: join('sk-', 'ant-', 'api03-', 'a'.repeat(40)),
  openai: join('sk-', 'T'.repeat(40)),
  githubToken: join('ghp', '_', 'b'.repeat(36)),
  githubPat: join('github', '_pat_', 'c'.repeat(62)),
  slack: join('xoxb', '-123456789012-', 'abcdefghijkl'),
  stripe: join('sk', '_live_', 'd'.repeat(24)),
  google: join('AIza', 'e'.repeat(35)),
  jwt: join('eyJ', 'a'.repeat(20), '.eyJ', 'b'.repeat(20), '.', 'c'.repeat(20)),
  pemRsa: join('-----BEGIN RSA PRIVATE', ' KEY-----'),
  pemOpenssh: join('-----BEGIN OPENSSH PRIVATE', ' KEY-----'),
  strongPassword: join('hX7$kQ2', 'mVn9pLw4z'),
  clientSecret: join('Zt8qR3vB', '1nM6kD0wYsEa'),
  entropicPassword: join('9fKq2Xm', 'Z7vL4pRnT'),
  npmToken: 'f'.repeat(36),
};

describe('scanPath — blocked paths', () => {
  it.each([
    ['.env', 'dotenv'],
    ['apps/web/.env', 'dotenv'],
    ['.env.local', 'dotenv'],
    ['.env.production.local', 'dotenv'],
    ['certs/server.pem', 'private-key-file'],
    ['secrets/tls.key', 'private-key-file'],
    ['bundle.p12', 'private-key-file'],
    ['.ssh/id_rsa', 'ssh-key'],
    ['id_ed25519', 'ssh-key'],
    ['home/.aws/credentials', 'aws-credentials'],
    ['kubeconfig', 'kubeconfig'],
    ['clusters/prod.kubeconfig', 'kubeconfig'],
    ['infrastructure/terraform.tfstate', 'terraform-state'],
    ['infrastructure/terraform.tfstate.backup', 'terraform-state'],
    ['infrastructure/prod.tfvars', 'terraform-vars'],
    ['backups/world.dump', 'database-dump'],
  ])('blocks %s', (path, rule) => {
    const findings = scanPath(path);
    expect(findings.map((f) => f.rule)).toContain(rule);
  });

  it.each([
    '.env.example',
    '.env.sample',
    '.env.template',
    'infrastructure/prod.tfvars.example',
    'packages/contracts/src/world.ts',
    'apps/web/src/app/page.tsx',
    'README.md',
    'docs/07-security/secrets.md',
  ])('allows %s', (path) => {
    expect(scanPath(path)).toEqual([]);
  });

  it('does not block a source file merely for containing "key" in its name', () => {
    expect(scanPath('packages/contracts/src/api-key-contract.ts')).toEqual([]);
  });
});

describe('scanContent — secret values', () => {
  it.each([
    ['aws-access-key-id', `const id = '${FAKE.awsKeyId}';`],
    ['anthropic-api-key', `ANTHROPIC_API_KEY=${FAKE.anthropic}`],
    ['openai-api-key', `const k = "${FAKE.openai}";`],
    ['github-token', `token: '${FAKE.githubToken}'`],
    ['github-pat', `GH_PAT=${FAKE.githubPat}`],
    ['slack-token', `SLACK_BOT_TOKEN=${FAKE.slack}`],
    ['stripe-live-key', `stripe.init('${FAKE.stripe}')`],
    ['google-api-key', `key=${FAKE.google}`],
    ['json-web-token', `Authorization: Bearer ${FAKE.jwt}`],
    ['private-key-block', FAKE.pemRsa],
    ['private-key-block', FAKE.pemOpenssh],
  ])('detects %s', (rule, line) => {
    const findings = scanContent('src/config.ts', line);
    expect(findings.map((f) => f.rule)).toContain(rule);
  });

  it('detects a database URL carrying a real password', () => {
    const findings = scanContent(
      '.env',
      `DATABASE_URL=postgresql://kynetra:${FAKE.strongPassword}@db.internal:5432/world`,
    );
    expect(findings.map((f) => f.rule)).toContain('db-connection-credentials');
  });

  it('detects an npm auth token', () => {
    const findings = scanContent('.npmrc', `//registry.npmjs.org/:_authToken=${FAKE.npmToken}`);
    expect(findings.map((f) => f.rule)).toContain('npm-auth-token');
  });

  it('detects a hardcoded credential assignment', () => {
    const fixture = `const clientSecret = "${FAKE.clientSecret}";`;
    const findings = scanContent('src/client.ts', fixture);
    expect(findings.map((f) => f.rule)).toContain('generic-assigned-secret');
  });

  it('detects a GCP service account key only in JSON files', () => {
    const line = '  "type": "service_account",';
    expect(scanContent('sa.json', line).map((f) => f.rule)).toContain('gcp-service-account');
    expect(scanContent('notes.md', line).map((f) => f.rule)).not.toContain('gcp-service-account');
  });

  it('reports the correct 1-indexed line number', () => {
    const content = ['// header', '', `key = "${FAKE.awsKeyId}"`].join('\n');
    const findings = scanContent('src/a.ts', content);
    expect(findings[0].line).toBe(3);
  });

  it('never echoes the raw secret in its output', () => {
    const findings = scanContent('src/a.ts', `const id = '${FAKE.awsKeyId}';`);
    expect(findings[0].excerpt).not.toContain(FAKE.awsKeyId);
    expect(findings[0].excerpt).toMatch(/\*/);
  });
});

describe('scanContent — false positives', () => {
  it.each([
    'DATABASE_URL=postgresql://user:password@localhost:5432/kynetra',
    'DATABASE_URL=postgres://kynetra:changeme@localhost:5432/kynetra',
    'DATABASE_URL=postgresql://user:${DB_PASSWORD}@localhost:5432/kynetra',
    'ANTHROPIC_API_KEY=',
    'API_KEY=your_api_key_here',
    'password: "<redacted>"',
    'const token = "";',
    // Word-shaped conventions used across our own .env.example
    'DATABASE_URL=postgresql://kynetra_user:kynetra_password@localhost:5432/kynetra_world',
    'DATABASE_URL=mysql://root:CHANGE_ME@localhost:3306/app',
    'client_secret: "your-client-secret"',
  ])('ignores placeholder %s', (line) => {
    expect(scanContent('.env.example', line)).toEqual([]);
  });

  it('still flags a high-entropy value even when the key name looks illustrative', () => {
    const findings = scanContent(
      '.env.example',
      `DATABASE_URL=postgresql://example_user:${FAKE.entropicPassword}@localhost:5432/app`,
    );
    expect(findings.map((f) => f.rule)).toContain('db-connection-credentials');
  });

  it.each([
    'AWS access keys                 AKIA…',
    'Anthropic / OpenAI keys         sk-…, sk-ant-…',
    'GitHub tokens                   ghp_…, gho_…, github_pat_…',
    'Private key blocks              -----BEGIN … PRIVATE KEY-----',
  ])('ignores the truncated documentation example: %s', (line) => {
    expect(scanContent('prompts/starter_prompt.md', line)).toEqual([]);
  });

  it('respects the inline allow marker', () => {
    const line = `const id = '${FAKE.awsKeyId}'; // kynetra-allow-secret`;
    expect(scanContent('src/a.ts', line)).toEqual([]);
  });

  it('skips minified or generated single-line bundles', () => {
    const line = `${'x'.repeat(4100)}${FAKE.awsKeyId}`;
    expect(scanContent('dist/bundle.js', line)).toEqual([]);
  });

  it('does not flag an ordinary short assignment', () => {
    expect(scanContent('src/a.ts', 'const password = "abc";')).toEqual([]);
  });
});

describe('scanSize', () => {
  it('allows files under the limit', () => {
    expect(scanSize('assets/tower.glb', MAX_FILE_BYTES - 1)).toEqual([]);
  });

  it('blocks files at or over the limit', () => {
    const findings = scanSize('assets/tower.glb', MAX_FILE_BYTES + 1);
    expect(findings).toHaveLength(1);
    expect(findings[0].rule).toBe('large-file');
    expect(findings[0].reason).toMatch(/Git LFS/);
  });
});

describe('helpers', () => {
  it('redact keeps only the outer characters', () => {
    expect(redact('ABCDEFGHIJKLMNOP')).toBe('ABCD********MNOP');
  });

  it('redact fully masks short values', () => {
    expect(redact('abc')).toBe('***');
  });

  it('isPlaceholder treats empty and templated values as safe', () => {
    expect(isPlaceholder('')).toBe(true);
    expect(isPlaceholder(undefined)).toBe(true);
    expect(isPlaceholder('${SECRET}')).toBe(true);
    expect(isPlaceholder('Zt8qR3vB1nM6kD0wYsEa')).toBe(false);
  });

  it('isBinary detects NUL bytes', () => {
    expect(isBinary(Buffer.from([0x50, 0x00, 0x4e, 0x47]))).toBe(true);
    expect(isBinary(Buffer.from('plain text', 'utf8'))).toBe(false);
  });
});
