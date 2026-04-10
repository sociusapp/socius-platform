# Need Presence feature

Screens and UI for **presence / awareness** requests (different from Daily Help). Stack **route names are unchanged** except the added **`AwarenessShared`** screen.

## Role gating (requester vs helper)

- **`NearbyMap`** derives **requester vs helper UI from the API** (`request.requesterId` vs signed-in user). Route param `mode` is only a fallback until the request loads; wrong params cannot swap dashboards.
- **`PresenceRequestDetail`** (helper “Nearby Request”) **redirects requesters** to **`NearbyMap`** in requester mode.
- **`AwarenessShared`** (requester confirmation) **redirects helpers** to **`NearbyMap`** in helper mode.
- **`SafetyGuidance`** (post-accept helper copy) **redirects the requester** to **`NearbyMap`** requester mode if they land here by mistake.

Utility: `src/utils/presenceRole.js` (`getPresenceRequesterId`, `isCurrentUserPresenceRequester`, `resolvePresenceScreenMode`).

## Layout

| Path | Role |
|------|------|
| `screens/requester/` | Person creating the presence request — what’s happening, disclaimer, share location, success summary, closure |
| `screens/responder/` | Witness / volunteer side — accept, maps, safety steps, thank-you flows |
| `components/` | `NeedPresenceRequestCard`, `NeedPresenceHistoryCard`, header, incoming modal |

Legacy folder names were `UserNeedPresenceRequest` → **requester**, `UserNeedPresenceRecive` → **responder**.

---

## Requester journey (client screens)

Order is fixed so the **disclaimer comes before** location + send, matching the provided designs.

| Step | Screen (route) | What it is | Primary actions → where |
|------|----------------|------------|-------------------------|
| 1 | **WhatsHappening** | Choose a high-level category | Category card → **CreateAwareness** |
| 2 | **CreateAwareness** | Pick a specific situation (sub-item / slug) | List item → **BeforeShare** |
| 3 | **BeforeShare** | “Before You Share” — not emergency dispatch | **Continue to Share** → **ShareLocation** · **Back** → CreateAwareness · **Contact Emergency Services** → **EmergencyHelp** |
| 4 | **ShareLocation** | Optional note, location line, confirm send | **Share Presence Request** → creates request → **AwarenessShared** · **Cancel and go back** → **MainApp** (home) |
| 5 | **AwarenessShared** | “Awareness Shared” — calm confirmation + who responded | **View live map & updates** → **NearbyMap** (requester) · **Cancel awareness** → API cancel → **RequestClosed** · **Contact emergency services** → **EmergencyHelp** |
| 6 | **NearbyMap** | Live map, chips, situation text, authorities (matches “presence active” design) | Existing requester/helper actions (cancel, update situation, etc.) |

**Home shortcuts** (Unsafe walk / Blood needed / Car issue) open **BeforeShare** with the right `reason` / `category`, then **ShareLocation** as above.

## Active session (requester mock — live map)

| Element | Behaviour |
|---------|-----------|
| **NearbyMap** (`mode: 'requester'`) | Header: back · centered **Socius** · **Presence Active** pill. Map shows **only real** accepted helpers (no placeholder markers). |
| **What others see** | Label above multiline field for the situation text; chips and **Contact Authorities** / **Update Situation** / **Cancel Request** unchanged. |

## Incoming request (helper mock — “Nearby Request”)

| Screen (route) | Behaviour |
|----------------|-----------|
| **PresenceRequestDetail** | Map: requester pin + radius, **yellow** pin for your location when GPS available; **distance** line under map (e.g. “120 meters away”). Speech-bubble style **description**. |
| **Go to Help** | `acceptPresence` → **SafetyGuidance** → **NearbyMap** (helper). |
| **Stay Aware** | Same accept API (you’re on the match as a helper) → **NearbyMap** directly, skipping the long guidance step — lighter path from the design. |
| **Not Now** | `declinePresence` then go back. |
| **Navigate / Message / Report** | Opens maps / **ChatModal** / **ReportConcern**. |

## Responder side (related mock)

| Screen (route) | Role |
|----------------|------|
| **MultiplePeople** | “Multiple People Are Aware” — group safety copy for people choosing to help (not the requester success screen). |

`BloodNeeded` / `CarIssue` starter flows use **MultiplePeople** after “I Can Help” so navigation stays on valid stack routes.

---

## Copy for stakeholders (Hinglish summary)

- **Pehle** user category + situation chunte hai, phir **Before You Share** par unko clear karte hain ke ye emergency response nahi hai.  
- Uske **baad** location + optional note, phir **Share**.  
- **Successful share** ke turant baad **Awareness Shared** dikhata hai (community members / waiting state).  
- **Map wala detailed screen** tab khulta hai jab user “View live map & updates” kare — wahi active session + map UI hai.
