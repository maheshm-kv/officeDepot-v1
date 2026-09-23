# OfficeDepot_V3 Engineering Constitution
Version: 1.0.0

## Mission
Build and validate an enterprise-grade Office Depot Salesforce B2B Commerce Proof of Concept (PoC). The solution must prioritize Salesforce standard out-of-the-box (OOTB) capabilities, strictly validate architectural dependencies, and establish clear Systems of Record. ASDF shall be utilized as the implementation framework to produce a complete, secure, maintainable, and integration-ready B2B Commerce experience that seamlessly connects the customer journey from onboarding to fulfillment.

## Core Values
1. **OOTB over Customization**: The decision hierarchy is strictly: OOTB → Configuration → Flow → Supported Custom Action / Extension → Apex / API / LWC.
2. **Validation over Assumption**: Never assume prerequisites (e.g., Buyer Groups, Entitlements, Licenses) exist. Validate the complete dependency chain before creation.
3. **Security over Convenience**: Enforce authorization at the data and controller layers (Profiles, Permission Sets, Sharing Rules). Never rely solely on UI visibility (e.g., hiding a tile) for security.
4. **Single Source of Truth**: Clearly define and respect the System of Record for all data domains (Customer, Product, Price, Inventory, Order). Do not duplicate business logic across systems.
5. **Correctness over Speed**: Ensure accurate metadata, correct object relationships, and proper error handling.
6. **Observability over Assumptions**: Log integrations, track correlation IDs, and monitor failures systematically.

## Technology Stack

### Required Technologies
*   **Core Platform**: Salesforce B2B Commerce, Experience Cloud (LWR), Sales Cloud, Service Cloud.
*   **Languages**: JavaScript (ES6+), Apex, LWC (Lightning Web Components), Aura Components, Visualforce (only where legacy support is strictly required).
*   **CMS / Content**: Salesforce CMS, Contentful, Sanity, Strapi, WordPress, Webflow, Storyblok, Sitecore.
*   **Integrations**: External OMS, ERP / AS400, Oracle RMS, Oracle RPM, PunchOut / Procurement systems.

### Forbidden Technologies & Practices
*   Plain JavaScript in application code (use strict ES6+ or TypeScript where applicable in LWC).
*   Unmaintained dependencies or experimental libraries in production without approval.
*   Custom Apex/LWC/Flow when a standard Salesforce B2B Commerce OOTB feature exists.
*   Direct DOM manipulation in LWC (always use standard LWC data binding).
*   Hardcoding IDs, credentials, or environment-specific variables.

### Compatibility Targets
*   **Browsers**: Salesforce-supported modern browsers (latest Chrome, Firefox, Safari, Edge).
*   **Mobile**: Responsive design via Experience Cloud standard breakpoints.

## Repository Structure
*(Assumption: Substituted generic web structure with Salesforce DX (SFDX) idiomatic structure as required by the platform.)*

```text
office-depot-v3/
├── asdf/
│   ├── constitution.md       # Business goals and capabilities
│   ├── requirement.md        # Implementation rules and constraints
│   └── specification.md      # Exact Salesforce configurations and metadata
├── force-app/main/default/
│   ├── classes/              # Apex Controllers, Services, and Batch classes
│   ├── flows/                # Salesforce Flows
│   ├── lwc/                  # Lightning Web Components
│   ├── aura/                 # Aura Components
│   ├── objects/              # Custom Objects and Object overrides
│   ├── permissionsets/       # Permission Sets and Permission Set Groups
│   ├── profiles/             # Profiles
│   └── experiences/          # Experience Cloud site metadata
├── scripts/                  # Build, deployment, and data loading scripts
├── config/                   # project-scratch-def.json, etc.
└── package.json              # Node dependencies for linting/testing
```

## Language/Code Standards
*   **Naming Conventions**:
    *   Apex Classes: PascalCase (e.g., `B2BCartService`, `OrderIntegrationBatch`).
    *   LWC: camelCase for folder/files (e.g., `b2bProductDetail`), PascalCase for class names.
    *   Custom Objects/Fields: PascalCase with `__c` suffix (e.g., `CreditLimit__c`).
    *   Constants: UPPER_SNAKE_CASE.
*   **Component/File Size Limits**: 300 lines target, 500 mandatory refactor.
*   **Apex Standards**: Bulkify all triggers and SOQL queries. No SOQL or DML inside loops. Use a centralized Trigger Framework.

## Frontend Standards
*   **UI Framework & Rendering Model**: Salesforce Lightning Web Components (LWC) on Lightning Web Runtime (LWR) for Experience Cloud.
*   **State Management Preference Order**: *(Assumption: Substituted React/Zustand defaults with Salesforce LWC idiomatic state management.)*
    1. LWC Wire Service (Lightning Data Service)
    2. Standard `@track` / `@api` reactive properties
    3. Lightning Message Service (LMS) for cross-DOM communication
    4. Custom Apex Controllers (imperative calls)
*   **Styling Approach**: *(Assumption: Substituted Tailwind CSS with Salesforce Lightning Design System (SLDS) as it is the mandatory standard for native Salesforce UI consistency.)* Use standard SLDS classes. Custom CSS must be scoped and minimized.

## Backend/API & Validation Standards
*   **API Response Contract**:
    *   For custom Apex REST APIs and `@AuraEnabled` methods, use the ASDF envelope: `{ success: boolean, data?: any, error?: { code: string, message: string } }`.
    *   For standard Salesforce Commerce APIs, adhere to the native Salesforce response contract.
*   **Input/Output Validation Rules**: Validate all route handlers, server actions, forms, query strings, webhooks, and environment variables.
*   **Validation Library**: *(Assumption: Substituted Zod with Salesforce native validation mechanisms.)* Use Salesforce standard Validation Rules, SObject field constraints, and Apex custom validation logic.

## Error Handling
*   **Apex/LWC**: Throw `AuraHandledException` for LWC consumption. Never expose raw stack traces to the frontend.
*   **Integration**: Implement retry mechanisms, idempotency checks, and correlation IDs for all external callouts (OMS, ERP, Tax).

| Category | Description |
| :--- | :--- |
| `VALIDATION_ERROR` | Invalid input, missing required fields, PO format errors. |
| `AUTHENTICATION_ERROR` | Invalid login, session expiration. |
| `AUTHORIZATION_ERROR` | Insufficient permissions, invalid Buyer Group, unauthorized OOBO attempt. |
| `BUSINESS_ERROR` | Credit limit exceeded, inventory unavailable, approval rejected. |
| `EXTERNAL_SERVICE_ERROR` | OMS, ERP, or Tax provider timeout/failure. |
| `INFRASTRUCTURE_ERROR` | Salesforce platform limits (SOQL/DML) exceeded. |
| `UNKNOWN_ERROR` | Unhandled exceptions. |

## Logging
*   **Required Structured Log Fields**: `event`, `timestamp`, `requestId`, `userId` (optional), `metadata` (optional).
*   **Implementation**: Use a custom `Log__c` object or Platform Events for persistent error tracking, especially for integration failures.
*   **External Systems**: Pass Correlation IDs between Salesforce and external systems (OMS/ERP) to trace end-to-end transactions.

## Security
*   **Authentication & Authorization**: Must occur server-side. Enforce Object (CRUD), Field (FLS), and Record-level (Sharing) security in all Apex controllers using `WITH SECURITY_ENFORCED` or `Schema.Describe` checks.
*   **B2B Access**: Strictly control access via Profiles, Permission Sets, Permission Set Groups, and Buyer Groups. Standard buyers must never access administrative capabilities.
*   **Secrets Handling**: From environment variables (Named Credentials / External Credentials in Salesforce), from a secret manager, never commit secrets to version control.
*   **Dependency Policy**: Must pass security scan, must pass license review, must be maintained, prefer building over adding a dependency when smaller.

## Accessibility
*   **Compliance Level**: WCAG 2.2 AA (Salesforce standard).
*   **Implementation**: Ensure all custom LWC components utilize semantic HTML, ARIA attributes, and keyboard navigation matching standard SLDS components.

## Performance
*   **Frontend Budgets**: LCP < 2.5s / CLS < 0.1 / INP < 200ms (Experience Cloud LWR targets).
*   **Backend Budgets**: Strict adherence to Salesforce Governor Limits (100 SOQL queries per synchronous transaction, 150 DML statements).

## Testing
*   **Minimum Coverage**: 80% minimum overall, 95% for critical business logic (Pricing, Tax, Checkout, Integrations).
*   **Required Test Types**:
    *   Apex Unit Tests (with `System.runAs` for permission testing).
    *   LWC Jest Tests (positive, negative, and DOM validation).
    *   ASDF Accuracy Testing (validating generated configurations against actual Salesforce org behavior).
    *   Integration Mocks (using `HttpCalloutMock`).
*   **Test Scenarios**: Must include positive, negative, unauthorized access, Buyer Group visibility, payment failures, and partial fulfillment scenarios.

## CI/CD
*   **CI Gates per PR**: Lint (ESLint/PMD), Typecheck/Compilation (SFDX deploy check), Unit tests, Integration tests.
*   **Deployment**: Automated via Salesforce CLI. No manual changes in production.

## Documentation
*   **ASDF Artifacts**:
    *   `constitution.md`: Business goals, UX, capabilities.
    *   `requirement.md`: Implementation rules, constraints, OOTB-first principles.
    *   `specification.md`: Exact Salesforce configuration, objects, fields, metadata.
*   **Customization Justification**: Every custom Apex/LWC/API must be documented with: Requirement, OOTB limitation, Configuration limitation, Proposed customization, Technical design, Dependencies, Security, Error handling, Testing, Maintenance impact.

## Observability
*   **Monitoring**: Utilize Salesforce Event Monitoring, Debug Logs, and API usage metrics.
*   **Analytics**: Integrate Google Analytics, OBIEE, or CRM Analytics as defined by the business, ensuring event ownership is clear and not duplicated.

## AI Development Rules
*   **AI-generated code policy**: AI code is UNTRUSTED — must be reviewed, tested, validated before merge.
*   **Agent restrictions (each without human approval)**: May NOT deploy to production, May NOT rotate credentials, May NOT modify infrastructure, May NOT approve pull requests.
*   **Prerequisite Validation**: ASDF/AI must validate all Salesforce prerequisites (Licenses, Web Store, Buyer Account, Buyer Group, Entitlements) before generating dependent metadata.

## Prompt / MCP / RAG Standards
*   Prompts version-controlled, documented, tested.
*   Prompt changes require review.
*   MCP integrations least-privilege, auditable, revocable.
*   RAG sources trusted, versioned, source-attributed.

## Code Review Standards
*   **Questions every PR must answer**: What changed? Why? Risks? Rollback plan? Testing evidence?
*   **B2B Specific Question**: Was an OOTB or Configuration approach evaluated and proven insufficient before writing this custom code?

## Git Standards
*   **Branches**: `feature/*`, `bugfix/*`, `hotfix/*`, `chore/*`.
*   **Commit types**: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`.

## Dependency Rules
*   **B2B Hierarchy**: Strict adherence to the Salesforce B2B Commerce data model: Account → Contact → User → Profile/Permission Set → Buyer permissions → Buyer Account relationship → Buyer Group → Web Store access → Experience Cloud access.
*   **Integration Ownership**: Define Source, Target, Direction, API, Payload, Authentication, Frequency, and Error Handling for every integration.

## Definition of Done
*   Requirements implemented.
*   Tests written and passing (Apex & Jest).
*   Typecheck/Compilation passing.
*   Lint passing.
*   Security review completed (CRUD/FLS/Sharing validated).
*   Documentation updated (Customization justification documented).
*   Accessibility validated.
*   Performance validated.
*   Code reviewed.
*   **System of Record defined** for all impacted data entities.
*   **Validated in Target Org**: ASDF-generated configurations must be proven to work in the actual Salesforce environment, not just generated as files.

## Non-Negotiable Rules
*   **NEVER** assume creating a User automatically grants B2B Commerce access; always validate the full Buyer Group and Entitlement chain.
*   **NEVER** rely only on UI visibility (e.g., hiding a Tile Menu item) to protect data; always enforce security at the Profile/Permission Set/Sharing layer.
*   **NEVER** implement custom logic for Pricing, Tax, or Credit Limits until standard Salesforce capabilities have been exhaustively evaluated and proven insufficient.
*   **NEVER** assume Salesforce is the System of Record simply because it displays the data.
*   **ALWAYS** classify every solution as OOTB, Configuration, Flow, Custom Action, Apex, LWC, or Integration.
*   **ALWAYS** explicitly document unsupported ASDF functionality as a blocker/ticket rather than silently bypassing it.

## Amendment Process
Written proposal → architecture review → team approval → version increment.