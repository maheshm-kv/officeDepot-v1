# officeDepotv1 Engineering Constitution
Version: 1.0.0

This document is the supreme engineering authority for the officeDepotv1 project. All code, architecture, and infrastructure decisions must comply with these rules.

## Mission
To build a secure, scalable, and enterprise-grade Salesforce B2B Commerce Proof of Concept (PoC) for Office Depot. The solution will validate core B2B purchasing workflows, enterprise integrations, and Salesforce data model prerequisites using an Out-Of-The-Box (OOTB)-first approach, falling back to Flows, Commerce Extensions, Apex, and LWC only when strictly required.

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

*Assumption Note: The user prompt listed Salesforce technologies (Apex, LWC, etc.) in both the "Compliance/Primary Languages" and "Forbidden" fields. This constitution assumes a data entry error and strictly requires these technologies, forbidding custom alternatives where Salesforce native solutions exist.*

| Category | Technology |
| :--- | :--- |
| **Platform** | Salesforce B2B Commerce (Lightning Web Runtime - LWR) |
| **Backend** | Apex, SOQL, SOSL, Triggers, Salesforce Flows |
| **Frontend** | Lightning Web Components (LWC) |
| **Integrations** | Salesforce REST/SOAP APIs, Commerce Extensions |
| **Tooling** | Salesforce CLI (SFDX), PMD, ESLint, Jest |

**Required Practices:**
*   OOTB-first approach: Standard B2B Commerce capabilities and configuration must be exhausted before custom development.
*   Prerequisite validation: Account, Contact, Buyer User, Buyer Groups, Web Store, Catalog, Products, and Pricing must be configured and validated before UI implementation.

**Forbidden Technologies / Practices:**
*   Plain JavaScript in application code (Use ES6+ / TypeScript standards for LWC).
*   Unmaintained dependencies or unapproved AppExchange packages.
*   Experimental libraries in production without approval.
*   Custom Apex/LWC for functionality natively supported by B2B Commerce OOTB components or Flows.

**Compatibility Targets:**
*   Current Salesforce Release (API Version aligned across all metadata).
*   Modern evergreen browsers (Chrome, Edge, Safari, Firefox).

## Repository Structure
The repository must follow the standard Salesforce DX (SFDX) project structure.

```text
officeDepotv1/
├── config/                     # Scratch org definition files
├── force-app/main/default/     # Primary metadata directory
│   ├── applications/           # App definitions
│   ├── classes/                # Apex Classes (Controllers, Services, Selectors)
│   ├── flexipages/             # Lightning Pages
│   ├── flows/                  # Salesforce Flows
│   ├── lwc/                    # Lightning Web Components
│   ├── objects/                # Custom Objects & Standard Object extensions
│   ├── permissionsets/         # Permission Sets & Buyer Group mappings
│   └── triggers/               # Apex Triggers (One per object)
├── scripts/                    # Apex scripts for data seeding/setup
└── package.json                # Node dependencies for LWC Jest/ESLint
```

## Language/Code Standards
*   **Apex:** Object-Oriented, strictly bulkified. Follow the separation of concerns pattern (Controllers, Service Layer, Selector Layer, Domain Layer).
*   **LWC:** ES6+ syntax. Use `@api` for public properties, `@track` only when mutating complex objects/arrays.
*   **Naming Conventions:**
    *   Apex Classes: `PascalCase` (e.g., `B2BCartService`).
    *   Apex Variables/Methods: `camelCase` (e.g., `calculateTaxes`).
    *   LWC Components: `kebab-case` for files/folders, `camelCase` for JS classes.
    *   Constants: `UPPER_SNAKE_CASE`.
    *   Private variables: Prefix with `_`.
*   **Component/file size limits:** 300 lines target, 500 mandatory refactor.

## Frontend Standards
*   **UI framework & rendering model:** Lightning Web Components (LWC) deployed on Lightning Web Runtime (LWR) B2B Storefronts.
*   **State management preference order:**
    1.  Lightning Data Service (LDS) / Wire Adapters (caching handled by framework).
    2.  LWC reactive properties (`@api`, `@track`).
    3.  Session Storage (for ephemeral cart/checkout state if LDS is insufficient).
*   **Styling approach:** Salesforce Lightning Design System (SLDS).
    *   *Assumption Note: Overrode the ASDF default of Tailwind CSS, as SLDS is the mandatory, idiomatic styling framework for Salesforce LWC and LWR B2B storefronts.*

## Backend / API & Validation Standards
*   **API response contract:** All `@AuraEnabled` Apex methods must return a standardized wrapper class or throw an `AuraHandledException`.
    *   *Assumption Note: Overrode the ASDF default `{ success, data, error }` envelope to align with Salesforce Apex-to-LWC idiomatic patterns.*
    ```java
    public class ResponseWrapper {
        @AuraEnabled public Boolean isSuccess;
        @AuraEnabled public Object data;
        @AuraEnabled public String errorMessage;
    }
    ```
*   **Input/output validation rules:**
    1.  Salesforce Validation Rules (SObject level - preferred).
    2.  Apex custom validation (Service layer).
    3.  LWC frontend validation (UI layer).
*   **Validation library:** Salesforce Native Validation (Validation Rules, Apex `addError`).
    *   *Assumption Note: Overrode the ASDF default of Zod, as Zod cannot be executed within the Salesforce Apex backend.*

## Error Handling
*   **Error categories:** `VALIDATION_ERROR`, `AUTHENTICATION_ERROR`, `AUTHORIZATION_ERROR`, `BUSINESS_ERROR`, `EXTERNAL_SERVICE_ERROR`, `INFRASTRUCTURE_ERROR`, `UNKNOWN_ERROR`.
*   **Handling:** Apex must catch exceptions, log them to a custom `Error_Log__c` object (or equivalent framework), and throw an `AuraHandledException` to the LWC frontend to prevent exposing system details.

## Logging
*   **Required structured log fields:** `event`, `timestamp`, `requestId` (Salesforce Transaction ID), `userId`, `metadata`.
*   **Implementation:** Use a centralized Apex logging framework (e.g., writing to `Error_Log__c` via Platform Events to ensure logs are committed even if the main transaction rolls back).

## Security
*   **Authentication & authorization location:** Must occur server-side via Salesforce Profiles, Permission Sets, Buyer Groups, and Sharing Rules.
*   **Secrets handling:** Must use Salesforce Named Credentials or External Credentials for all outbound integrations (OMS, AS400, Oracle, Payment, Tax). Never hardcode tokens or use standard Environment Variables.
    *   *Assumption Note: Overrode the ASDF default of Environment Variables, as Salesforce requires Named Credentials for secure integration authentication.*
*   **Dependency policy:** Must pass security scan (PMD/SFDX Scanner), Must pass license review, Must be maintained, Prefer building over adding a dependency when smaller.

## Accessibility
*   **Accessibility compliance level:** WCAG 2.1 AA (Salesforce standard). All custom LWCs must utilize semantic HTML and SLDS accessibility attributes (ARIA).

## Performance
*   **Performance budgets:**
    *   Apex: Zero SOQL/DML inside loops (Strictly enforced).
    *   Apex: Must adhere to Salesforce Governor Limits (e.g., < 100 SOQL queries per synchronous transaction).
    *   LWC: Minimize DOM manipulation; rely on LDS caching to reduce server round-trips.

## Testing
*   **Minimum coverage:** 80% minimum overall, 95% for critical business logic (Pricing, Cart, Checkout, Order Creation).
*   **Required test types:**
    *   Apex Unit Tests (with `System.runAs` for Buyer User context).
    *   LWC Jest Tests (Frontend unit testing).
    *   Integration Tests (Mocking external callouts using `HttpCalloutMock`).

## CI/CD
*   **CI gates per PR:**
    *   Lint (PMD for Apex, ESLint for LWC).
    *   Typecheck/Compilation (SFDX metadata validation deployment).
    *   Unit tests (Apex Tests & LWC Jest).

## Documentation
*   **Code Documentation:** ApexDoc for all public/global classes and methods. JSDoc for LWC JavaScript.
*   **Architecture Documentation:** Maintain sequence diagrams for all external enterprise integrations (Sales Cloud, OMS, AS400, Oracle RMS/RPM, PunchOut).
*   **Prerequisite Documentation:** Document the exact Salesforce data setup required to run the PoC (Buyer Groups, Entitlement Policies, Price Books).

## Observability
*   **Observability requirements:** Utilize Salesforce Event Monitoring (if licensed), Debug Logs, and custom integration logging for all callouts to external systems (OMS, Tax, Payment).

## AI Development Rules
*   **AI-generated code policy:** AI code is UNTRUSTED — must be reviewed, tested, validated before merge.
*   **Agent restrictions (each without human approval):** May NOT deploy to production, May NOT rotate credentials, May NOT modify infrastructure, May NOT approve pull requests.

## Prompt / MCP / RAG Standards
*   **Prompt / MCP / RAG governance:** Prompts version-controlled, documented, tested. Prompt changes require review. MCP integrations least-privilege, auditable, revocable. RAG sources trusted, versioned, source-attributed.

## Code Review Standards
*   **Code review questions every PR must answer:**
    1.  What changed?
    2.  Why?
    3.  Risks?
    4.  Rollback plan?
    5.  Testing evidence?
    6.  *Could this have been done OOTB or with a Flow?* (Salesforce specific).

## Git Standards
*   **Branch & commit conventions:**
    *   Branches: `feature/*`, `bugfix/*`, `hotfix/*`, `chore/*`.
    *   Commit types: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`.

## Dependency Rules
*   **Salesforce Packages:** Managed and Unmanaged packages must be vetted for security and governor limit impact before installation in the PoC environment.

## Definition of Done
*   Requirements implemented.
*   Tests written (Apex & Jest).
*   Tests passing.
*   Compilation/Validation deployment passing.
*   Lint passing (PMD & ESLint).
*   Security review completed (CRUD/FLS enforced in Apex).
*   Documentation updated.
*   Accessibility validated.
*   Performance validated (Governor limits checked).
*   Code reviewed.
*   **Salesforce Specific:** Required Profiles, Permission Sets, and Buyer Group mappings updated and documented.

## Non-Negotiable Rules (NEVER / ALWAYS)
*   **NEVER** place SOQL queries or DML statements inside `for` loops.
*   **NEVER** bypass Object and Field-Level Security (CRUD/FLS) in Apex unless explicitly required and documented for a system-level operation (use `WITH SECURITY_ENFORCED`).
*   **ALWAYS** prefer Salesforce OOTB B2B Commerce configuration, Commerce Extensions, or Flows over custom Apex/LWC.
*   **ALWAYS** bulkify Apex Triggers and methods to handle collections of records (up to 200).
*   **ALWAYS** validate Salesforce prerequisites (Account, Contact, Buyer User, Web Store, Catalog) before building custom UI components.

## Amendment Process
Written proposal → architecture review → team approval → version increment.