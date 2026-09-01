/**
 * Seam between B2BLoginController and Salesforce's native Site.* auth
 * mechanisms, so controller branching logic is unit-testable without a
 * live Experience Cloud Site context.
 *
 * Note: LoginOutcome lives in its own top-level class (LoginOutcome.cls)
 * rather than nested here, because Apex interfaces cannot contain nested
 * types.
 */
public interface B2BAuthAdapter {
  LoginOutcome doLogin(String email, String password, String startUrl);
  Boolean doForgotPassword(String email);
}
