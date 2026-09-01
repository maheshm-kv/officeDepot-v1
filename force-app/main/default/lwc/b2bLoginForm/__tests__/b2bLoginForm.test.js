import { createElement } from "lwc";
import B2bLoginForm from "c/b2bLoginForm";
import login from "@salesforce/apex/B2BLoginController.login";

jest.mock(
  "@salesforce/apex/B2BLoginController.login",
  () => ({ default: jest.fn() }),
  { virtual: true }
);

function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe("c-b2b-login-form", () => {
  let assignMock;

  beforeEach(() => {
    // jsdom does not implement real navigation; window.location.assign()
    // otherwise logs a "Not implemented: navigation" console.error during
    // the success-path test. Stub it so test output stays clean while
    // still letting us assert on the redirect target if needed.
    assignMock = jest.fn();
    delete window.location;
    window.location = { assign: assignMock, search: "" };
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("shows validation error and does not call Apex when email is empty", async () => {
    const element = createElement("c-b2b-login-form", { is: B2bLoginForm });
    document.body.appendChild(element);

    const passwordInput = element.shadowRoot.querySelector(
      'input[type="password"]'
    );
    passwordInput.value = "SomePass1";
    passwordInput.dispatchEvent(new CustomEvent("change"));

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();

    const errorEl = element.shadowRoot.querySelector('[data-id="email-error"]');
    expect(errorEl).not.toBeNull();
    expect(login).not.toHaveBeenCalled();
  });

  it("toggles password visibility without clearing the entered value", async () => {
    const element = createElement("c-b2b-login-form", { is: B2bLoginForm });
    document.body.appendChild(element);

    const passwordInput = element.shadowRoot.querySelector(
      'input[type="password"]'
    );
    passwordInput.value = "SomePass1";
    passwordInput.dispatchEvent(new CustomEvent("change"));
    await flushPromises();

    const toggleButton = element.shadowRoot.querySelector(
      '[data-id="password-toggle"]'
    );
    toggleButton.click();
    await flushPromises();

    const visibleInput = element.shadowRoot.querySelector(
      'input[type="text"][data-id="password-input"]'
    );
    expect(visibleInput).not.toBeNull();
    expect(visibleInput.value).toBe("SomePass1");
  });

  it("disables the submit button while a login call is in flight", async () => {
    let resolveLogin;
    login.mockReturnValue(
      new Promise((resolve) => {
        resolveLogin = resolve;
      })
    );

    const element = createElement("c-b2b-login-form", { is: B2bLoginForm });
    document.body.appendChild(element);

    const emailInput = element.shadowRoot.querySelector('input[type="email"]');
    emailInput.value = "buyer@example.com";
    emailInput.dispatchEvent(new CustomEvent("change"));

    const passwordInput = element.shadowRoot.querySelector(
      'input[data-id="password-input"]'
    );
    passwordInput.value = "SomePass1";
    passwordInput.dispatchEvent(new CustomEvent("change"));

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();

    const submitButton = element.shadowRoot.querySelector(
      '[data-id="submit-button"]'
    );
    expect(submitButton.disabled).toBe(true);

    resolveLogin({
      success: true,
      redirectUrl: "/home",
      errorCode: null,
      errorMessage: null
    });
    await flushPromises();

    expect(assignMock).toHaveBeenCalledWith("/home");
  });

  it("shows the authentication error label when login fails with AUTHENTICATION_ERROR", async () => {
    login.mockResolvedValue({
      success: false,
      redirectUrl: null,
      errorCode: "AUTHENTICATION_ERROR",
      errorMessage: "ignored"
    });

    const element = createElement("c-b2b-login-form", { is: B2bLoginForm });
    document.body.appendChild(element);

    const emailInput = element.shadowRoot.querySelector('input[type="email"]');
    emailInput.value = "buyer@example.com";
    emailInput.dispatchEvent(new CustomEvent("change"));

    const passwordInput = element.shadowRoot.querySelector(
      'input[data-id="password-input"]'
    );
    passwordInput.value = "WrongPass1";
    passwordInput.dispatchEvent(new CustomEvent("change"));

    const form = element.shadowRoot.querySelector("form");
    form.dispatchEvent(new CustomEvent("submit", { cancelable: true }));
    await flushPromises();
    await flushPromises();

    const errorBanner = element.shadowRoot.querySelector(
      '[data-id="form-error"]'
    );
    expect(errorBanner).not.toBeNull();

    const passwordAfterFailure = element.shadowRoot.querySelector(
      'input[data-id="password-input"]'
    );
    expect(passwordAfterFailure.value).toBe("");
  });
});
