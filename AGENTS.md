This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## Product Context

- SIP! (Sistem Informasi Praktikum) is a Sprint 1 mobile prototype for recording practical-class attendance. It demonstrates both assistant (`asisten`) and student (`praktikan`) workflows on one device using shared local dummy state; there is no backend, real authentication, or cross-device sync in scope.
- The required demo flow is: assistant opens a session → student records attendance → assistant reviews the recap → assistant closes the session.
- The PRD is the source of truth for scope, shared data contracts, business rules, and acceptance criteria: [PRD.md](<./PRD>). The UI structure and visual rules are in [LAYOUT.md](./LAYOUT.md). Consult both before changing product behavior or screen design.
- Keep the contract types and reducer-owned business rules consistent across both role views. Attendance is allowed only while a session is open, a student may attend once per session, a closed session cannot be reopened, and the reducer must report success or a failure reason for the UI. Role changes must show shared session and attendance updates immediately; persistence across app restarts is not required.
- Prioritize the required Sprint 1 flows and acceptance criteria. The assistant's course-wide recap is an optional, lower-priority addition; do not let it displace required features or introduce out-of-scope backend, authentication, synchronization, schedule CRUD, QR, or geolocation work.

## UI and Navigation Conventions

- All user-facing text must be in Indonesian. Use responsive Flexbox layouts, safe areas, and scrollable content so screens work on small phones. Every list needs an empty state, and disabled actions must be both visibly disabled and non-interactive.
- Follow the shared light theme and color tokens in `src/constants/theme.ts`; do not hard-code screen colors. Preserve readable text contrast and the specified status meanings for `belum_dibuka`, `dibuka`, and `ditutup`.
- Use Expo Router: role selection leads to the corresponding role's bottom tabs; session details and recaps are stack/detail screens, not visible tabs. Profile actions must support returning to role selection for the two-person demo.
- Reuse shared UI components (status badge, session card, buttons, inputs, confirmation/information modals, and empty states) rather than implementing inconsistent variants. A session card serves both roles and varies its attendance indicator by role.
- Treat existing route files and screens as implementation, not proof that a feature is complete; inspect their current behavior against the PRD and layout guide before extending them.
