/**
 * Only class permitted to call Site.login / Site.forgotPassword directly.
 * Never adds custom credential logic — purely translates Site.* return
 * values and exceptions into LoginOutcome.
 */
public with sharing class SiteAuthAdapter implements B2BAuthAdapter {
  public LoginOutcome doLogin(String email, String password, String startUrl) {
    try {
      PageReference result = Site.login(email, password, startUrl);
      if (result == null) {
        return new LoginOutcome(false, null, 'INVALID_CREDENTIALS');
      }
      return new LoginOutcome(true, result.getUrl(), null);
    } catch (Exception ex) {
      return new LoginOutcome(false, null, 'SERVICE_ERROR');
    }
  }

  public Boolean doForgotPassword(String email) {
    try {
      return Site.forgotPassword(email);
    } catch (Exception ex) {
      return false;
    }
  }
}
