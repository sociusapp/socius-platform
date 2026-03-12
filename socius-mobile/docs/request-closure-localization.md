## Request Closure: English Messaging Audit & Test Plan

### Scope
- Closure start (one party initiated closure, awaiting the other party)
- Final closure (both parties completed closure)
- Auto-closure (system-initiated)
- Chat blocked after closure
- Notification tap navigation

### Message Sources
- Backend push notifications: `request_status` events (`closing`, `closed`)
- Backend realtime socket events: `help:closure_initiated`, `help:request_closed`
- In-app modals (meeting screens) and system messages (chat)

### Localization Mapping Structure
- Centralized English copy builder:
  - `src/utils/closureMessages.js`
  - Inputs: `requestId`, `requestType` (help category), `occurredAt` (ISO timestamp), `reason`, `initiatedBy`
  - Outputs: user-facing `title` and `message` strings (English)

### Maintenance Protocol
- Do not add closure copy inline inside screens/services.
- For any new closure-related UI, import and use `closureMessages.js`.
- Backend must include the following fields in closure socket/push payloads:
  - `requestId`
  - `requestType` (help request category)
  - `occurredAt` (ISO timestamp)
  - `reason` (for closed events)
  - `initiatedBy` (for closure initiated events)

### Manual Test Cases

#### A) Closure Initiated (Realtime)
1. Start a help request and match with a helper.
2. Keep requester on Meeting screen (RequesterMatchingMap).
3. On helper device, start closure.
4. Expected:
   - Requester sees an English modal on the Meeting screen with request category + ID and a timestamp (if provided).
   - Requester chat input becomes disabled and shows an English system message if chat is open.

#### B) Closure Initiated (Notification Only)
1. Keep requester on Home/Community screen (not Meeting screen).
2. On helper device, start closure.
3. Expected:
   - No disruptive in-app modal auto-opens.
   - An Android notification appears (Updates channel) with English text.

#### C) Final Closure (Both Completed)
1. Complete closure on both sides.
2. Expected:
   - Both devices receive `closed` messaging in English.
   - Meeting screen shows English “Request closed” modal and returns user appropriately.

#### D) Auto-Closure
1. Let a request reach its auto-close condition.
2. Expected:
   - Notification and/or UI messaging shows: “Reason: auto closed” in English.

#### E) Send Message After Closure (Error Path)
1. Close the request.
2. Try sending a chat message.
3. Expected:
   - Message send fails.
   - Chat input disables and shows an English system message explaining closure + reason.

#### F) Notification Tap Navigation
1. Trigger closure initiated / closed while app is backgrounded.
2. Tap the notification.
3. Expected:
   - App routes to Meeting screen for `matched/closing`.
   - App routes to Activity for `closed` (as implemented for your navigation).

