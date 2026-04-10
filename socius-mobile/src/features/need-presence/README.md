# Need Presence feature

Screens and UI for **presence / awareness** requests (different from Daily Help). Stack **route names are unchanged**.

## Layout

| Path | Role |
|------|------|
| `screens/requester/` | Person creating the presence request — what’s happening, share location, awareness setup, closure |
| `screens/responder/` | Witness / volunteer side — accept, maps, safety steps, thank-you flows |
| `components/` | `NeedPresenceRequestCard`, `NeedPresenceHistoryCard`, header, incoming modal |

Legacy folder names were `UserNeedPresenceRequest` → **requester**, `UserNeedPresenceRecive` → **responder**.
