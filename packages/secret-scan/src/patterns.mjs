/**
 * Sensitive-data detection rules for Kynetra.
 *
 * Implements the blocked-pattern list in `prompts/starter_prompt.md` §17.4.
 * Deliberately dependency-free ESM so it runs from a fresh clone, inside a
 * git hook, and in CI without an install step.
 *
 * Everything here is a pure function over strings. The CLI in `cli.mjs` owns
 * all git and filesystem access, which is what makes this testable.
 */

/** Marker that suppresses findings on the line containing it. */
export const ALLOW_MARKER = 'kynetra-allow-secret';

/**
 * Path patterns that must never be committed regardless of content.
 * @type {ReadonlyArray<{ id: string, re: RegExp, reason: string, allow?: RegExp }>}
 */
export const BLOCKED_PATHS = [
  {
    id: 'dotenv',
    re: /(^|\/)\.env(\.[A-Za-z0-9_-]+)*$/,
    allow: /(^|\/)\.env\.(example|sample|template|defaults)$/,
    reason:
      'Environment files hold live credentials. Commit .env.example with placeholders instead.',
  },
  {
    id: 'private-key-file',
    re: /\.(pem|key|p12|pfx|jks|keystore|ppk|asc)$/i,
    reason: 'Private key or certificate material.',
  },
  {
    id: 'ssh-key',
    re: /(^|\/)id_(rsa|dsa|ecdsa|ed25519)$/,
    reason: 'SSH private key.',
  },
  {
    id: 'aws-credentials',
    re: /(^|\/)\.aws\/(credentials|config)$/,
    reason: 'AWS credentials file.',
  },
  {
    id: 'kubeconfig',
    re: /(^|\/)(kubeconfig|[^/]*\.kubeconfig)$/,
    reason: 'Kubernetes config embeds cluster credentials.',
  },
  {
    id: 'terraform-state',
    re: /\.tfstate(\.backup)?$/,
    reason: 'Terraform state contains resource secrets in plaintext.',
  },
  {
    id: 'terraform-vars',
    re: /\.tfvars$/,
    allow: /\.example\.tfvars$|\.tfvars\.example$/,
    reason: 'Terraform variable files typically hold secrets. Commit a .tfvars.example instead.',
  },
  {
    id: 'database-dump',
    re: /\.(dump|rdb|sql\.gz|mdb)$/i,
    reason: 'Database dumps may contain production or personal data.',
  },
];

/**
 * Placeholder values that look like secrets but carry no key material.
 * Matched case-insensitively against the captured credential.
 */
const PLACEHOLDER_VALUES = new Set([
  'password',
  'passwd',
  'pass',
  'secret',
  'changeme',
  'change_me',
  'your_password',
  'yourpassword',
  'my_password',
  'placeholder',
  'example',
  'test',
  'dummy',
  'fake',
  'redacted',
  'xxx',
  'xxxx',
  'xxxxxx',
  'todo',
  'none',
  'null',
  'undefined',
]);

/**
 * Words that mark a value as illustrative when it appears as a whole segment
 * of an otherwise word-shaped value (`kynetra_password`, `your-api-key`).
 */
const PLACEHOLDER_WORDS = new Set([
  ...PLACEHOLDER_VALUES,
  'change',
  'me',
  'here',
  'your',
  'my',
  'local',
  'localhost',
  'dev',
  'development',
  'sample',
  'template',
  'token',
  'key',
  'credential',
  'credentials',
  'user',
  'username',
  'admin',
  'demo',
]);

/**
 * True when a value is made only of alphabetic words joined by `_`, `-` or `.`.
 * Real credentials carry entropy — mixed case, digits, symbols — so a value
 * that is purely word-shaped is a documentation placeholder, not a secret.
 * @param {string} value
 */
function isWordShaped(value) {
  return /^[A-Za-z]+(?:[_.-][A-Za-z]+)*$/.test(value);
}

/**
 * True when a captured value is obviously a placeholder rather than a real
 * credential. Without this, documentation and .env.example files would be
 * unscannable, and a scanner people disable is worth nothing.
 * @param {string | undefined} value
 */
export function isPlaceholder(value) {
  if (!value) return true;
  const v = value.trim();
  if (v.length === 0) return true;
  if (PLACEHOLDER_VALUES.has(v.toLowerCase())) return true;
  // Template and interpolation syntax: ${VAR}, {{VAR}}, <VAR>, $VAR, %VAR%
  if (/^[$%{<]/.test(v) || /^\$\{|^\{\{|^<[^>]+>$|^%[^%]+%$/.test(v)) return true;
  // Masked values: ****, ..., xxx-xxx, <redacted>
  if (/^[*.•xX·]+$/.test(v)) return true;
  // Ellipsis-truncated examples, e.g. "AKIA…" or "sk-ant-..."
  if (/[…]|\.\.\.$/.test(v)) return true;
  // Word-shaped conventions: kynetra_password, your-api-key, CHANGE_ME.
  if (isWordShaped(v)) {
    const segments = v.toLowerCase().split(/[_.-]/);
    if (segments.some((s) => PLACEHOLDER_WORDS.has(s))) return true;
  }
  return false;
}

/**
 * Secret value patterns. Each `re` must have the global flag so every
 * occurrence on a line is reported.
 *
 * Lengths are deliberately strict: real credentials have a known shape, and
 * matching loosely would fire on the truncated examples in our own security
 * documentation, which trains people to ignore the scanner.
 *
 * @type {ReadonlyArray<{ id: string, re: RegExp, reason: string, capture?: number }>}
 */
export const SECRET_PATTERNS = [
  {
    id: 'aws-access-key-id',
    re: /\b(?:AKIA|ASIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA)[0-9A-Z]{16}\b/g,
    reason: 'AWS access key ID.',
  },
  {
    id: 'aws-secret-access-key',
    re: /aws_secret_access_key\s*[=:]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/gi,
    capture: 1,
    reason: 'AWS secret access key.',
  },
  {
    id: 'anthropic-api-key',
    re: /\bsk-ant-[A-Za-z0-9_-]{24,}/g,
    reason: 'Anthropic API key.',
  },
  {
    id: 'openai-api-key',
    re: /\bsk-(?:proj-)?[A-Za-z0-9]{32,}\b/g,
    reason: 'OpenAI API key.',
  },
  {
    id: 'github-token',
    re: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/g,
    reason: 'GitHub access token.',
  },
  {
    id: 'github-pat',
    re: /\bgithub_pat_[A-Za-z0-9_]{60,}\b/g,
    reason: 'GitHub fine-grained personal access token.',
  },
  {
    id: 'slack-token',
    re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g,
    reason: 'Slack token.',
  },
  {
    id: 'stripe-live-key',
    re: /\b(?:sk|rk)_live_[A-Za-z0-9]{20,}\b/g,
    reason: 'Stripe live secret key.',
  },
  {
    id: 'google-api-key',
    re: /\bAIza[0-9A-Za-z_-]{35}\b/g,
    reason: 'Google API key.',
  },
  {
    id: 'private-key-block',
    re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/g,
    reason: 'Inline private key block.',
  },
  {
    id: 'json-web-token',
    re: /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/g,
    reason: 'JSON Web Token.',
  },
  {
    id: 'npm-auth-token',
    re: /_authToken\s*=\s*([^\s$][^\s]{10,})/g,
    capture: 1,
    reason: 'npm registry auth token.',
  },
  {
    id: 'db-connection-credentials',
    re: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|mssql):\/\/[^\s:/@]+:([^\s@/]+)@/gi,
    capture: 1,
    reason: 'Database connection string with an embedded password.',
  },
  {
    id: 'generic-assigned-secret',
    re: /(?:api[_-]?key|apikey|secret[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|private[_-]?key|passwd|password)["'\s]*[:=]\s*["']([^"'\s]{12,})["']/gi,
    capture: 1,
    reason: 'Hardcoded credential assignment.',
  },
];

/** Content patterns that only matter in specific files. */
export const CONTEXTUAL_PATTERNS = [
  {
    id: 'gcp-service-account',
    pathRe: /\.json$/i,
    re: /"type"\s*:\s*"service_account"/g,
    reason: 'Google Cloud service account key file.',
  },
];

/**
 * @typedef {object} Finding
 * @property {string} file
 * @property {number} line   1-indexed; 0 when the finding is about the path itself
 * @property {string} rule
 * @property {string} reason
 * @property {string} [excerpt]
 */

/**
 * Check a path against the blocked-path rules.
 * @param {string} filePath posix-style repo-relative path
 * @returns {Finding[]}
 */
export function scanPath(filePath) {
  const findings = [];
  for (const rule of BLOCKED_PATHS) {
    if (rule.allow?.test(filePath)) continue;
    if (rule.re.test(filePath)) {
      findings.push({ file: filePath, line: 0, rule: rule.id, reason: rule.reason });
    }
  }
  return findings;
}

/**
 * Redact a matched secret so the scanner's own output never becomes the leak.
 * @param {string} match
 */
export function redact(match) {
  if (match.length <= 8) return '*'.repeat(match.length);
  return `${match.slice(0, 4)}${'*'.repeat(Math.min(match.length - 8, 24))}${match.slice(-4)}`;
}

/**
 * Scan file content for secret values.
 * @param {string} filePath posix-style repo-relative path
 * @param {string} content
 * @returns {Finding[]}
 */
export function scanContent(filePath, content) {
  const findings = [];
  const lines = content.split(/\r?\n/);

  const applicable = [
    ...SECRET_PATTERNS,
    ...CONTEXTUAL_PATTERNS.filter((p) => p.pathRe.test(filePath)),
  ];

  lines.forEach((line, index) => {
    if (line.includes(ALLOW_MARKER)) return;
    // Extremely long lines are almost always minified or generated output.
    if (line.length > 4000) return;

    for (const rule of applicable) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(line)) !== null) {
        const value = rule.capture ? match[rule.capture] : match[0];
        if (!isPlaceholder(value)) {
          findings.push({
            file: filePath,
            line: index + 1,
            rule: rule.id,
            reason: rule.reason,
            excerpt: redact(value),
          });
        }
        // Guard against zero-length matches looping forever.
        if (match.index === rule.re.lastIndex) rule.re.lastIndex += 1;
      }
    }
  });

  return findings;
}

/** Files at or above this size are rejected unless tracked by Git LFS. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/**
 * @param {string} filePath
 * @param {number} bytes
 * @returns {Finding[]}
 */
export function scanSize(filePath, bytes) {
  if (bytes < MAX_FILE_BYTES) return [];
  const mb = (bytes / 1024 / 1024).toFixed(1);
  return [
    {
      file: filePath,
      line: 0,
      rule: 'large-file',
      reason: `File is ${mb} MB. Files over 5 MB must be tracked by Git LFS.`,
    },
  ];
}

/**
 * True when a buffer looks binary, which we never scan for text patterns.
 * @param {Buffer} buffer
 */
export function isBinary(buffer) {
  const sample = buffer.subarray(0, 8000);
  return sample.includes(0);
}
