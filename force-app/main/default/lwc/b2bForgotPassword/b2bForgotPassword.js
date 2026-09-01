import { LightningElement, track, api } from "lwc";
import requestPasswordReset from "@salesforce/apex/B2BLoginController.requestPasswordReset";

import heading from "@salesforce/label/c.B2B_ForgotPassword_Heading";
import instructions from "@salesforce/label/c.B2B_ForgotPassword_Instructions";
import emailLabel from "@salesforce/label/c.B2B_ForgotPassword_EmailLabel";
import submitButtonLabel from "@salesforce/label/c.B2B_ForgotPassword_SubmitButton";
import successMessage from "@salesforce/label/c.B2B_ForgotPassword_SuccessMessage";
import backToLoginLabel from "@salesforce/label/c.B2B_ForgotPassword_BackToLogin";
import emailRequiredLabel from "@salesforce/label/c.B2B_Error_Validation_EmailRequired";
import emailFormatLabel from "@salesforce/label/c.B2B_Error_Validation_EmailFormat";
import serviceErrorLabel from "@salesforce/label/c.B2B_Error_Service_Unavailable";
import unknownErrorLabel from "@salesforce/label/c.B2B_Error_Unknown";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default class B2bForgotPassword extends LightningElement {
  @api loginUrl = "/login";

  @track email = "";
  @track emailError = "";
  @track formError = "";
  @track isSubmitting = false;
  @track isSuccess = false;

  label = {
    heading,
    instructions,
    emailLabel,
    submitButtonLabel,
    backToLoginLabel
  };

  successMessage = successMessage;

  get isEmailInvalid() {
    return this.emailError ? "true" : "false";
  }

  get emailErrorId() {
    return this.emailError ? "email-error" : undefined;
  }

  handleEmailChange(event) {
    this.email = event.target.value;
  }

  focusEmailInput() {
    Promise.resolve().then(() => {
      const emailInput = this.template.querySelector('[data-id="email-input"]');
      if (emailInput) {
        emailInput.focus();
      }
    });
  }

  handleSubmit(event) {
    event.preventDefault();
    if (this.isSubmitting) {
      return;
    }

    this.emailError = "";
    this.formError = "";

    const trimmedEmail = (this.email || "").trim();

    if (!trimmedEmail) {
      this.emailError = emailRequiredLabel;
      this.focusEmailInput();
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      this.emailError = emailFormatLabel;
      this.focusEmailInput();
      return;
    }

    this.isSubmitting = true;

    requestPasswordReset({ email: trimmedEmail })
      .then((result) => {
        this.isSubmitting = false;
        if (result.success) {
          this.isSuccess = true;
          return;
        }
        this.formError =
          result.errorCode === "EXTERNAL_SERVICE_ERROR"
            ? serviceErrorLabel
            : unknownErrorLabel;
      })
      .catch(() => {
        this.isSubmitting = false;
        this.formError = unknownErrorLabel;
      });
  }

  errorCallback() {
    this.formError = unknownErrorLabel;
  }
}
