# Project Context — punchout system integration

## Organization

The organization operates in the B2B sector, utilizing Salesforce B2B Commerce as its storefront platform. Its technical ecosystem includes direct integrations with external procurement systems driven by cXML PunchOut workflows.

## Product purpose

The software must facilitate a seamless PunchOut session for B2B customers, allowing them to authenticate automatically, manage cart quantities, and return cart data to their originating procurement systems.

## Brand personality

_None identified._

## Core users

1. Procurement Customers: Seamless authentication from external procurement systems, Ability to review and adjust product quantities in a pre-populated cart, Capability to return finalized cart contents to their originating procurement system.

## Domain principles

- External procurement integrations must utilize cXML PunchOut requests and workflows.
- Authentication for PunchOut sessions must be handled automatically via the session payload, bypassing manual login.

## Visual direction

_None identified._

## Working UI palette

_None identified._

## Component rules

_None identified._

## Do not

- Do not prompt PunchOut users for manual login credentials.

## Unresolved questions

- **AMB-01** — The input states products are selected externally or transferred depending on 'integration design', leaving the exact cart population flow ambiguous.
  - Why it matters: Downstream agents need to know whether to design a product discovery experience or strictly a cart review experience.
  - Recommended interpretation: Assume the storefront must accept and parse pre-populated cart payloads from the initial cXML request, focusing the UI on cart review and quantity adjustment.
  - Relates to: USR-01

## Not carried through

- not_durable_context: “yes i confirmed this is the correct requirment:”
- not_durable_context: “1. The customer initiates a PunchOut session from an external procurement system. 2. The external system sends a cXML PunchOut request to Salesforce B2B Commerce.”
- not_durable_context: “4. The customer selects 10 products in the external procurement system, or the products are transferred to the storefront through the PunchOut workflow, depending on the integration design.”
- not_durable_context: “5. The selected products are automatically added to the customer's cart in Salesforce B2B Commerce. 6. The customer can review the cart and increase or decrease the quantity of each product.”
- not_durable_context: “7. Once the customer completes the selection, the cart contents can be returned to the external procurement system through the appropriate cXML PunchOut workflow.”
