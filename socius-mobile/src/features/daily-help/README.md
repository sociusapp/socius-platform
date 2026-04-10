# Daily Help (Community) feature

Part of **`src/features/`** — see `../README.md` for how this relates to **Need Presence**.

All screens and UI pieces for **local help requests** (requester flow, volunteer/helper flow, Community tab) live under this folder. React Navigation **route names are unchanged** (e.g. `HelpType`, `MatchingMap`, `RequesterMatchingMap`).

## Layout

| Path | Role |
|------|------|
| `screens/community/` | Community hub: `CommunityScreen`, `CommunityAroundScreen`, `StartConcernScreen` |
| `screens/requester/` | Person asking for help: create request, active request, **`RequesterMatchingMapScreen`** (requester meeting map) |
| `screens/helper/` | Volunteer/helper: incoming request, safety, **`HelperMatchingMapScreen`** (helper meeting map), local list |
| `components/` | Shared modals, cards, `GlobalBorrowOfferItemModal`, `DailyHelpActivePickModalHost` |

## Map screens (two files)

- **`helper/HelperMatchingMapScreen.js`** — registered as stack name **`MatchingMap`**
- **`requester/RequesterMatchingMapScreen.js`** — registered as **`RequesterMatchingMap`**
