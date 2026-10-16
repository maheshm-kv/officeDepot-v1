# Project Context — Office_depot_version1

## Organization

Kognivera is a Salesforce implementation partner. The B2B Commerce implementation team is evaluating ASDF, an internal AI Software Development Framework, as a candidate end-to-end implementation framework.

## Product purpose

To validate and map the capabilities of the ASDF framework for building Salesforce B2B Commerce (LWR) storefronts, producing an honest assessment of its limitations and required workarounds.

## Brand personality

- Use honest, objective, and empirical validation language.

## Core users

1. ASDF Evaluators: Map framework capabilities., Classify requirements by actual tested behavior., Document workarounds for framework limitations..
2. B2B Buyers: Experience Cloud external user accounts with appropriate profiles, permission sets, and object access., Browse catalogs, view entitlements, and checkout..
3. Administrators: Commerce permission sets to configure the store., Build search indexes., Manage integrations..

## Domain principles

- Target platform is strictly Salesforce B2B Commerce on Lightning Web Runtime (LWR), linked to an Experience Cloud LWR site.
- Starting point is a new, clean Salesforce org; org enablement (Digital Experiences, Commerce) is a prerequisite.
- Canonical dependency order must be strictly followed: Org enablement -> WebStore/Site -> Settings/Integrations -> Catalog/Products -> Pricebooks -> Entitlements/BuyerGroups -> Accounts/Contacts/Users -> Memberships/Links -> Storefront pages -> Search index -> Publish/Activate -> Cart/Checkout/Order.
- Product visibility requires both catalog/category assignment and an active entitlement policy.
- Integrations (pricing, promotions, inventory, tax, shipping, payment) are registered on the store as either Internal (standard) or External (Apex service/API extension).
- Every requirement must be classified by actual tested behavior: (1) fully supported, (2) supported with limitations, (3) requires Salesforce config outside ASDF, (4) requires customization, (5) not supported / blocker.
- OOTB vs Configuration vs Customization must be determined during testing, never assumed.
- Flag metadata boundary steps that require Setup UI or API calls, such as enabling Digital Experiences/Commerce, building search indexes, publishing sites, activating stores, payment gateway auth, and store toggles.
- For anything ASDF cannot complete, document the requirement, expected behavior, actual ASDF behavior, and any manual workaround.

## Visual direction

_None identified._

## Working UI palette

_None identified._

## Component rules

_None identified._

## Do not

- Do not invent object, field, permission-set, or component names; use only real Salesforce metadata types and API names.
- Do not rebuild standard pages, components, or flows (like the standard Checkout Flow) that Salesforce already provides; configure them instead.
- Do not skip a dependency or create one out of order (e.g., no User before Contact before Account).
- Do not present any step as done unless it was actually created and verified in the org.
- Do not hard-code permission-set API names; confirm precise names against the target org.

## Unresolved questions

_None identified._

## Not carried through

- wrong_scope: “Core object / metadata model (real API names — confirm each in the target org) - Store: WebStore; links WebStoreCatalog, WebStoreBuyerGroup, WebStorePricebook. Buyer: BuyerAccount (marks an Account as a buyer), BuyerGroup, BuyerGroupMember (Account<->BuyerGroup), BuyerGroupPricebook.”
