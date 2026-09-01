import { createElement } from "lwc";
import B2bForgotPassword from "c/b2bForgotPassword";
import requestPasswordReset from "@salesforce/apex/B2BLoginController.requestPasswordReset";

jest.mock(
  "@salesforce/apex/B2BLoginController.requestPasswordReset",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("c-b2b-forgot-password", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("shows validation error and does not call Apex when email is empty", async () => {
    const element = createElement("c-b2b-forgot-password", {
      is: B2bForgotPassword
    });
    document.body.appendChild(element);

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();

    const errorEl = element.shadowRoot.querySelector('[data-id="email-error"]');
    expect(errorEl).not.toBeNull();
    expect(requestPasswordReset).not.toHaveBeenCalled();
  });

  it("always shows the generic success message on a successful Apex response", async () => {
    requestPasswordReset.mockResolvedValue({
      success: true,
      redirectUrl: null,
      errorCode: null,
      errorMessage: null
    });

    const element = createElement("c-b2b-forgot-password", {
      is: B2bForgotPassword
    });
    document.body.appendChild(element);

    const emailInput = element.shadowRoot.querySelector('input[type="email"]');
    emailInput.value = "unknown@example.com";
    emailInput.dispatchEvent(new CustomEvent("change"));

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();
    await flushPromises();

    const successEl = element.shadowRoot.querySelector(
      '[data-id="success-message"]'
    );
    expect(successEl).not.toBeNull();
  });

  it("prevents duplicate submission while a request is in flight", async () => {
    let resolveCall;
    requestPasswordReset.mockReturnValue(
      new Promise((resolve) => {
        resolveCall = resolve;
      })
    );

    const element = createElement("c-b2b-forgot-password", {
      is: B2bForgotPassword
    });
    document.body.appendChild(element);

    const emailInput = element.shadowRoot.querySelector('input[type="email"]');
    emailInput.value = "buyer@example.com";
    emailInput.dispatchEvent(new CustomEvent("change"));

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();

    expect(requestPasswordReset).toHaveBeenCalledTimes(1);
    resolveCall({ success: true });
    await flushPromises();
  });
});
