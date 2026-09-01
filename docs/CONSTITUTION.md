# Constitution: officeDepotv1 (Version: 1.0.0)

This constitution is the supreme engineering authority for the officeDepotv1 project. It defines the mandatory engineering principles, architecture rules, security requirements, UX expectations, and implementation standards for the Office Depot Negocios B2B Login user story. All developers, AI agents, and automated systems MUST adhere to these rules.

## Mission

To provide registered Office Depot Negocios customers with a secure, responsive, accessible, and maintainable authentication experience using their email address and password, built seamlessly on top of the existing Salesforce B2B Commerce foundation.

## Core Values

1. **Correctness over speed**
2. **Security over convenience**
3. **Simplicity over cleverness**
4. **Maintainability over shortcuts**
5. **Observability over assumptions**
6. **Explicitness over magic**
7. **Automation over manual processes**
8. **Testing over trust**

## Technology Stack

### Required Technologies
*   **Platform:** Salesforce Experience Cloud / B2B Commerce
*   **Frontend:** Lightning Web Components (LWC), HTML5, CSS3
*   **Backend:** Apex, SOQL
*   **Authentication:** Salesforce standard authentication (`Site.login` or equivalent supported platform mechanisms)

### Forbidden Technologies & Practices
*   Plain JavaScript in application code (use LWC standards and ES6+ modules).
*   Unmaintained dependencies.
*   Experimental libraries in production without approval.
*   Custom password hashing, storage, or comparison logic.
*   Direct DOM manipulation outside of LWC lifecycle hooks.

## Repository Structure

The project MUST follow the standard Salesforce DX (SFDX) repository structure.

```text
officeDepotv1/
├── force-app/main/default/
│   ├── classes/          # Apex controllers and test classes
│   ├── lwc/              # Lightning Web Components (Login UI)
│   ├── labels/           # Custom Labels for UI text
│   └── staticresources/  # Approved branding assets
├── config/               # Scratch org definitions
├── scripts/              # Setup and deployment scripts
└── package.json          # Node dependencies for LWC Jest and ESLint
```

## Language/Code Standards

*   **Primary Languages:** JavaScript (ES6+), HTML, CSS, Apex.
*   **Naming Conventions:**
    *   Apex Classes: `PascalCase` (e.g., `B2BLoginController`)
    *   Apex Methods/Variables: `camelCase` (e.g., `authenticateUser`)
    *   LWC Components: `kebab-case` for files/tags (e.g., `b2b-login-form`), `PascalCase` for JS classes.
    *   Constants: `UPPER_SNAKE_CASE`.
*   **Component/File Size Limits:** 300 lines target, 500 mandatory refactor.

## Frontend Standards

*   **Framework:** Lightning Web Components (LWC).
*   **State Management:** Use standard LWC reactive properties (`@track`, `@api`).
*   **Form Controls:** Use `lightning-input` where possible to inherit base accessibility and validation features.
*   **Password Visibility:** Must implement a toggle that changes the input type between `password` and `text` without clearing the entered value.
*   **Duplicate Submission:** The login button MUST be disabled and show a loading state while authentication is in progress.

## Backend/API & Validation Standards

*   **Validation:** Client-side validation MUST occur before server requests. Server-side Apex MUST re-validate inputs.
*   **Authentication Delegation:** Apex controllers MUST delegate authentication to Salesforce (e.g., `Site.login(email, password, startUrl)`).
*   **Data Access:** Apex classes MUST use `with sharing` unless explicitly documented and approved for a specific system-level query.
*   **Separation of Concerns:** Apex handles credential verification routing; it MUST NOT implement custom authentication engines.

## Error Handling

Errors MUST be categorized and handled gracefully without exposing system internals.

| Category | Description | Handling Strategy |
| :--- | :--- | :--- |
| `VALIDATION_ERROR` | Missing or malformed input (e.g., invalid email). | Display inline client-side error. Do not call Apex. |
| `AUTHENTICATION_ERROR` | Invalid credentials. | Display generic "Invalid email or password" message. Do not reveal which field is incorrect. |
| `AUTHORIZATION_ERROR` | User authenticated but lacks B2B store access. | Redirect to a safe "Access Denied" page or display a generic error. |
| `EXTERNAL_SERVICE_ERROR` | Salesforce platform or network failure. | Display a user-friendly "Service unavailable" message. |
| `UNKNOWN_ERROR` | Unexpected exceptions. | Catch globally, log securely, display generic safe message. |

## Logging

*   **Required Structured Log Fields:** `event`, `timestamp`, `requestId`, `userId?`, `metadata?`.
*   **Constraint:** Passwords, session IDs, and authentication tokens MUST NEVER be written to logs, `System.debug`, or client-side `console.log`.
*   **Implementation:** Use a custom Apex logging utility that serializes safe data to JSON for `System.debug` or a custom Log object (ensuring no PII/credentials are included).

## Security

*   **Authentication & Authorization Location:** Must occur server-side via Salesforce platform mechanisms.
*   **Secrets Handling:** From environment variables, from a secret manager (Named Credentials/Custom Metadata in Salesforce), NEVER commit secrets.
*   **Dependency Policy:** Must pass security scan, must pass license review, must be maintained, prefer building over adding a dependency when smaller.
*   **Least Privilege:** The existing Buyer Permission Set MUST NOT be modified to grant unnecessary administrative or object-level access.

## Accessibility

*   **Standard:** WCAG 2.1 AA compliance.
*   **Labels:** All form controls MUST have accessible labels (`aria-label` or associated `<label>`).
*   **Keyboard:** The entire login flow, including the password visibility toggle and password recovery link, MUST be navigable via `Tab` and `Enter`/`Space`.
*   **Focus:** Visible focus states MUST be maintained. Focus MUST be managed logically upon validation errors.

## Performance

*   **LWC Rendering:** Minimize DOM reflows. Use conditional rendering (`lwc:if`) appropriately.
*   **Apex Roundtrips:** Combine server requests where possible. The login action MUST require exactly one Apex call.
*   **Assets:** Branding images MUST be optimized and served via Salesforce Static Resources or a CDN.

## Testing

*   **Minimum Coverage:** 80% minimum overall, 95% for critical business logic (Apex controllers handling login).
*   **Required Test Types:**
    *   **Apex Unit Tests:** Positive/negative credential scenarios, error handling, bulkification (if applicable).
    *   **LWC Jest Tests:** DOM rendering, password toggle behavior, client-side validation logic, error message display.
    *   **Manual/E2E UI Verification:** Responsive layout checks across Desktop, Tablet, and Mobile.
*   **Test Data:** Apex tests MUST create mock users/accounts in memory or use `@isTest(SeeAllData=false)`.

## CI/CD

*   **CI Gates per PR:**
    *   Lint (ESLint for LWC)
    *   Typecheck (*Assumption: Enforced via ESLint and Apex PMD static analysis, as standard LWC does not natively compile TypeScript without custom pipelines*)
    *   Unit tests (Apex & Jest)
    *   Integration tests (if configured for the PoC)

## Documentation

*   **Code Comments:** Use JSDoc for LWC JavaScript and ApexDoc for Apex classes.
*   **README:** The repository MUST contain a `README.md` detailing setup instructions, scratch org creation, and deployment steps for the PoC.
*   **Traceability:** PR descriptions MUST link to the specific user story and acceptance criteria.

## Observability

*   **Monitoring:** Rely on Salesforce Event Monitoring and standard Debug Logs for the PoC phase.
*   **Client-Side:** Implement LWC error boundaries (`errorCallback`) to catch and safely handle unexpected UI component failures.

## AI Development Rules

*   **AI-generated code policy:** AI code is UNTRUSTED — must be reviewed, tested, validated before merge.
*   **Agent restrictions (each without human approval):**
    *   May NOT deploy to production.
    *   May NOT rotate credentials.
    *   May NOT modify infrastructure.
    *   May NOT approve pull requests.

## Prompt / MCP / RAG Standards

*   **Prompts:** Version-controlled, documented, tested. Prompt changes require review.
*   **MCP Integrations:** Least-privilege, auditable, revocable.
*   **RAG Sources:** Trusted, versioned, source-attributed.

## Code Review Standards

Every Pull Request MUST answer the following questions in its description:
1.  What changed?
2.  Why?
3.  Risks?
4.  Rollback plan?
5.  Testing evidence?

## Git Standards

*   **Branch Conventions:** `feature/*`, `bugfix/*`, `hotfix/*`, `chore/*`.
*   **Commit Conventions:** Conventional commits required: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`.

## Dependency Rules

*   No third-party JavaScript libraries (e.g., jQuery, Lodash) may be introduced for this PoC. Standard LWC and ES6+ features are strictly sufficient.
*   Any Salesforce AppExchange packages required for B2B Commerce must be approved by the architecture team.

## Definition of Done

*   Requirements implemented.
*   Tests written.
*   Tests passing.
*   Typecheck / Static Analysis passing.
*   Lint passing.
*   Security review completed (No hardcoded secrets, no custom password storage).
*   Documentation updated.
*   Accessibility validated.
*   Performance validated.
*   Code reviewed.

## Non-Negotiable Rules (NEVER / ALWAYS)

*   **NEVER** store, log, or transmit plaintext passwords outside of the standard HTTPS authentication payload.
*   **NEVER** implement custom password validation or storage in custom Salesforce objects.
*   **NEVER** expose detailed authentication failure reasons (e.g., "Email not found") that enable account enumeration.
*   **ALWAYS** use HTTPS/TLS for all authentication traffic.
*   **ALWAYS** rely on Salesforce-supported authentication mechanisms (`Site.login`).
*   **ALWAYS** sanitize and validate inputs on both the client and server.

## Amendment Process

Written proposal → architecture review → team approval → version increment.