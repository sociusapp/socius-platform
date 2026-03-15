# 🤖 Socius Automation

This folder contains automation scripts for the Socius project.

## 🔄 Issue Sync
The `sync.js` script fetches "Pending" issues from the admin panel and creates a `PROJECT_ISSUES.md` file in the project root. This file is used by Trae AI to understand and fix reported issues.

### How to use:
1. Make sure the backend server is running (`cd socius-backend && npm start`).
2. Report an issue via the Admin Panel.
3. **That's it!** The backend will automatically update the `PROJECT_ISSUES.md` file in the project root.
4. Trae AI will immediately see the new issues and can start fixing them.

### Automation Workflow:
1. Report an issue via the Admin Panel.
2. Tell Trae AI: "Fix the issues in PROJECT_ISSUES.md".
3. Trae AI will analyze, fix, and update the status.


## How to command
PROJECT_ISSUES.md check karo aur fix karo.