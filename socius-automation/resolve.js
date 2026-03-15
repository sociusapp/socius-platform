const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * 🛠 AI RESOLVE & TEST UTILITY
 * Usage: node resolve.js <ISSUE_ID> "<COMMENT>" [--test "<TEST_CODE>"]
 */

const issueId = process.argv[2];
const comment = process.argv[3] || 'Fixed by Trae AI';
const testArgIdx = process.argv.indexOf('--test');
const testCode = testArgIdx !== -1 ? process.argv[testArgIdx + 1] : null;

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

async function resolve() {
  if (!issueId) {
    console.error('❌ Error: Please provide an Issue ID. Example: node resolve.js 69b6... "Fixed UI"');
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

    // 2. Login
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

  } catch (error) {
    console.error('❌ Resolve failed:', error.message);
    if (error.response) console.error(error.response.data);
  }
}

resolve();
