/**
 * Central integration point for the B2B login/forgot-password LWCs.
 * Validates input server-side, delegates to a B2BAuthAdapter, and maps
 * adapter outcomes/exceptions to the constitution's error-code taxonomy
 * (VALIDATION_ERROR, AUTHENTICATION_ERROR, EXTERNAL_SERVICE_ERROR,
 * UNKNOWN_ERROR). Never logs email/password/tokens — only safe metadata.
 *
 * requestPasswordReset always reports success regardless of whether the
 * underlying email address exists, to prevent account enumeration.
 */
public with sharing class B2BLoginController {
  @TestVisible
  private static B2BAuthAdapter adapterOverride;

  private static final Pattern EMAIL_PATTERN = Pattern.compile(
    '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
  );

  public class LoginResult {
    @AuraEnabled
    public Boolean success;
    @AuraEnabled
    public String redirectUrl;
    @AuraEnabled
    public String errorCode;
    @AuraEnabled
    public String errorMessage;

    public LoginResult(
      Boolean success,
      String redirectUrl,
      String errorCode,
      String errorMessage
    ) {
      this.success = success;
      this.redirectUrl = redirectUrl;
      this.errorCode = errorCode;
      this.errorMessage = errorMessage;
    }
  }

  @AuraEnabled
  public static LoginResult login(
    String email,
    String password,
    String startUrl
  ) {
    String trimmedEmail = email == null ? '' : email.trim();

    if (
      String.isBlank(trimmedEmail) ||
      !EMAIL_PATTERN.matcher(trimmedEmail).matches()
    ) {
      return new LoginResult(
        false,
        null,
        'VALIDATION_ERROR',
        'Invalid or missing email.'
      );
    }
    if (String.isBlank(password)) {
      return new LoginResult(
        false,
        null,
        'VALIDATION_ERROR',
        'Missing password.'
      );
    }

    try {
      LoginOutcome outcome = getAdapter()
        .doLogin(trimmedEmail, password, startUrl);
      if (outcome.authenticated) {
        return new LoginResult(true, outcome.redirectUrl, null, null);
      }
      if (outcome.failureReason == 'SERVICE_ERROR') {
        return new LoginResult(
          false,
          null,
          'EXTERNAL_SERVICE_ERROR',
          'Authentication service unavailable.'
        );
      }
      return new LoginResult(
        false,
        null,
        'AUTHENTICATION_ERROR',
        'Invalid credentials.'
      );
    } catch (Exception ex) {
      B2BLogger.logError(
        'b2blogin.unknown_error',
        generateRequestId(),
        new Map<String, Object>{ 'exceptionType' => ex.getTypeName() }
      );
      return new LoginResult(
        false,
        null,
        'UNKNOWN_ERROR',
        'Unexpected error during login.'
      );
    }
  }

  @AuraEnabled
  public static LoginResult requestPasswordReset(String email) {
    String trimmedEmail = email == null ? '' : email.trim();

    if (
      String.isBlank(trimmedEmail) ||
      !EMAIL_PATTERN.matcher(trimmedEmail).matches()
    ) {
      return new LoginResult(
        false,
        null,
        'VALIDATION_ERROR',
        'Invalid or missing email.'
      );
    }

    try {
      getAdapter().doForgotPassword(trimmedEmail);
      // Always report success regardless of adapter result to avoid account enumeration.
      return new LoginResult(true, null, null, null);
    } catch (Exception ex) {
      B2BLogger.logError(
        'b2bforgotpassword.unknown_error',
        generateRequestId(),
        new Map<String, Object>{ 'exceptionType' => ex.getTypeName() }
      );
      return new LoginResult(
        false,
        null,
        'UNKNOWN_ERROR',
        'Unexpected error during password reset.'
      );
    }
  }

  private static B2BAuthAdapter getAdapter() {
    return adapterOverride != null ? adapterOverride : new SiteAuthAdapter();
  }

  private static String generateRequestId() {
    return String.valueOf(Crypto.getRandomInteger());
  }
}
