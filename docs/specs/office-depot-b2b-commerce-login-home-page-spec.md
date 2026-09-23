# Office Depot B2B Commerce Login & Home Page
**ID**: SPEC-001
**Version**: 1.0
**Status**: Draft
**Type**: Functional Specification

## Overview & Purpose
Office Depot is launching a secure, enterprise-grade B2B Commerce storefront on Salesforce. The initial phase focuses on establishing the foundational store, specifically the Login and Home pages, utilizing a strict out-of-the-box (OOTB) first approach. The user interface must align with the 'Enterprise Procurement Platform' design system, which emphasizes a high-density, utilitarian corporate aesthetic. Establishing this foundation correctly is critical to enabling subsequent catalog browsing and complex requisition workflows.

## Goals
*   **OBJ-01**: Establish secure B2B authentication aligned with the enterprise brand.
    *   *Measure*: 100% of active buyer users can successfully authenticate via the custom-branded login page.
*   **OBJ-02**: Deploy a branded Home page featuring enterprise global navigation.
    *   *Measure*: The Home page successfully renders OOTB navigation and utility components, fully styled to the new design system's color and typography tokens.

## Target Users
*   **Business Buyer**: End-users purchasing on behalf of their organization.
*   **Institutional Purchaser**: Specialized buyers operating under specific cost centers and contract tiers.

## Stakeholders
*   **Business Buyer**
    *   *Decision authority*: None
    *   *Concerns*: Frictionless login process; Clear navigation to departments and catalogs.
*   **Procurement Manager**
    *   *Decision authority*: Validates functional workflows and UI compliance.
    *   *Concerns*: Visibility of active Cost Center and Contract Tier upon login; Access to approval and policy links.

## Scope (In / Out)
**In Scope**:
*   Custom-branded login page accepting email or mobile number.
*   Registration link redirection on the login page.
*   Home page global header featuring a search bar, department dropdown, and Requisition Cart icon.
*   Home page secondary navigation bar with specific enterprise links.
*   Home page utility bar displaying the authenticated user's active Cost Center and Contract Tier.
*   CSS overrides to align OOTB Salesforce components with the Enterprise Procurement Platform design system.

**Out of Scope**:
*   Self-service account creation workflow (only the link UI is in scope).
*   Product Detail Page (PDP) functionality, tiered pricing tables, and 'Add to Requisition' logic.
*   Cart, subtotal, and Checkout routing.
*   Custom Apex or Lightning Web Component (LWC) development for navigation menus (if OOTB components can achieve the functional requirement).

## MoSCoW
None specified.

## Functional Requirements
*   **FR-01**: The system shall provide a login component that accepts an email address or mobile number.
*   **FR-02**: The system shall display a 'Buying for work? Create a free business account' registration link on the login page.
*   **FR-03**: The system shall display a global search bar with a category/department dropdown in the Home page header.
*   **FR-04**: The system shall display a navigation menu on the Home page including links for: Requisition Catalog, Approvals & Policies, Business Lists, Orders & Invoices, and Spend Analytics.
*   **FR-05**: The system shall display the authenticated user's active Cost Center and Contract Tier in the global header.
*   **BR-01 (Business Rule)**: Users must be assigned to an active Account, Contact, and Buyer Group to access the authenticated Home page to ensure B2B pricing, catalog entitlements, and cost centers are correctly applied.

## User Stories
*   **US-01**: As a Business Buyer, I want to log in using my email or mobile number, so that I can securely access my company's negotiated catalog and pricing.
    *   *Acceptance Criteria 1*: GIVEN I am on the storefront login page WHEN I enter my valid email or mobile number and submit THEN I am authenticated and routed to the authenticated Home page.
    *   *Acceptance Criteria 2*: GIVEN I am an unregistered user on the login page WHEN I view the login card THEN I see a link to 'Create a free business account'.
*   **US-02**: As a Business Buyer, I want to view a global navigation header on the Home page, so that I can easily search for products or navigate by department.
    *   *Acceptance Criteria 1*: GIVEN I am authenticated on the Home page WHEN I view the global header THEN I see a search bar with a department dropdown and a Requisition Cart icon.
    *   *Acceptance Criteria 2*: GIVEN I am authenticated on the Home page WHEN I view the secondary navigation bar THEN I see links for Requisition Catalog, Approvals & Policies, Business Lists, Orders & Invoices, and Spend Analytics.
*   **US-03**: As an Institutional Purchaser, I want to see my active Cost Center and Contract Tier in the header, so that I am constantly aware of the purchasing context and budget I am operating under.
    *   *Acceptance Criteria 1*: GIVEN I am authenticated and have an assigned Cost Center WHEN I view the utility bar on the Home page THEN My current Cost Center and Contract Tier are displayed.

## Inputs/Outputs/Data Flow
None specified.

## Flows
None specified.

## Edge Cases & Error States
*   **EC-01 (Invalid Credentials)**: User enters invalid credentials on the login page.
    *   *Expected State*: The system shall display a standard Salesforce error message and prevent authentication.
*   **EC-02 (Missing Context Data)**: Authenticated user has no assigned Cost Center or Contract Tier.
    *   *Expected State*: The system shall hide the Cost Center/Contract Tier UI elements in the header or display a default 'Unassigned' state, rather than failing to load the Home page.
*   **EC-03 (Missing Prerequisites)**: User is not assigned to an active Account, Contact, and Buyer Group (per BR-01).
    *   *Expected State*: The system shall prevent access to the authenticated Home page and negotiated catalogs.

## Acceptance Criteria (Given/When/Then)
*   **AC-01 (Login Success)**: GIVEN I am on the storefront login page WHEN I enter my valid email or mobile number and submit THEN I am authenticated and routed to the authenticated Home page.
*   **AC-02 (Login Failure)**: GIVEN I am on the storefront login page WHEN I enter invalid credentials THEN I see a standard Salesforce error message AND I am prevented from authenticating.
*   **AC-03 (Registration Link)**: GIVEN I am an unregistered user on the login page WHEN I view the login card THEN I see a link to 'Create a free business account'.
*   **AC-04 (Global Header)**: GIVEN I am authenticated on the Home page WHEN I view the global header THEN I see a search bar with a department dropdown and a Requisition Cart icon.
*   **AC-05 (Secondary Navigation)**: GIVEN I am authenticated on the Home page WHEN I view the secondary navigation bar THEN I see links for Requisition Catalog, Approvals & Policies, Business Lists, Orders & Invoices, and Spend Analytics.
*   **AC-06 (Context Display - Happy Path)**: GIVEN I am authenticated and have an assigned Cost Center WHEN I view the utility bar on the Home page THEN My current Cost Center and Contract Tier are displayed.
*   **AC-07 (Context Display - Edge Case)**: GIVEN I am authenticated but lack an assigned Cost Center or Contract Tier WHEN I view the utility bar THEN the elements are either hidden or display a default 'Unassigned' state AND the Home page continues to load successfully.

## Non-Functional Requirements
*   **NFR-01 (Usability/UI)**: The UI shall implement the Enterprise Procurement Platform design system, specifically utilizing the Primary color `#232F3E` for global navigation bars, the `Inter` font family, and a `0.25rem` base border radius. Target: 100% compliance with the provided style guide for all OOTB component CSS overrides.
*   **NFR-02 (Security)**: The login page shall enforce Salesforce standard authentication protocols and session management. Target: Zero unauthorized access incidents.

## Assumptions
*   Standard Salesforce B2B Commerce OOTB components can be styled via CSS overrides to meet the Enterprise Procurement Platform design system requirements without requiring custom LWC development.

## Dependencies
*   **AD-01**: The ASDF framework will successfully sequence and validate the prerequisite Salesforce configurations (Account, Contact, Buyer User, Web Store, Buyer Groups). Impact if wrong: The storefront will not function, and users will not be able to log in or see entitled catalogs.

## Open Questions
*   **OQ-01**: Are the Cart and PDP features in scope for this specific requirement phase? *(Recommended default from requirements: No. Restrict this phase strictly to the Login and Home page structure. Treat provided images solely as visual references for the global header, navigation structure, and brand styling.)*
*   **OQ-02**: Standard Salesforce B2B Commerce OOTB components may not support the data density required for dynamic Cost Center dropdowns and Contract Tier badges without custom LWC. Should we prioritize OOTB components even if it means deviating from the exact layout? *(Recommended default from requirements: Yes. Adhere strictly to the project's OOTB-first principle. Escalate to custom LWC only if business-critical data cannot be exposed otherwise.)*
*   **OQ-03**: What is the MoSCoW prioritization for the listed requirements? (None specified in the provided documentation).
*   **OQ-04**: What are the specific Inputs, Outputs, and Data Flows for the authentication and user context retrieval processes? (None specified in the provided documentation).
*   **OQ-05**: What are the step-by-step user flows for login and navigation? (None specified in the provided documentation).

## Success Metrics
*   **SM-01 (Lagging)**: Login success rate. Target: >99% of login attempts by provisioned users. (Data required: Salesforce login history and error logs).
*   **SM-02 (Leading)**: Home Page Time to Interactive. Target: <2.5 seconds on desktop. (Data required: Client-side performance monitoring).