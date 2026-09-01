import { LightningElement, track, api } from "lwc";
import login from "@salesforce/apex/B2BLoginController.login";

import loginHeading from "@salesforce/label/c.B2B_Login_Heading";
import emailLabel from "@salesforce/label/c.B2B_Login_Email_Label";
import passwordLabel from "@salesforce/label/c.B2B_Login_Password_Label";
import loginButtonLabel from "@salesforce/label/c.B2B_Login_Button";
import forgotLinkLabel from "@salesforce/label/c.B2B_Login_Forgot_Link";
import showPasswordLabel from "@salesforce/label/c.B2B_Login_Password_Show";
import hidePasswordLabel from "@salesforce/label/c.B2B_Login_Password_Hide";
import emailRequiredLabel from "@salesforce/label/c.B2B_Error_Validation_EmailRequired";
import emailFormatLabel from "@salesforce/label/c.B2B_Error_Validation_EmailFormat";
import passwordRequiredLabel from "@salesforce/label/c.B2B_Error_Validation_PasswordRequired";
import authErrorLabel from "@salesforce/label/c.B2B_Error_Auth_Invalid";
import serviceErrorLabel from "@salesforce/label/c.B2B_Error_Service_Unavailable";
import unknownErrorLabel from "@salesforce/label/c.B2B_Error_Unknown";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ERROR_LABEL_BY_CODE = {
  AUTHENTICATION_ERROR: authErrorLabel,
  EXTERNAL_SERVICE_ERROR: serviceErrorLabel,
  UNKNOWN_ERROR: unknownErrorLabel
};

export default class B2bLoginForm extends LightningElement {
  @api forgotPasswordUrl = "/login/forgot-password";

  @track email = "";
  @track password = "";
  @track passwordVisible = false;
  @track isSubmitting = false;
  @track emailError = "";
  @track passwordError = "";
  @track formError = "";

  label = {
    loginHeading,
    emailLabel,
    passwordLabel,
    loginButtonLabel,
    forgotLinkLabel
  };

  get passwordInputType() {
    return this.passwordVisible ? "text" : "password";
  }

  get passwordToggleLabel() {
    return this.passwordVisible ? hidePasswordLabel : showPasswordLabel;
  }

  get passwordToggleIcon() {
    return this.passwordVisible ? "utility:hide" : "utility:preview";
  }

  get isEmailInvalid() {
    return this.emailError ? "true" : "false";
  }

  get emailErrorId() {
    return this.emailError ? "email-error" : undefined;
  }

  get isPasswordInvalid() {
    return this.passwordError ? "true" : "false";
  }

  get passwordErrorId() {
    return this.passwordError ? "password-error" : undefined;
  }

  handleEmailChange(event) {
    this.email = event.target.value;
  }

  handlePasswordChange(event) {
    this.password = event.target.value;
  }

  handleTogglePasswordVisibility() {
    this.passwordVisible = !this.passwordVisible;
  }

  handleSubmit(event) {
    event.preventDefault();
    if (this.isSubmitting) {
      return;
    }

    this.emailError = "";
    this.passwordError = "";
    this.formError = "";

    const trimmedEmail = (this.email || "").trim();
    let hasError = false;

    if (!trimmedEmail) {
      this.emailError = emailRequiredLabel;
      hasError = true;
    } else if (!EMAIL_PATTERN.test(trimmedEmail)) {
      this.emailError = emailFormatLabel;
      hasError = true;
    }

    if (!this.password) {
      this.passwordError = passwordRequiredLabel;
      hasError = true;
    }

    if (hasError) {
      Promise.resolve().then(() => {
        const selector = this.emailError
          ? '[data-id="email-input"]'
          : '[data-id="password-input"]';
        const invalidInput = this.template.querySelector(selector);
        if (invalidInput) {
          invalidInput.focus();
        }
      });
      return;
    }

    this.isSubmitting = true;
    const startUrl = new URLSearchParams(window.location.search).get(
      "startURL"
    );

    login({ email: trimmedEmail, password: this.password, startUrl })
      .then((result) => {
        if (result.success) {
          window.location.assign(result.redirectUrl || "/");
          return;
        }
        this.password = "";
        this.formError =
          ERROR_LABEL_BY_CODE[result.errorCode] || unknownErrorLabel;
        this.isSubmitting = false;
        Promise.resolve().then(() => {
          const passwordInput = this.template.querySelector(
            '[data-id="password-input"]'
          );
          if (passwordInput) {
            passwordInput.focus();
          }
        });
      })
      .catch(() => {
        this.password = "";
        this.formError = unknownErrorLabel;
        this.isSubmitting = false;
      });
  }

  errorCallback() {
    this.formError = unknownErrorLabel;
  }
}
