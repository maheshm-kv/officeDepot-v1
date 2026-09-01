# Design: B2B Login & Forgot Password (LWC + Apex)

**Date:** 2026-09-01
**Status:** Approved for implementation
**Governs:** `docs/CONSTITUTION.md` v1.0.0, `docs/specs/office-depot-negocios-b2b-login-spec.md` (ODN-B2B-LOGIN-001)
**Reference UI:** https://negocios.officedepot.com.mx/ofd/es/MXN/login and .../login/form/forgotten (visual capture in progress — see Visual Assets section, filled in once captured, not blocking structural implementation)

## Goal

Build a custom LWC login page and forgot-password page for the Office Depot Negocios B2B Experience Cloud site, replacing the default Commerce login UI while delegating all authentication to native Salesforce mechanisms (`Site.login`, `Site.forgotPassword`). No custom credential storage, hashing, or comparison.

## Resolved Decisions

* **Forgot password:** custom LWC (not a restyle of the standard page) so it matches the reference site pixel-for-pixel.
* **Post-login destination:** site home page (`/`) by default; honor a `startUrl` query parameter when present (deep-link passthrough) so Salesforce-initiated login redirects still work.
* **Experience Builder wiring** (assigning these LWCs as the site's actual Login/Forgot-Password page) is an **admin-console step** (Digital Experiences → Administration → Login & Registration), documented in README, not blind-edited into ExperienceBundle metadata since no existing ExperienceBundle exists in this repo to safely diff against.

## Components

```
force-app/main/default/
├── lwc/
│   ├── b2bLoginForm/
│   │   ├── b2bLoginForm.js
│   │   ├── b2bLoginForm.html
│   │   ├── b2bLoginForm.css
│   │   ├── b2bLoginForm.js-meta.xml
│   │   └── __tests__/b2bLoginForm.test.js
│   └── b2bForgotPassword/
│       ├── b2bForgotPassword.js
│       ├── b2bForgotPassword.html
│       ├── b2bForgotPassword.css
│       ├── b2bForgotPassword.js-meta.xml
│       └── __tests__/b2bForgotPassword.test.js
├── classes/
│   ├── B2BLoginController.cls (+ .cls-meta.xml)
│   ├── B2BLoginControllerTest.cls
│   ├── B2BAuthAdapter.cls              — interface
│   ├── SiteAuthAdapter.cls             — real impl, wraps Site.login/Site.forgotPassword
│   └── B2BLogger.cls                   — structured safe logging utility
├── labels/
│   └── CustomLabels.labels-meta.xml
└── staticresources/
    └── b2bLoginBranding (logo asset + shared CSS custom-properties file)
```

### `b2bLoginForm` (LWC)

* Fields: email (`lightning-input type="email"`), password (`lightning-input type="password"`, toggled to `text`), submit button, forgot-password link (navigates to the Experience Builder page hosting `b2bForgotPassword`).
* `@track` reactive state: `email`, `password`, `passwordVisible`, `isSubmitting`, `errorMessage`.
* Client validation before any Apex call: required email/password, email regex format. Invalid → inline message under the field (from Custom Label), focus moved to first invalid field, **no Apex call**.
* Submit handler: guard on `isSubmitting` (prevents duplicate submit), set `isSubmitting = true`, disable button, imperative call to `B2BLoginController.login({ email, password, startUrl })` where `startUrl` is read from `URLSearchParams` on the current page. Trim whitespace client-side before sending.
* Response handling:
  * `success: true` → `window.location.assign(response.redirectUrl)`.
  * `success: false` → map `errorCode` (`AUTHENTICATION_ERROR` / `EXTERNAL_SERVICE_ERROR` / `UNKNOWN_ERROR`) to the matching Custom Label message, clear the password field, focus it, re-enable the button, set `isSubmitting = false`. Never render `errorMessage` text returned from Apex directly — always map through a fixed label keyed by `errorCode`, so Apex cannot leak details even if it tried.
* Password visibility toggle: icon-button (`lightning-button-icon`), toggles `type` between `password`/`text` by swapping a CSS/template flag, never re-creates or clears the underlying value. `aria-pressed` + `aria-label` reflect state for AT.
* Error boundary: implements `errorCallback` to catch unexpected render errors, shows the generic `UNKNOWN_ERROR` label, logs client-side via a safe wrapper (no `console.log` of any field value).

### `b2bForgotPassword` (LWC)

* Field: email only. Same required + format validation as above.
* Submit → guard duplicate submit → imperative call `B2BLoginController.requestPasswordReset({ email })`.
* Response handling: **always** shows the generic success label (`B2B_ForgotPassword_SuccessMessage`) on `success: true`, regardless of whether the email exists in the org (enumeration guard — constitution NEVER rule, AC-10). Only `EXTERNAL_SERVICE_ERROR` / `UNKNOWN_ERROR` render an error state; those don't reveal existence either.
* Link back to the login page.

### `B2BLoginController.cls`

```
public with sharing class B2BLoginController {
    @AuraEnabled
    public static LoginResult login(String email, String password, String startUrl) { ... }

    @AuraEnabled
    public static LoginResult requestPasswordReset(String email) { ... }
}
```

* `LoginResult` inner class: `success` (Boolean), `redirectUrl` (String), `errorCode` (String enum value), `errorMessage` (String — internal/log use only, LWC does not render this raw).
* Re-validates email format and required fields server-side (defense in depth) before touching the adapter; validation failures return `errorCode = 'VALIDATION_ERROR'`.
* Obtains the adapter via `getAdapter()` — returns `new SiteAuthAdapter()` by default; `@TestVisible` static override field lets tests inject a stub, since `Site.login`/`Site.forgotPassword` require live Site context unavailable in `@isTest`.
* Wraps the adapter call in `try/catch`; any exception → `B2BLogger.logError(...)` (safe fields only, no email/password in the log payload) → return `errorCode = 'UNKNOWN_ERROR'` with the generic constitution-mandated message. Known adapter-signaled auth failures → `AUTHENTICATION_ERROR`. Adapter-signaled platform/service failures → `EXTERNAL_SERVICE_ERROR`.
* Exactly one Apex round-trip per login attempt (constitution performance rule).

### `B2BAuthAdapter.cls` / `SiteAuthAdapter.cls`

* Interface `B2BAuthAdapter { LoginOutcome doLogin(String email, String password, String startUrl); Boolean doForgotPassword(String email); }`.
* `SiteAuthAdapter` is the only implementation that calls real `Site.login` / `Site.forgotPassword` — no logic beyond translating their return/exception behavior into `LoginOutcome`. This is the delegation boundary the constitution requires; it exists purely to make the controller's branching logic unit-testable without a live Site context, not to add any custom auth behavior.

### `B2BLogger.cls`

* Static method `logError(String event, String requestId, Map<String,Object> safeMetadata)` → serializes `{event, timestamp, requestId, metadata}` to JSON via `System.debug`. Caller is responsible for never putting email/password/session tokens into `safeMetadata`; controller code only ever passes error codes and non-PII context.

## Error Handling (maps 1:1 to constitution table)

| errorCode | Trigger | LWC behavior |
|---|---|---|
| `VALIDATION_ERROR` | Client-side only; server re-check exists but should never surface if client validation is correct | Inline field message, no Apex call needed (client), or same label if server catches something client missed |
| `AUTHENTICATION_ERROR` | `Site.login` rejects credentials | Generic "Unable to sign in..." label, password field cleared |
| `AUTHORIZATION_ERROR` | Authenticated but lacks B2B store access | Redirect to safe access-denied state / generic label (reserved for future; not triggered by `Site.login` itself in this PoC scope, kept in the enum for forward compatibility with the constitution's table) |
| `EXTERNAL_SERVICE_ERROR` | Adapter catches platform/network exception | "Service unavailable" label, retry allowed |
| `UNKNOWN_ERROR` | Any uncaught exception | Generic safe label, logged via `B2BLogger` |

## Testing Plan

* **Jest (`b2bLoginForm`, `b2bForgotPassword`):** empty-field validation blocks submit, invalid-email-format validation, password toggle changes `type` without mutating `value`, submit disables button + shows spinner and ignores a second click while `isSubmitting`, each `errorCode` renders its mapped label, success path calls the redirect (assert via a wrapped `window.location` mock or an exposed navigation helper function that tests can spy on).
* **Apex (`B2BLoginControllerTest`):** stub `B2BAuthAdapter` injected via the `@TestVisible` override to cover success, `AUTHENTICATION_ERROR`, `EXTERNAL_SERVICE_ERROR`, and an uncaught-exception → `UNKNOWN_ERROR` path, plus server-side validation rejection paths (empty/malformed email, empty password). Target ≥95% coverage on the controller per constitution (critical business logic).
* **Manual/E2E:** responsive check at desktop/tablet/mobile per AC-11, keyboard-only walkthrough (tab order, Enter/Space on toggle and buttons, focus-on-error) per AC-12.

## Visual Assets

A browser-automation capture of the reference site (colors, exact Spanish copy, logo, spacing) is in progress as of this writing. Once complete, those concrete values are applied to `b2bLoginBranding`'s CSS custom properties and to `CustomLabels.labels-meta.xml` values — a data-fill into the design-token file and label keys already named above, not a change to component logic or file structure.

## Non-Goals (per functional spec's Out of Scope)

Registration, MFA, SSO, social login, checkout/order flows, profile management. Experience Builder page assignment is a documented manual admin step, not automated metadata in this change.
