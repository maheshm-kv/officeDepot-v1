# Project Context — OfficeDepotProjectV3

## Organization

Office Depot. The ecosystem encompasses Salesforce B2B Commerce, Sales Cloud, Service Cloud, external OMS, AS400, Oracle RMS, Oracle RPM, procurement/PunchOut systems, payment services, tax services, and analytics platforms.

## Product purpose

Provide a secure, enterprise-grade B2B Commerce storefront for business customers to manage purchasing, approvals, and orders.

## Brand personality

_None identified._

## Core users

1. Business Buyers: Secure authentication and buyer setup, Catalog browsing and search, B2B purchasing via purchase orders and credit limits, Order approvals and management.

## Domain principles

- OOTB-first approach: Prioritize Salesforce standard B2B Commerce capabilities and configuration over custom code.
- Use Flow, supported Commerce extensions/actions, Apex, APIs, and LWC strictly only when standard configuration is exhausted.
- Implementation must validate Salesforce prerequisites and actual org capabilities before execution, implementing dependencies in the correct order (Account, Contact, Buyer User, permissions, Buyer Groups, Web Store, catalog, products, pricing, pages, cart, checkout, order).
- The system must support B2B-specific transactional rules including credit-limit validation, purchase orders, and approvals.

## Visual direction

- Reference Amazon Business and existing Office Depot B2B experiences for functional and UX baseline.

## Working UI palette

_None identified._

## Component rules

- Storefront Pages: Initial scope pages (Login, Home, Categories, PLP, PDP, Search, Cart, Checkout, Order Confirmation) must utilize standard Salesforce B2B templates and components where available.

## Do not

- Do not implement custom Apex or LWC without first exhausting OOTB configuration and Flow capabilities.

## Unresolved questions

- **AMB-01** — The prompt mandates the use of the 'ASDF framework' to build the solution and validate prerequisites, but does not define what ASDF is.
  - Why it matters: Downstream agents need to know if ASDF is a specific internal codebase, a third-party package, or simply the name of the automated agent itself.
  - Recommended interpretation: Treat 'ASDF' as the downstream automated agent or internal deployment framework responsible for sequencing and validating Salesforce configurations.
  - Relates to: PRN-03

## Not carried through

- wrong_scope: “The solution will provide a secure B2B Commerce storefront for business customers, including customer and buyer setup, authentication, home page, product catalog, categories, product listing and detail pages, search, cart, checkout, pricing, promotions, tax, payment, purchase orders...”
- wrong_scope: “ASDF should validate Salesforce prerequisites and actual org capabilities before implementation, identify unsupported or blocked functionality, and clearly distinguish OOTB, configuration, Flow, extension, customization, and integration requirements.”
