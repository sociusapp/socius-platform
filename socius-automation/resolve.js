const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { spawnSync } = require('child_process');

/**
 * 🛠 AI RESOLVE & TEST UTILITY
 * Usage: node resolve.js <ISSUE_ID> "<COMMENT>" [--test "<TEST_CODE>"] [--git-push]
 */

const issueId = process.argv[2];
const comment = process.argv[3] || 'Fixed by Trae AI';
const testArgIdx = process.argv.indexOf('--test');
const testCode = testArgIdx !== -1 ? process.argv[testArgIdx + 1] : null;
const shouldGitPush =
  process.argv.includes('--git-push') ||
  String(process.env.AUTO_GIT_PUSH || '').toLowerCase() === 'true';
const gitRemote = process.env.GIT_REMOTE || 'origin';

const isObjectIdLike = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || '').trim());

const loadEnvFromBackend = () => {
  try {
    const envPath = path.join(__dirname, '../socius-backend/.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    raw.split('\n').forEach((line) => {
      const trimmed = String(line || '').trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const idx = trimmed.indexOf('=');
      if (idx === -1) return;
      const key = trimmed.slice(0, idx).trim();
      let value = trimmed.slice(idx + 1).trim();
      if (!key) return;
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (process.env[key] === undefined) process.env[key] = value;
    });
  } catch {
  }
};

loadEnvFromBackend();

const API_BASE_URL = process.env.SOCIUS_API_URL || 'https://socius-platform-rxjo.onrender.com';
const DEVELOPER_EMAIL = process.env.DEVELOPER_EMAIL;
const DEVELOPER_PASSWORD = process.env.DEVELOPER_PASSWORD;
const API_URL = `${API_BASE_URL}/api/admin-issues/${issueId}/ai-complete`;

const repoRoot = path.join(__dirname, '..');

const runGit = (args) => {
  const res = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' });
  if (res.error) throw res.error;
  if (res.status !== 0) {
    const msg = String(res.stderr || res.stdout || '').trim();
    const err = new Error(msg || `git ${args.join(' ')} failed`);
    err.code = res.status;
    throw err;
  }
  return String(res.stdout || '').trim();
};

const commitAndPushIfNeeded = async () => {
  if (!shouldGitPush) return;

  try {
    runGit(['rev-parse', '--is-inside-work-tree']);
  } catch {
    console.error('❌ Git push requested, but this folder is not a git repository.');
    process.exit(1);
  }

  const status = runGit(['status', '--porcelain']);
  if (!status) {
    console.log('ℹ️ No git changes detected. Skipping commit/push.');
    return;
  }

  const commitMsg = `fix(issue): ${issueId} ${comment}`.trim();

  runGit(['add', '-A']);

  try {
    runGit(['commit', '-m', commitMsg]);
  } catch (err) {
    console.error('❌ Git commit failed:', err.message);
    console.error('ℹ️ Ensure git user.name and user.email are configured for this repo/machine.');
    process.exit(1);
  }

  try {
    runGit(['push', gitRemote, 'HEAD']);
    console.log(`✅ Pushed to ${gitRemote}.`);
  } catch (err) {
    console.error('❌ Git push failed:', err.message);
    console.error('ℹ️ Check remote access/credentials and branch protection rules.');
    process.exit(1);
  }
};

async function resolve() {
  if (!issueId || String(issueId).startsWith('-') || !isObjectIdLike(issueId)) {
    console.error('❌ Error: Please provide a valid Issue ID (24-char hex).');
    console.error('   Example: node resolve.js 69b6a2726618a7bc287844fb "Fixed UI" --git-push');
    process.exit(1);
  }

  try {
    if (!DEVELOPER_EMAIL || !DEVELOPER_PASSWORD) {
      console.error('❌ Error: Missing DEVELOPER_EMAIL or DEVELOPER_PASSWORD in environment.');
      process.exit(1);
    }

    // 1. If test code is provided, save it as a new Jest test file
    if (testCode) {
      console.log('🧪 Generating regression test...');
      const testFileName = `fix-${issueId.substring(0, 8)}.test.js`;
      const testDir = path.join(__dirname, '../socius-backend/src/__tests__/auto-generated');

      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }

      fs.writeFileSync(path.join(testDir, testFileName), testCode);
      console.log(`✅ Test saved to: ${testFileName}`);
    }

    console.log(`🚀 Resolving issue ${issueId}...`);

    // 2. Login (Live API)
    const loginRes = await axios.post(`${API_BASE_URL}/api/auth/developer-login`, {
      email: DEVELOPER_EMAIL,
      password: DEVELOPER_PASSWORD
    });
    const token = loginRes.data.data.accessToken;

    // 3. Update status to Completed
    await axios.post(API_URL, {
      activityText: `${comment}${testCode ? ' (Regression test added)' : ''}`
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log(`✅ Issue ${issueId} marked as Completed.`);
    console.log(`🔄 PROJECT_ISSUES.md will be automatically updated by backend.`);

    if (shouldGitPush) {
      console.log('🔁 Git push enabled: committing & pushing after marking issue as Completed...');
      await commitAndPushIfNeeded();
    }

  } catch (error) {
    console.error('❌ Resolve failed:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

resolve();
