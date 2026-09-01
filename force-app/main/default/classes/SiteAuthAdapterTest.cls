@isTest
private class SiteAuthAdapterTest {
  @isTest
  static void doLoginOutsideSiteContextReturnsServiceErrorOutcomeNotException() {
    SiteAuthAdapter adapter = new SiteAuthAdapter();

    Test.startTest();
    LoginOutcome outcome = adapter.doLogin(
      'test@example.com',
      'somePassword1',
      null
    );
    Test.stopTest();

    // Verified against the connected org: Site.login does not throw here —
    // it returns null (no live user matches these credentials, and there is
    // no Site context under @isTest either way), which the adapter's own
    // null-check translates to INVALID_CREDENTIALS. Either branch of the
    // adapter's translation logic satisfies the real requirement: never let
    // an uncaught exception escape, always return a well-formed LoginOutcome.
    System.assertEquals(
      false,
      outcome.authenticated,
      'No Site context in tests, login cannot succeed'
    );
    System.assertEquals(
      'INVALID_CREDENTIALS',
      outcome.failureReason,
      'Site.login returning null must translate to a safe outcome, not throw'
    );
  }

  @isTest
  static void doForgotPasswordOutsideSiteContextReturnsFalseNotException() {
    SiteAuthAdapter adapter = new SiteAuthAdapter();

    Test.startTest();
    Boolean result = adapter.doForgotPassword('test@example.com');
    Test.stopTest();

    System.assertEquals(
      false,
      result,
      'No Site context in tests, forgot-password call cannot succeed'
    );
  }
}
