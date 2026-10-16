# External Punchout Engineering Constitution
Version: 1.0.0

This document is the supreme engineering authority for the External Punchout project. All code, architecture, and infrastructure decisions must comply with these rules.

## Mission
To successfully connect an external procurement system to Salesforce B2B Commerce via a cXML PunchOut integration Proof of Concept (PoC). The integration must seamlessly execute the following workflow:
1. Initiate a PunchOut session from an external procurement system.
2. Receive and parse a cXML PunchOut request in Salesforce B2B Commerce.
3. Authenticate and redirect the customer automatically to the storefront without manual login.
4. Transfer selected products to the storefront via the PunchOut workflow.
5. Automatically add selected products to the customer's cart in Salesforce B2B Commerce.
6. Allow the customer to review and adjust cart quantities.
7. Return the finalized cart contents to the external procurement system via the appropriate cXML PunchOut workflow.

## Core Values
1. **Correctness over speed**: The cXML payload parsing and cart generation must be perfectly accurate.
2. **Security over convenience**: PunchOut authentication must be strictly validated.
3. **Simplicity over cleverness**: Keep the PoC architecture straightforward.
4. **Maintainability over shortcuts**: Write clean, documented Apex and LWC code.
5. **Observability over assumptions**: Log all incoming and outgoing cXML payloads.
6. **Explicitness over magic**: Clearly map cXML nodes to Salesforce B2B Cart objects.
7. **Automation over manual processes**: Automate testing and deployment validations.
8. **Testing over trust**: Prove the integration works via automated tests before manual QA.

## Technology Stack

*(Assumption: As the primary languages are Salesforce, Apex, and LWC, the project shape is defined as a Salesforce DX (SFDX) application.)*

### Required Technologies
| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Platform** | Salesforce B2B Commerce | Core e-commerce engine and cart management |
| **Backend** | Apex | cXML parsing, REST endpoints, ConnectApi cart operations |
| **Frontend** | Lightning Web Components (LWC) | Cart review and quantity adjustment UI |
| **Integration** | cXML (Commerce eXtensible Markup Language) | Standard protocol for PunchOut communication |
| **Tooling** | Salesforce CLI (SFDX) | Source control and deployment management |

### Forbidden Technologies & Practices
*   **Direct DOM Manipulation**: Forbidden in LWC; use standard template directives (`lwc:if`, `for:each`).
*   **Hardcoded Credentials**: Forbidden; use Salesforce Named Credentials or Auth.Providers for external callouts.
*   **Synchronous Callouts in Triggers**: Forbidden; use `@future(callout=true)` or Queueable Apex.
*   **SOQL/DML inside Loops**: Strictly forbidden due to Salesforce Governor Limits.

## Repository Structure
*(Assumption: Using standard Salesforce DX source-driven project structure.)*

```text
external-punchout/
├── force-app/main/default/
│   ├── classes/          # Apex controllers, REST resources, cXML parsers
│   ├── lwc/              # Lightning Web Components for cart review
│   ├── objects/          # Custom objects (e.g., Integration_Log__c)
│   ├── permissionsets/   # Security configurations for the PunchOut user
│   └── staticresources/  # Mock cXML files for testing
├── config/               # Scratch org definition files
├── scripts/              # Setup and deployment scripts
└── sfdx-project.json     # SFDX project configuration
```

## Language/Code Standards

### General
*   **Component/File Size**: Target 300 lines; mandatory refactor at 500 lines.
*   **Naming Conventions**:
    *   **Apex Classes**: `PascalCase` (e.g., `PunchOutRequestHandler`).
    *   **Apex Methods/Variables**: `camelCase` (e.g., `parseSetupRequest`).
    *   **LWC Folders/Files**: `kebab-case` (e.g., `punchout-cart-review`).
    *   **Constants**: `UPPER_SNAKE_CASE`.

### Apex Standards
*   **Bulkification**: All Apex code must be written to handle collections of records, even if the PoC currently expects single records.
*   **Security**: Use `WITH SECURITY_ENFORCED` in SOQL queries or `Schema.sObjectType.Describe` checks before DML.
*   **Governor Limits**: Code must be optimized to stay well within CPU time, heap size, and SOQL query limits.

### JavaScript / LWC Standards
*   **Modern JS**: Use ES6+ features (destructuring, arrow functions, async/await).
*   **Reactivity**: Use `@track` only for objects/arrays where deep tracking is necessary. Use `@api` for public properties.
*   **Wire Service**: Prefer `@wire` for reading data; use imperative Apex for DML operations (adding to cart, returning cart).

## Frontend Standards
*   **Styling**: Use Salesforce Lightning Design System (SLDS) utility classes. Custom CSS should be strictly minimized.
*   **Security**: Must comply with Lightning Web Security (LWS) / Locker Service restrictions.
*   **State Management**: Manage cart state locally in the LWC during review, syncing to the Salesforce backend only on explicit user action (e.g., "Update Cart" or "Checkout").

## Backend/API & Validation Standards
*   **cXML Endpoints**: Expose Apex REST endpoints (`@RestResource`) to receive incoming PunchOut Setup Requests.
*   **XML Parsing**: Use Salesforce `Dom.Document` and `Dom.XmlNode` for secure XML parsing. Do not attempt to parse XML using string manipulation or Regex.
*   **Cart Operations**: Use the `ConnectApi` (B2B Commerce API) namespace for adding items to the cart and creating the cart session, ensuring standard B2B pricing and entitlement rules fire.
*   **Validation**: Validate the `Sender` credentials and `SharedSecret` in the incoming cXML header before processing the payload.

## Error Handling
Errors must be caught, categorized, and handled gracefully without exposing stack traces to the external system or the end user.

| Category | Handling Strategy |
| :--- | :--- |
| `AUTHENTICATION_ERROR` | Return 401/403 HTTP status to external system; log attempt. |
| `VALIDATION_ERROR` | Return 400 HTTP status with cXML `<Status code="400">` response. |
| `BUSINESS_ERROR` | (e.g., Product not found) Log error, notify user in LWC, do not crash cart. |
| `EXTERNAL_SERVICE_ERROR` | Retry transient errors; log failure if returning cart to external system fails. |
| `INFRASTRUCTURE_ERROR` | (e.g., Governor limits) Catch standard exceptions, log, return 500. |

*   **LWC**: Catch imperative Apex errors and display them using `ShowToastEvent`.
*   **Apex**: Throw `AuraHandledException` for errors intended to be surfaced in LWC.

## Logging
*(Assumption: Relying on Salesforce native logging and custom objects for persistence, as standard APM tools are not native to Salesforce PoCs.)*

*   **System.debug**: Use for standard execution flow tracking during the PoC.
*   **Integration Logs**: All inbound and outbound cXML payloads MUST be saved to a custom object (e.g., `Integration_Log__c`) for observability and debugging.
*   **Required Log Fields** (mapped to custom object fields):
    *   `Event_Type__c` (e.g., PunchOutSetupRequest, PunchOutOrderMessage)
    *   `Timestamp__c`
    *   `Request_Id__c` (Payload ID from cXML)
    *   `User_Id__c` (Context User)
    *   `Payload__c` (Full cXML string)
    *   `Status__c` (Success/Error)

## Security
*   **Authentication Location**: Must occur server-side. The Apex REST endpoint must validate the cXML MAC/Shared Secret before initiating the Salesforce session.
*   **Secrets Handling**:
    *   Never commit secrets to version control.
    *   Use Salesforce **Named Credentials** for outbound callouts to the external procurement system.
    *   Use **Custom Metadata Types** or **Protected Custom Settings** for storing inbound validation secrets (if not using standard Auth Providers).
*   **Dependency Policy**:
    *   Must pass security scan (Salesforce Code Analyzer).
    *   Prefer building native Apex/LWC over adding managed packages for small utilities.

## Testing
*(Assumption: Using standard Salesforce testing frameworks: Apex Tests and LWC Jest.)*

*   **Minimum Coverage**: 80% minimum overall, 95% for critical business logic (cXML parsing, authentication, cart creation).
*   **Required Test Types**:
    *   **Apex Unit Tests**: Must use `System.runAs()` to test user context. Must use `Test.setMock()` for external callouts.
    *   **LWC Jest Tests**: Must test component rendering, DOM events, and mocked Apex wire/imperative calls.
*   **Data Isolation**: Apex tests must use `@isTest(SeeAllData=false)` and generate their own B2B Commerce test data (Products, Pricebooks, Catalogs) using a Test Data Factory.

## CI/CD
Every Pull Request must pass the following automated gates before merge:
1.  **Lint**: ESLint for JavaScript/LWC.
2.  **Static Analysis**: PMD for Apex (via Salesforce Code Analyzer).
3.  **Unit Tests**: Apex tests execution (minimum 80% coverage enforced).
4.  **LWC Tests**: Jest test execution.
5.  **Validation Deployment**: Successful `sfdx force:source:deploy --checkonly` to a CI sandbox or scratch org.

## Documentation
*   **Code Documentation**: Use ApexDoc (`/** ... */`) for all public classes and methods.
*   **Architecture**: Maintain a Markdown file detailing the cXML node-to-Salesforce object mapping.
*   **Payload Examples**: Keep sanitized examples of `PunchOutSetupRequest` and `PunchOutOrderMessage` in the repository for reference.

## Observability
*   Monitor standard Salesforce **Debug Logs** during active development.
*   Monitor the `Integration_Log__c` custom object for payload inspection and failure tracking.
*   Use Salesforce **Setup Audit Trail** to track configuration changes.

## AI Development Rules
*   **AI-generated code policy**: AI code is UNTRUSTED — must be reviewed, tested, and validated before merge.
*   **Agent restrictions (each without human approval)**:
    *   May NOT deploy to production.
    *   May NOT rotate credentials.
    *   May NOT modify infrastructure or Salesforce metadata outside of the PR scope.
    *   May NOT approve pull requests.

## Prompt / MCP / RAG Standards
*   Prompts must be version-controlled, documented, and tested.
*   Prompt changes require peer review.
*   MCP integrations must be least-privilege, auditable, and revocable.
*   RAG sources must be trusted, versioned, and source-attributed.

## Code Review Standards
Every Pull Request must answer the following questions in its description:
1.  **What changed?**
2.  **Why?**
3.  **Risks?** (e.g., Governor limit impacts, security implications)
4.  **Rollback plan?**
5.  **Testing evidence?** (Screenshots of the LWC UI, snippets of successful cXML logs)

## Git Standards
*   **Branches**: `feature/*`, `bugfix/*`, `hotfix/*`, `chore/*`
*   **Commit types**: `feat`, `fix`, `refactor`, `test`, `docs`, `perf`, `chore`
*   **Merging**: Squash and merge to `main`.

## Dependency Rules
*   Must pass security scan.
*   Must pass license review.
*   Must be actively maintained.
*   Prefer building over adding a dependency when smaller.

## Definition of Done
*   Requirements implemented (All 7 steps of the PunchOut flow function end-to-end).
*   Tests written and passing (Apex & Jest).
*   Typecheck/Lint passing.
*   Security review completed (No hardcoded secrets, SOQL injection risks mitigated).
*   Documentation updated (cXML mappings documented).
*   Code reviewed and approved by at least one peer.

## Non-Negotiable Rules
*   **NEVER** place SOQL queries or DML statements inside `for` loops.
*   **NEVER** commit plain-text passwords, tokens, or shared secrets to the repository.
*   **ALWAYS** validate the authentication payload of incoming cXML requests before processing.
*   **ALWAYS** use `ConnectApi` for B2B cart modifications to ensure platform integrity.
*   **ALWAYS** bulkify Apex triggers and integration handlers.

## Amendment Process
Written proposal → architecture review → team approval → version increment.