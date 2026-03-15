const fs = require('fs');
const path = require('path');
const axios = require('axios');

/**
 * 🔄 FORCE SYNC UTILITY
 * Usage: node sync-now.js
 */

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

const buildProjectIssuesMarkdown = (issues) => {
  const openStatuses = new Set(['Pending', 'In Progress']);
  const openIssues = (issues || []).filter((i) => openStatuses.has(i?.status));

  if (openIssues.length === 0) {
    return '# 🎯 Project Issues\n\nNo open issues to fix! Everything is looking good. 🎉';
  }

  let mdContent = `# 🎯 Project Issues (Auto-Sync)\n\n`;
  mdContent += `*Last Updated: ${new Date().toLocaleString()}*\n\n`;
  mdContent += `**Trae AI Instructions:**\n`;
  mdContent += `1. Only work on issues where **AI Automation** is **Enabled**.\n`;
  mdContent += `2. If it's a bug, write a simple Jest test to ensure it doesn't happen again.\n`;
  mdContent += `3. Once fixed, run: \`node socius-automation/resolve.js <ID> "Brief fix description" --test "your_test_code_here"\` to mark it as completed.\n\n`;

  const sorted = [...openIssues].sort((a, b) => {
    const at = new Date(a?.createdAt || 0).getTime();
    const bt = new Date(b?.createdAt || 0).getTime();
    return bt - at;
  });

  for (const [index, issue] of sorted.entries()) {
    mdContent += `## ${index + 1}. ${issue.title}\n`;
    mdContent += `- **ID:** \`${issue._id || issue.id}\`\n`;
    mdContent += `- **Platform:** ${issue.platform || 'N/A'}\n`;
    mdContent += `- **Flow:** ${issue.flow || 'N/A'}\n`;
    mdContent += `- **Category:** ${issue.category || 'N/A'}\n`;
    mdContent += `- **Priority:** ${issue.priority || 'N/A'}\n`;
    mdContent += `- **Status:** ${issue.status || 'N/A'}\n`;
    mdContent += `- **AI Automation:** ${issue.aiEnabled ? 'Enabled ✅' : 'Disabled ❌ (Do not work on this issue)'}\n`;

    if (issue.deviceInfo && (issue.deviceInfo.model || issue.deviceInfo.browser)) {
      mdContent += `- **Device/Env:** ${issue.deviceInfo.model || ''} (${issue.deviceInfo.os || ''}) | Browser: ${issue.deviceInfo.browser || 'N/A'}\n`;
    }

    mdContent += `- **Description:** ${issue.description || ''}\n`;

    if (issue.screenshot) {
      const screenshotRel = String(issue.screenshot).startsWith('/') ? String(issue.screenshot) : `/${issue.screenshot}`;
      const localImagePath = path.join(__dirname, '../socius-backend', screenshotRel.replace(/^\/+/, ''));
      mdContent += `- **Screenshot (Local Path):** \`${localImagePath}\`\n`;
      mdContent += `- **Screenshot (URL):** ${API_BASE_URL}${screenshotRel}\n`;
    }

    mdContent += `\n---\n\n`;
  }

  return mdContent;
};

async function forceSync() {
  try {
    console.log('🔄 Fetching issues and refreshing PROJECT_ISSUES.md...');

    if (!DEVELOPER_EMAIL || !DEVELOPER_PASSWORD) {
      console.error('❌ Sync failed: Missing DEVELOPER_EMAIL or DEVELOPER_PASSWORD in environment.');
      process.exit(1);
    }
    
    const loginRes = await axios.post(`${API_BASE_URL}/api/auth/developer-login`, {
      email: DEVELOPER_EMAIL,
      password: DEVELOPER_PASSWORD
    });
    const token = loginRes.data.data.accessToken;

    const issuesRes = await axios.get(`${API_BASE_URL}/api/admin-issues`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const md = buildProjectIssuesMarkdown(issuesRes?.data?.data || []);
    const outputFile = path.join(__dirname, '../PROJECT_ISSUES.md');
    fs.writeFileSync(outputFile, md);

    console.log('✅ PROJECT_ISSUES.md has been refreshed.');
  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

forceSync();
