const fs = require('fs');
const path = require('path');
const Issue = require('../models/Issue');
const Log = require('../models/Log');

const syncIssuesToFile = async () => {
  try {
    const issues = await Issue.find({ status: { $in: ['Pending', 'In Progress'] } }).sort({ createdAt: -1 });
    const projectRoot = path.join(__dirname, '../../..'); // Root of the entire project
    const outputFile = path.join(projectRoot, 'PROJECT_ISSUES.md');

    if (issues.length === 0) {
      fs.writeFileSync(outputFile, '# 🎯 Project Issues\n\nNo open issues to fix! Everything is looking good. 🎉');
      return;
    }

    let mdContent = `# 🎯 Project Issues (Auto-Sync)\n\n`;
    mdContent += `*Last Updated: ${new Date().toLocaleString()}*\n\n`;
    mdContent += `**Trae AI Instructions:**\n`;
    mdContent += `1. Only work on issues where **AI Automation** is **Enabled**.\n`;
    mdContent += `2. If it's a bug, write a simple Jest test to ensure it doesn't happen again.\n`;
    mdContent += `3. Once fixed, run: \`node socius-automation/resolve.js <ID> "Brief fix description" --test "your_test_code_here"\` to mark it as completed.\n\n`;

    for (const [index, issue] of issues.entries()) {
      mdContent += `## ${index + 1}. ${issue.title}\n`;
      mdContent += `- **ID:** \`${issue._id}\`\n`;
      mdContent += `- **Platform:** ${issue.platform}\n`;
      mdContent += `- **Flow:** ${issue.flow}\n`;
      mdContent += `- **Category:** ${issue.category}\n`;
      mdContent += `- **Priority:** ${issue.priority}\n`;
      mdContent += `- **Status:** ${issue.status}\n`;
      mdContent += `- **AI Automation:** ${issue.aiEnabled ? 'Enabled ✅' : 'Disabled ❌ (Do not work on this issue)'}\n`;
      if (issue.deviceInfo && (issue.deviceInfo.model || issue.deviceInfo.browser)) {
        mdContent += `- **Device/Env:** ${issue.deviceInfo.model || ''} (${issue.deviceInfo.os || ''}) | Browser: ${issue.deviceInfo.browser || 'N/A'}\n`;
      }
      mdContent += `- **Description:** ${issue.description}\n`;

      if (!issue.aiEnabled) {
        mdContent += `\n---\n\n`;
        continue;
      }

      if (issue.transcript) {
        mdContent += `- **Voice Transcript:** *"${issue.transcript}"*\n`;
      }

      // 🪵 SMART LOG ATTACHMENT
      // Fetch logs around the time the issue ACTUALLY occurred
      const targetTime = issue.occurredAt || issue.createdAt;
      const fiveMinsAgo = new Date(targetTime.getTime() - 5 * 60 * 1000);
      const fiveMinsAfter = new Date(targetTime.getTime() + 5 * 60 * 1000);

      // Basic time-based search
      let relatedLogs = await Log.find({
        level: 'error',
        createdAt: { $gte: fiveMinsAgo, $lte: fiveMinsAfter }
      }).sort({ createdAt: -1 }).limit(5);

      // If no logs found by time, try keyword search (e.g., 'Login', 'OTP' from description)
      if (relatedLogs.length === 0) {
        const keywords = ['Login', 'OTP', 'Auth', 'Verification', 'Call', 'Map', 'Chat'];
        const foundKeywords = keywords.filter(k =>
          issue.description.toLowerCase().includes(k.toLowerCase()) ||
          (issue.transcript && issue.transcript.toLowerCase().includes(k.toLowerCase()))
        );

        if (foundKeywords.length > 0) {
          relatedLogs = await Log.find({
            level: 'error',
            message: { $regex: foundKeywords.join('|'), $options: 'i' }
          }).sort({ createdAt: -1 }).limit(3);
        }
      }

      if (relatedLogs.length > 0) {
        mdContent += `### 🪵 Related System Logs (Contextual Match):\n`;
        relatedLogs.forEach(log => {
          mdContent += `> **[${new Date(log.createdAt).toLocaleString()}]** ${log.method || ''} ${log.url || ''}\n`;
          mdContent += `> **Error:** ${log.message}\n`;
          if (log.body && Object.keys(log.body).length > 0) {
            mdContent += `> **Request Data:** \`${JSON.stringify(log.body)}\`\n`;
          }
          mdContent += `>\n`;
        });
      }

      if (issue.voiceNote) {
        mdContent += `- **Voice Note (URL):** http://127.0.0.1:48080${issue.voiceNote}\n`;
      }

      if (issue.screenshot) {
        const localImagePath = path.join(__dirname, '../../', issue.screenshot);
        mdContent += `- **Screenshot (Local Path):** \`${localImagePath}\`\n`;
        mdContent += `- **Screenshot (URL):** http://127.0.0.1:48080${issue.screenshot}\n`;
      }
      mdContent += `\n---\n\n`;
    }

    fs.writeFileSync(outputFile, mdContent);
    console.log(`[Auto-Sync] Updated PROJECT_ISSUES.md with ${issues.length} open issues.`);
  } catch (error) {
    console.error('[Auto-Sync Error] Failed to sync issues to file:', error.message);
  }
};

module.exports = { syncIssuesToFile };
