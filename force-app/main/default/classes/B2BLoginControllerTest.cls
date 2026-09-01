@isTest
private class B2BLoginControllerTest {
  private class FakeSuccessAdapter implements B2BAuthAdapter {
    public LoginOutcome doLogin(
      String email,
      String password,
      String startUrl
    ) {
      return new LoginOutcome(true, '/home', null);
    }
    public Boolean doForgotPassword(String email) {
      return true;
    }
  }

  private class FakeInvalidCredentialsAdapter implements B2BAuthAdapter {
    public LoginOutcome doLogin(
      String email,
      String password,
      String startUrl
    ) {
      return new LoginOutcome(false, null, 'INVALID_CREDENTIALS');
    }
    public Boolean doForgotPassword(String email) {
      return false;
    }
  }

  private class FakeServiceErrorAdapter implements B2BAuthAdapter {
    public LoginOutcome doLogin(
      String email,
      String password,
      String startUrl
    ) {
      return new LoginOutcome(false, null, 'SERVICE_ERROR');
    }
    public Boolean doForgotPassword(String email) {
      return false;
    }
  }

  private class FakeThrowingAdapter implements B2BAuthAdapter {
    public LoginOutcome doLogin(
      String email,
      String password,
      String startUrl
    ) {
      throw new System.NullPointerException();
    }
    public Boolean doForgotPassword(String email) {
      throw new System.NullPointerException();
    }
  }

  @isTest
  static void loginWithValidCredentialsReturnsSuccessAndRedirectUrl() {
    B2BLoginController.adapterOverride = new FakeSuccessAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'buyer@example.com',
      'CorrectPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(true, result.success);
    System.assertEquals('/home', result.redirectUrl);
    System.assertEquals(null, result.errorCode);
  }

  @isTest
  static void loginWithEmptyEmailReturnsValidationError() {
    B2BLoginController.adapterOverride = new FakeSuccessAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      '',
      'CorrectPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('VALIDATION_ERROR', result.errorCode);
  }

  @isTest
  static void loginWithMalformedEmailReturnsValidationError() {
    B2BLoginController.adapterOverride = new FakeSuccessAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'not-an-email',
      'CorrectPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('VALIDATION_ERROR', result.errorCode);
  }

  @isTest
  static void loginWithEmptyPasswordReturnsValidationError() {
    B2BLoginController.adapterOverride = new FakeSuccessAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'buyer@example.com',
      '',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('VALIDATION_ERROR', result.errorCode);
  }

  @isTest
  static void loginWithInvalidCredentialsReturnsAuthenticationError() {
    B2BLoginController.adapterOverride = new FakeInvalidCredentialsAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'buyer@example.com',
      'WrongPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('AUTHENTICATION_ERROR', result.errorCode);
  }

  @isTest
  static void loginWithServiceErrorReturnsExternalServiceError() {
    B2BLoginController.adapterOverride = new FakeServiceErrorAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'buyer@example.com',
      'CorrectPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('EXTERNAL_SERVICE_ERROR', result.errorCode);
  }

  @isTest
  static void loginWithUnexpectedExceptionReturnsUnknownError() {
    B2BLoginController.adapterOverride = new FakeThrowingAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.login(
      'buyer@example.com',
      'CorrectPass1',
      null
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('UNKNOWN_ERROR', result.errorCode);
  }

  @isTest
  static void requestPasswordResetWithValidEmailReturnsSuccessRegardlessOfAdapterResult() {
    B2BLoginController.adapterOverride = new FakeInvalidCredentialsAdapter(); // doForgotPassword returns false

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset(
      'unknown@example.com'
    );
    Test.stopTest();

    System.assertEquals(
      true,
      result.success,
      'Must always report success to avoid account enumeration'
    );
  }

  @isTest
  static void requestPasswordResetWithEmptyEmailReturnsValidationError() {
    B2BLoginController.adapterOverride = new FakeSuccessAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset(
      ''
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('VALIDATION_ERROR', result.errorCode);
  }

  @isTest
  static void requestPasswordResetWithThrowingAdapterReturnsUnknownError() {
    B2BLoginController.adapterOverride = new FakeThrowingAdapter();

    Test.startTest();
    B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset(
      'buyer@example.com'
    );
    Test.stopTest();

    System.assertEquals(false, result.success);
    System.assertEquals('UNKNOWN_ERROR', result.errorCode);
  }
}
