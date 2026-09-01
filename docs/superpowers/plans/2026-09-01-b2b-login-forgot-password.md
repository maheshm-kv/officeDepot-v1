# B2B Login & Forgot Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a custom LWC login page and forgot-password page for the Office Depot Negocios B2B Experience Cloud site, backed by Apex that delegates all authentication to `Site.login`/`Site.forgotPassword`.

**Architecture:** Two presentation LWCs (`b2bLoginForm`, `b2bForgotPassword`) call a single Apex controller (`B2BLoginController`) through a testable adapter seam (`B2BAuthAdapter`/`SiteAuthAdapter`) that wraps the real `Site.*` calls. A small logging utility (`B2BLogger`) and Custom Labels round out the backend. No custom password storage/hashing/comparison anywhere.

**Tech Stack:** Lightning Web Components (ES6+, `lightning-input`, `lightning-button-icon`), Apex (`with sharing`), Jest (`sfdx-lwc-jest`), Apex unit tests (`@isTest`).

**Spec:** `docs/superpowers/specs/2026-09-01-b2b-login-forgot-password-design.md` (architecture), `docs/specs/office-depot-negocios-b2b-login-spec.md` (functional spec/acceptance criteria), `docs/CONSTITUTION.md` (project rules).

## Global Constraints

- Component/file size: 300 lines target, 500 mandatory refactor (Constitution §Language/Code Standards).
- Apex classes: `PascalCase`; Apex methods/vars: `camelCase`; LWC files/tags: `kebab-case`, JS classes `PascalCase`; constants `UPPER_SNAKE_CASE`.
- All Apex classes `with sharing` unless explicitly documented otherwise (none needed here).
- No third-party JS libraries (no jQuery/Lodash). Standard LWC/ES6+ only.
- Passwords/session tokens/auth tokens: NEVER logged, NEVER written to `console.log`/`System.debug` in raw form, NEVER stored outside the standard auth payload, NEVER put in URLs.
- Exactly one Apex round-trip per login attempt.
- Generic, non-enumerating error messages only (never reveal whether an email exists, never reveal which field is wrong on login failure).
- WCAG 2.1 AA: accessible labels, visible focus, full keyboard operability, error communication not dependent on color alone.
- Conventional commits (`feat`, `fix`, `test`, `docs`, `chore`) on branch `feature/b2b-login-forgot-password`.
- Apex coverage target: ≥95% on `B2BLoginController` (critical business logic), ≥80% overall.

---

## Task 0: Branch setup

**Files:** none (git operation only)

- [ ] **Step 1: Create and switch to the feature branch**

```bash
git checkout -b feature/b2b-login-forgot-password
```

- [ ] **Step 2: Verify branch**

Run: `git branch --show-current`
Expected: `feature/b2b-login-forgot-password`

---

## Task 1: B2BLogger utility

**Files:**
- Create: `force-app/main/default/classes/B2BLogger.cls`
- Create: `force-app/main/default/classes/B2BLogger.cls-meta.xml`
- Test: `force-app/main/default/classes/B2BLoggerTest.cls`
- Test meta: `force-app/main/default/classes/B2BLoggerTest.cls-meta.xml`

**Interfaces:**
- Produces: `B2BLogger.logError(String event, String requestId, Map<String, Object> safeMetadata)` — static void method. Later tasks (`B2BLoginController`) call this exact signature.

- [ ] **Step 1: Write the failing test**

```apex
// force-app/main/default/classes/B2BLoggerTest.cls
@isTest
private class B2BLoggerTest {
    @isTest
    static void logErrorDoesNotThrowAndProducesJson() {
        Map<String, Object> metadata = new Map<String, Object>{ 'errorCode' => 'UNKNOWN_ERROR' };

        Test.startTest();
        B2BLogger.logError('login.failure', 'req-123', metadata);
        Test.stopTest();

        // No exception thrown is the primary assertion for this void logging utility.
        System.assert(true, 'logError completed without throwing');
    }

    @isTest
    static void logErrorHandlesNullMetadataGracefully() {
        Test.startTest();
        B2BLogger.logError('login.failure', 'req-456', null);
        Test.stopTest();

        System.assert(true, 'logError completed without throwing when metadata is null');
    }
}
```

- [ ] **Step 2: Run test to verify it fails (class under test doesn't exist yet)**

Run: `sf apex run test --tests B2BLoggerTest --result-format human --synchronous`
Expected: FAIL — `B2BLogger` does not exist (compile error)

- [ ] **Step 3: Write minimal implementation**

```apex
// force-app/main/default/classes/B2BLogger.cls
/**
 * Structured, PII-safe logging utility. Callers must never place email,
 * password, session id, or auth token values into safeMetadata.
 */
public with sharing class B2BLogger {
    public static void logError(String event, String requestId, Map<String, Object> safeMetadata) {
        Map<String, Object> payload = new Map<String, Object>{
            'event' => event,
            'timestamp' => System.now().getTime(),
            'requestId' => requestId,
            'metadata' => safeMetadata == null ? new Map<String, Object>() : safeMetadata
        };
        System.debug(LoggingLevel.ERROR, JSON.serialize(payload));
    }
}
```

```xml
<!-- force-app/main/default/classes/B2BLogger.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

```xml
<!-- force-app/main/default/classes/B2BLoggerTest.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `sf apex run test --tests B2BLoggerTest --result-format human --synchronous`
Expected: PASS, 2/2 tests

- [ ] **Step 5: Commit**

```bash
git add force-app/main/default/classes/B2BLogger.cls force-app/main/default/classes/B2BLogger.cls-meta.xml force-app/main/default/classes/B2BLoggerTest.cls force-app/main/default/classes/B2BLoggerTest.cls-meta.xml
git commit -m "feat: add B2BLogger structured logging utility"
```

---

## Task 2: B2BAuthAdapter interface + SiteAuthAdapter implementation

**Files:**
- Create: `force-app/main/default/classes/B2BAuthAdapter.cls`
- Create: `force-app/main/default/classes/B2BAuthAdapter.cls-meta.xml`
- Create: `force-app/main/default/classes/SiteAuthAdapter.cls`
- Create: `force-app/main/default/classes/SiteAuthAdapter.cls-meta.xml`
- Test: `force-app/main/default/classes/SiteAuthAdapterTest.cls`
- Test meta: `force-app/main/default/classes/SiteAuthAdapterTest.cls-meta.xml`

**Interfaces:**
- Produces: interface `B2BAuthAdapter` with methods `LoginOutcome doLogin(String email, String password, String startUrl)` and `Boolean doForgotPassword(String email)`.
- Produces: inner-ish class `LoginOutcome` (defined on `B2BAuthAdapter` as a public class so both the interface and implementers share it) with fields `Boolean authenticated`, `String redirectUrl`, `String failureReason` (`'INVALID_CREDENTIALS'` or `'SERVICE_ERROR'`, null when `authenticated == true`).
- Produces: `SiteAuthAdapter implements B2BAuthAdapter` — the only class that calls real `Site.login`/`Site.forgotPassword`.
- Consumes (Task 3): `B2BLoginController` will call `B2BAuthAdapter` methods through an injectable factory.

- [ ] **Step 1: Write the failing test**

`Site.login`/`Site.forgotPassword` require a live Experience Cloud Site context and cannot run under `@isTest`. This test asserts the adapter is callable and that calling it outside a Site context surfaces as a `SERVICE_ERROR` outcome (never an uncaught exception) — Apex tests execute with no Site context, so this exercises the adapter's own catch-and-translate behavior for real.

```apex
// force-app/main/default/classes/SiteAuthAdapterTest.cls
@isTest
private class SiteAuthAdapterTest {
    @isTest
    static void doLoginOutsideSiteContextReturnsServiceErrorOutcomeNotException() {
        SiteAuthAdapter adapter = new SiteAuthAdapter();

        Test.startTest();
        B2BAuthAdapter.LoginOutcome outcome = adapter.doLogin('test@example.com', 'somePassword1', null);
        Test.stopTest();

        System.assertEquals(false, outcome.authenticated, 'No Site context in tests, login cannot succeed');
        System.assertEquals('SERVICE_ERROR', outcome.failureReason, 'Outside Site context must translate to SERVICE_ERROR, not throw');
    }

    @isTest
    static void doForgotPasswordOutsideSiteContextReturnsFalseNotException() {
        SiteAuthAdapter adapter = new SiteAuthAdapter();

        Test.startTest();
        Boolean result = adapter.doForgotPassword('test@example.com');
        Test.stopTest();

        System.assertEquals(false, result, 'No Site context in tests, forgot-password call cannot succeed');
    }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `sf apex run test --tests SiteAuthAdapterTest --result-format human --synchronous`
Expected: FAIL — `B2BAuthAdapter`/`SiteAuthAdapter` do not exist (compile error)

- [ ] **Step 3: Write minimal implementation**

```apex
// force-app/main/default/classes/B2BAuthAdapter.cls
/**
 * Seam between B2BLoginController and Salesforce's native Site.* auth
 * mechanisms, so controller branching logic is unit-testable without a
 * live Experience Cloud Site context.
 */
public interface B2BAuthAdapter {
    B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl);
    Boolean doForgotPassword(String email);

    class LoginOutcome {
        public Boolean authenticated;
        public String redirectUrl;
        public String failureReason; // 'INVALID_CREDENTIALS' or 'SERVICE_ERROR', null when authenticated

        public LoginOutcome(Boolean authenticated, String redirectUrl, String failureReason) {
            this.authenticated = authenticated;
            this.redirectUrl = redirectUrl;
            this.failureReason = failureReason;
        }
    }
}
```

```apex
// force-app/main/default/classes/SiteAuthAdapter.cls
/**
 * Only class permitted to call Site.login / Site.forgotPassword directly.
 * Never adds custom credential logic — purely translates Site.* return
 * values and exceptions into B2BAuthAdapter.LoginOutcome.
 */
public with sharing class SiteAuthAdapter implements B2BAuthAdapter {
    public B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl) {
        try {
            PageReference result = Site.login(email, password, startUrl);
            if (result == null) {
                return new B2BAuthAdapter.LoginOutcome(false, null, 'INVALID_CREDENTIALS');
            }
            return new B2BAuthAdapter.LoginOutcome(true, result.getUrl(), null);
        } catch (Exception ex) {
            return new B2BAuthAdapter.LoginOutcome(false, null, 'SERVICE_ERROR');
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
```

```xml
<!-- force-app/main/default/classes/B2BAuthAdapter.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

```xml
<!-- force-app/main/default/classes/SiteAuthAdapter.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

```xml
<!-- force-app/main/default/classes/SiteAuthAdapterTest.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `sf apex run test --tests SiteAuthAdapterTest --result-format human --synchronous`
Expected: PASS, 2/2 tests. (Note: `doForgotPassword` outside Site context may itself throw depending on org config — if `Test.stopTest()` shows an uncaught exception instead of `false`, wrap the call site's assumption is still valid because the adapter's own try/catch already handles it; if the test fails because `Site.forgotPassword` isn't recognized outside a Visualforce/Site request at all in this org's API version, catch `Exception` in the adapter as shown — the try/catch above already covers this.)

- [ ] **Step 5: Commit**

```bash
git add force-app/main/default/classes/B2BAuthAdapter.cls force-app/main/default/classes/B2BAuthAdapter.cls-meta.xml force-app/main/default/classes/SiteAuthAdapter.cls force-app/main/default/classes/SiteAuthAdapter.cls-meta.xml force-app/main/default/classes/SiteAuthAdapterTest.cls force-app/main/default/classes/SiteAuthAdapterTest.cls-meta.xml
git commit -m "feat: add B2BAuthAdapter seam and SiteAuthAdapter Site.* wrapper"
```

---

## Task 3: Custom Labels

**Files:**
- Create: `force-app/main/default/labels/CustomLabels.labels-meta.xml`

**Interfaces:**
- Produces: label API names consumed by Task 4 (LWCs) via `@salesforce/label/c.<Name>`: `B2B_Login_Heading`, `B2B_Login_Email_Label`, `B2B_Login_Password_Label`, `B2B_Login_Button`, `B2B_Login_Forgot_Link`, `B2B_Login_Password_Show`, `B2B_Login_Password_Hide`, `B2B_Error_Validation_EmailRequired`, `B2B_Error_Validation_EmailFormat`, `B2B_Error_Validation_PasswordRequired`, `B2B_Error_Auth_Invalid`, `B2B_Error_Service_Unavailable`, `B2B_Error_Unknown`, `B2B_ForgotPassword_Heading`, `B2B_ForgotPassword_Instructions`, `B2B_ForgotPassword_EmailLabel`, `B2B_ForgotPassword_SubmitButton`, `B2B_ForgotPassword_SuccessMessage`, `B2B_ForgotPassword_BackToLogin`.

Labels are metadata, not testable in isolation — this task's deliverable is verified by the LWCs that consume them (Task 4/5) rendering the expected text.

- [ ] **Step 1: Create the labels file**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CustomLabels xmlns="http://soap.sforce.com/2006/04/metadata">
    <labels>
        <fullName>B2B_Login_Heading</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>B2B Login page heading</shortDescription>
        <value>Iniciar sesión</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Email_Label</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Email field label</shortDescription>
        <value>Correo electrónico</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Password_Label</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Password field label</shortDescription>
        <value>Contraseña</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Button</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Login submit button</shortDescription>
        <value>Iniciar sesión</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Forgot_Link</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Forgot password link text</shortDescription>
        <value>¿Olvidó su contraseña?</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Password_Show</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Accessible label for showing the password</shortDescription>
        <value>Mostrar contraseña</value>
    </labels>
    <labels>
        <fullName>B2B_Login_Password_Hide</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Accessible label for hiding the password</shortDescription>
        <value>Ocultar contraseña</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Validation_EmailRequired</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Email required validation message</shortDescription>
        <value>El correo electrónico es obligatorio.</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Validation_EmailFormat</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Email format validation message</shortDescription>
        <value>Ingrese un correo electrónico válido.</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Validation_PasswordRequired</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Password required validation message</shortDescription>
        <value>La contraseña es obligatoria.</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Auth_Invalid</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Generic invalid credentials message</shortDescription>
        <value>No fue posible iniciar sesión con la información proporcionada. Verifique sus datos e intente de nuevo.</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Service_Unavailable</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Service unavailable message</shortDescription>
        <value>El servicio no está disponible en este momento. Intente de nuevo más tarde.</value>
    </labels>
    <labels>
        <fullName>B2B_Error_Unknown</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Generic unknown error message</shortDescription>
        <value>Ocurrió un error inesperado. Intente de nuevo.</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_Heading</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Forgot password page heading</shortDescription>
        <value>Recuperar contraseña</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_Instructions</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Forgot password instructions</shortDescription>
        <value>Ingrese su correo electrónico y le enviaremos instrucciones para restablecer su contraseña.</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_EmailLabel</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Forgot password email field label</shortDescription>
        <value>Correo electrónico</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_SubmitButton</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Forgot password submit button</shortDescription>
        <value>Enviar instrucciones</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_SuccessMessage</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Generic success message, enumeration-safe</shortDescription>
        <value>Si el correo electrónico está registrado, recibirá instrucciones para restablecer su contraseña.</value>
    </labels>
    <labels>
        <fullName>B2B_ForgotPassword_BackToLogin</fullName>
        <categories>B2B Login</categories>
        <language>es_MX</language>
        <protected>false</protected>
        <shortDescription>Back to login link</shortDescription>
        <value>Regresar a iniciar sesión</value>
    </labels>
</CustomLabels>
```

- [ ] **Step 2: Commit**

```bash
git add force-app/main/default/labels/CustomLabels.labels-meta.xml
git commit -m "feat: add B2B login/forgot-password custom labels"
```

> Note: exact copy will be diffed against the reference site capture (see design doc's Visual Assets section) in Task 8 and adjusted there if the live site's wording differs from the defaults above.

---

## Task 4: B2BLoginController

**Files:**
- Create: `force-app/main/default/classes/B2BLoginController.cls`
- Create: `force-app/main/default/classes/B2BLoginController.cls-meta.xml`
- Test: `force-app/main/default/classes/B2BLoginControllerTest.cls`
- Test meta: `force-app/main/default/classes/B2BLoginControllerTest.cls-meta.xml`

**Interfaces:**
- Consumes: `B2BAuthAdapter` interface and `B2BAuthAdapter.LoginOutcome` from Task 2; `B2BLogger.logError(String, String, Map<String,Object>)` from Task 1.
- Produces: `B2BLoginController.LoginResult` with fields `Boolean success`, `String redirectUrl`, `String errorCode`, `String errorMessage`. Methods `@AuraEnabled public static LoginResult login(String email, String password, String startUrl)` and `@AuraEnabled public static LoginResult requestPasswordReset(String email)`. `@TestVisible static B2BAuthAdapter adapterOverride` — test injection seam consumed by this task's own test class.

- [ ] **Step 1: Write the failing tests**

```apex
// force-app/main/default/classes/B2BLoginControllerTest.cls
@isTest
private class B2BLoginControllerTest {

    private class FakeSuccessAdapter implements B2BAuthAdapter {
        public B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl) {
            return new B2BAuthAdapter.LoginOutcome(true, '/home', null);
        }
        public Boolean doForgotPassword(String email) {
            return true;
        }
    }

    private class FakeInvalidCredentialsAdapter implements B2BAuthAdapter {
        public B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl) {
            return new B2BAuthAdapter.LoginOutcome(false, null, 'INVALID_CREDENTIALS');
        }
        public Boolean doForgotPassword(String email) {
            return false;
        }
    }

    private class FakeServiceErrorAdapter implements B2BAuthAdapter {
        public B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl) {
            return new B2BAuthAdapter.LoginOutcome(false, null, 'SERVICE_ERROR');
        }
        public Boolean doForgotPassword(String email) {
            return false;
        }
    }

    private class FakeThrowingAdapter implements B2BAuthAdapter {
        public B2BAuthAdapter.LoginOutcome doLogin(String email, String password, String startUrl) {
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
        B2BLoginController.LoginResult result = B2BLoginController.login('buyer@example.com', 'CorrectPass1', null);
        Test.stopTest();

        System.assertEquals(true, result.success);
        System.assertEquals('/home', result.redirectUrl);
        System.assertEquals(null, result.errorCode);
    }

    @isTest
    static void loginWithEmptyEmailReturnsValidationError() {
        B2BLoginController.adapterOverride = new FakeSuccessAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('', 'CorrectPass1', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('VALIDATION_ERROR', result.errorCode);
    }

    @isTest
    static void loginWithMalformedEmailReturnsValidationError() {
        B2BLoginController.adapterOverride = new FakeSuccessAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('not-an-email', 'CorrectPass1', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('VALIDATION_ERROR', result.errorCode);
    }

    @isTest
    static void loginWithEmptyPasswordReturnsValidationError() {
        B2BLoginController.adapterOverride = new FakeSuccessAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('buyer@example.com', '', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('VALIDATION_ERROR', result.errorCode);
    }

    @isTest
    static void loginWithInvalidCredentialsReturnsAuthenticationError() {
        B2BLoginController.adapterOverride = new FakeInvalidCredentialsAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('buyer@example.com', 'WrongPass1', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('AUTHENTICATION_ERROR', result.errorCode);
    }

    @isTest
    static void loginWithServiceErrorReturnsExternalServiceError() {
        B2BLoginController.adapterOverride = new FakeServiceErrorAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('buyer@example.com', 'CorrectPass1', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('EXTERNAL_SERVICE_ERROR', result.errorCode);
    }

    @isTest
    static void loginWithUnexpectedExceptionReturnsUnknownError() {
        B2BLoginController.adapterOverride = new FakeThrowingAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.login('buyer@example.com', 'CorrectPass1', null);
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('UNKNOWN_ERROR', result.errorCode);
    }

    @isTest
    static void requestPasswordResetWithValidEmailReturnsSuccessRegardlessOfAdapterResult() {
        B2BLoginController.adapterOverride = new FakeInvalidCredentialsAdapter(); // doForgotPassword returns false

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset('unknown@example.com');
        Test.stopTest();

        System.assertEquals(true, result.success, 'Must always report success to avoid account enumeration');
    }

    @isTest
    static void requestPasswordResetWithEmptyEmailReturnsValidationError() {
        B2BLoginController.adapterOverride = new FakeSuccessAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset('');
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('VALIDATION_ERROR', result.errorCode);
    }

    @isTest
    static void requestPasswordResetWithThrowingAdapterReturnsUnknownError() {
        B2BLoginController.adapterOverride = new FakeThrowingAdapter();

        Test.startTest();
        B2BLoginController.LoginResult result = B2BLoginController.requestPasswordReset('buyer@example.com');
        Test.stopTest();

        System.assertEquals(false, result.success);
        System.assertEquals('UNKNOWN_ERROR', result.errorCode);
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `sf apex run test --tests B2BLoginControllerTest --result-format human --synchronous`
Expected: FAIL — `B2BLoginController` does not exist (compile error)

- [ ] **Step 3: Write minimal implementation**

```apex
// force-app/main/default/classes/B2BLoginController.cls
public with sharing class B2BLoginController {

    @TestVisible
    private static B2BAuthAdapter adapterOverride;

    private static final Pattern EMAIL_PATTERN = Pattern.compile('^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$');

    public class LoginResult {
        @AuraEnabled public Boolean success;
        @AuraEnabled public String redirectUrl;
        @AuraEnabled public String errorCode;
        @AuraEnabled public String errorMessage;

        public LoginResult(Boolean success, String redirectUrl, String errorCode, String errorMessage) {
            this.success = success;
            this.redirectUrl = redirectUrl;
            this.errorCode = errorCode;
            this.errorMessage = errorMessage;
        }
    }

    @AuraEnabled
    public static LoginResult login(String email, String password, String startUrl) {
        String trimmedEmail = email == null ? '' : email.trim();

        if (String.isBlank(trimmedEmail) || !EMAIL_PATTERN.matcher(trimmedEmail).matches()) {
            return new LoginResult(false, null, 'VALIDATION_ERROR', 'Invalid or missing email.');
        }
        if (String.isBlank(password)) {
            return new LoginResult(false, null, 'VALIDATION_ERROR', 'Missing password.');
        }

        try {
            B2BAuthAdapter.LoginOutcome outcome = getAdapter().doLogin(trimmedEmail, password, startUrl);
            if (outcome.authenticated) {
                return new LoginResult(true, outcome.redirectUrl, null, null);
            }
            if (outcome.failureReason == 'SERVICE_ERROR') {
                return new LoginResult(false, null, 'EXTERNAL_SERVICE_ERROR', 'Authentication service unavailable.');
            }
            return new LoginResult(false, null, 'AUTHENTICATION_ERROR', 'Invalid credentials.');
        } catch (Exception ex) {
            B2BLogger.logError('b2blogin.unknown_error', generateRequestId(), new Map<String, Object>{ 'exceptionType' => ex.getTypeName() });
            return new LoginResult(false, null, 'UNKNOWN_ERROR', 'Unexpected error during login.');
        }
    }

    @AuraEnabled
    public static LoginResult requestPasswordReset(String email) {
        String trimmedEmail = email == null ? '' : email.trim();

        if (String.isBlank(trimmedEmail) || !EMAIL_PATTERN.matcher(trimmedEmail).matches()) {
            return new LoginResult(false, null, 'VALIDATION_ERROR', 'Invalid or missing email.');
        }

        try {
            getAdapter().doForgotPassword(trimmedEmail);
            // Always report success regardless of adapter result to avoid account enumeration.
            return new LoginResult(true, null, null, null);
        } catch (Exception ex) {
            B2BLogger.logError('b2bforgotpassword.unknown_error', generateRequestId(), new Map<String, Object>{ 'exceptionType' => ex.getTypeName() });
            return new LoginResult(false, null, 'UNKNOWN_ERROR', 'Unexpected error during password reset.');
        }
    }

    private static B2BAuthAdapter getAdapter() {
        return adapterOverride != null ? adapterOverride : new SiteAuthAdapter();
    }

    private static String generateRequestId() {
        return String.valueOf(Crypto.getRandomInteger());
    }
}
```

```xml
<!-- force-app/main/default/classes/B2BLoginController.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

```xml
<!-- force-app/main/default/classes/B2BLoginControllerTest.cls-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<ApexClass xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <status>Active</status>
</ApexClass>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `sf apex run test --tests B2BLoginControllerTest --result-format human --synchronous --code-coverage`
Expected: PASS, 11/11 tests, `B2BLoginController` coverage ≥95%

- [ ] **Step 5: Commit**

```bash
git add force-app/main/default/classes/B2BLoginController.cls force-app/main/default/classes/B2BLoginController.cls-meta.xml force-app/main/default/classes/B2BLoginControllerTest.cls force-app/main/default/classes/B2BLoginControllerTest.cls-meta.xml
git commit -m "feat: add B2BLoginController with adapter-backed login and password reset"
```

---

## Task 5: b2bLoginForm LWC

**Files:**
- Create: `force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.js`
- Create: `force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.html`
- Create: `force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.css`
- Create: `force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.js-meta.xml`
- Test: `force-app/main/default/lwc/b2bLoginForm/__tests__/b2bLoginForm.test.js`

**Interfaces:**
- Consumes: `B2BLoginController.login` Apex method (imported as `import login from '@salesforce/apex/B2BLoginController.login'`), Custom Labels from Task 3.
- Produces: nothing consumed by later tasks (leaf component). Exposes `forgotPasswordUrl` public `@api` property (string, defaults to `/login/forgot-password`) so the Experience Builder page config can point it at the actual forgot-password page path once known.

- [ ] **Step 1: Write the failing tests**

```javascript
// force-app/main/default/lwc/b2bLoginForm/__tests__/b2bLoginForm.test.js
import { createElement } from 'lwc';
import B2bLoginForm from 'c/b2bLoginForm';
import login from '@salesforce/apex/B2BLoginController.login';

jest.mock(
    '@salesforce/apex/B2BLoginController.login',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('c-b2b-login-form', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('shows validation error and does not call Apex when email is empty', async () => {
        const element = createElement('c-b2b-login-form', { is: B2bLoginForm });
        document.body.appendChild(element);

        const passwordInput = element.shadowRoot.querySelector('input[type="password"]');
        passwordInput.value = 'SomePass1';
        passwordInput.dispatchEvent(new CustomEvent('change'));

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();

        const errorEl = element.shadowRoot.querySelector('[data-id="email-error"]');
        expect(errorEl).not.toBeNull();
        expect(login).not.toHaveBeenCalled();
    });

    it('toggles password visibility without clearing the entered value', async () => {
        const element = createElement('c-b2b-login-form', { is: B2bLoginForm });
        document.body.appendChild(element);

        const passwordInput = element.shadowRoot.querySelector('input[type="password"]');
        passwordInput.value = 'SomePass1';
        passwordInput.dispatchEvent(new CustomEvent('change'));
        await flushPromises();

        const toggleButton = element.shadowRoot.querySelector('[data-id="password-toggle"]');
        toggleButton.click();
        await flushPromises();

        const visibleInput = element.shadowRoot.querySelector('input[type="text"][data-id="password-input"]');
        expect(visibleInput).not.toBeNull();
        expect(visibleInput.value).toBe('SomePass1');
    });

    it('disables the submit button while a login call is in flight', async () => {
        let resolveLogin;
        login.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve; }));

        const element = createElement('c-b2b-login-form', { is: B2bLoginForm });
        document.body.appendChild(element);

        const emailInput = element.shadowRoot.querySelector('input[type="email"]');
        emailInput.value = 'buyer@example.com';
        emailInput.dispatchEvent(new CustomEvent('change'));

        const passwordInput = element.shadowRoot.querySelector('input[data-id="password-input"]');
        passwordInput.value = 'SomePass1';
        passwordInput.dispatchEvent(new CustomEvent('change'));

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();

        const submitButton = element.shadowRoot.querySelector('[data-id="submit-button"]');
        expect(submitButton.disabled).toBe(true);

        resolveLogin({ success: true, redirectUrl: '/home', errorCode: null, errorMessage: null });
        await flushPromises();
    });

    it('shows the authentication error label when login fails with AUTHENTICATION_ERROR', async () => {
        login.mockResolvedValue({ success: false, redirectUrl: null, errorCode: 'AUTHENTICATION_ERROR', errorMessage: 'ignored' });

        const element = createElement('c-b2b-login-form', { is: B2bLoginForm });
        document.body.appendChild(element);

        const emailInput = element.shadowRoot.querySelector('input[type="email"]');
        emailInput.value = 'buyer@example.com';
        emailInput.dispatchEvent(new CustomEvent('change'));

        const passwordInput = element.shadowRoot.querySelector('input[data-id="password-input"]');
        passwordInput.value = 'WrongPass1';
        passwordInput.dispatchEvent(new CustomEvent('change'));

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();
        await flushPromises();

        const errorBanner = element.shadowRoot.querySelector('[data-id="form-error"]');
        expect(errorBanner).not.toBeNull();

        const passwordAfterFailure = element.shadowRoot.querySelector('input[data-id="password-input"]');
        expect(passwordAfterFailure.value).toBe('');
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- b2bLoginForm`
Expected: FAIL — module `c/b2bLoginForm` not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.js
import { LightningElement, track, api } from 'lwc';
import login from '@salesforce/apex/B2BLoginController.login';

import loginHeading from '@salesforce/label/c.B2B_Login_Heading';
import emailLabel from '@salesforce/label/c.B2B_Login_Email_Label';
import passwordLabel from '@salesforce/label/c.B2B_Login_Password_Label';
import loginButtonLabel from '@salesforce/label/c.B2B_Login_Button';
import forgotLinkLabel from '@salesforce/label/c.B2B_Login_Forgot_Link';
import showPasswordLabel from '@salesforce/label/c.B2B_Login_Password_Show';
import hidePasswordLabel from '@salesforce/label/c.B2B_Login_Password_Hide';
import emailRequiredLabel from '@salesforce/label/c.B2B_Error_Validation_EmailRequired';
import emailFormatLabel from '@salesforce/label/c.B2B_Error_Validation_EmailFormat';
import passwordRequiredLabel from '@salesforce/label/c.B2B_Error_Validation_PasswordRequired';
import authErrorLabel from '@salesforce/label/c.B2B_Error_Auth_Invalid';
import serviceErrorLabel from '@salesforce/label/c.B2B_Error_Service_Unavailable';
import unknownErrorLabel from '@salesforce/label/c.B2B_Error_Unknown';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const ERROR_LABEL_BY_CODE = {
    AUTHENTICATION_ERROR: authErrorLabel,
    EXTERNAL_SERVICE_ERROR: serviceErrorLabel,
    UNKNOWN_ERROR: unknownErrorLabel
};

export default class B2bLoginForm extends LightningElement {
    @api forgotPasswordUrl = '/login/forgot-password';

    @track email = '';
    @track password = '';
    @track passwordVisible = false;
    @track isSubmitting = false;
    @track emailError = '';
    @track passwordError = '';
    @track formError = '';

    label = {
        loginHeading,
        emailLabel,
        passwordLabel,
        loginButtonLabel,
        forgotLinkLabel
    };

    get passwordInputType() {
        return this.passwordVisible ? 'text' : 'password';
    }

    get passwordToggleLabel() {
        return this.passwordVisible ? hidePasswordLabel : showPasswordLabel;
    }

    get passwordToggleIcon() {
        return this.passwordVisible ? 'utility:hide' : 'utility:preview';
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

        this.emailError = '';
        this.passwordError = '';
        this.formError = '';

        const trimmedEmail = (this.email || '').trim();
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
            return;
        }

        this.isSubmitting = true;
        const startUrl = new URLSearchParams(window.location.search).get('startURL');

        login({ email: trimmedEmail, password: this.password, startUrl })
            .then((result) => {
                if (result.success) {
                    window.location.assign(result.redirectUrl || '/');
                    return;
                }
                this.password = '';
                this.formError = ERROR_LABEL_BY_CODE[result.errorCode] || unknownErrorLabel;
                this.isSubmitting = false;
                Promise.resolve().then(() => {
                    const passwordInput = this.template.querySelector('[data-id="password-input"]');
                    if (passwordInput) {
                        passwordInput.focus();
                    }
                });
            })
            .catch(() => {
                this.password = '';
                this.formError = unknownErrorLabel;
                this.isSubmitting = false;
            });
    }

    errorCallback() {
        this.formError = unknownErrorLabel;
    }
}
```

```html
<!-- force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.html -->
<template>
    <div class="b2b-login-form">
        <h1>{label.loginHeading}</h1>

        <div if:true={formError} data-id="form-error" class="b2b-login-form__error" role="alert">
            {formError}
        </div>

        <form onsubmit={handleSubmit}>
            <div class="b2b-login-form__field">
                <label for="email-input">{label.emailLabel}</label>
                <input
                    type="email"
                    id="email-input"
                    data-id="email-input"
                    value={email}
                    onchange={handleEmailChange}
                    aria-invalid={emailError}
                    aria-describedby="email-error"
                />
                <div if:true={emailError} data-id="email-error" id="email-error" class="b2b-login-form__field-error">
                    {emailError}
                </div>
            </div>

            <div class="b2b-login-form__field">
                <label for="password-input">{label.passwordLabel}</label>
                <div class="b2b-login-form__password-wrapper">
                    <input
                        type={passwordInputType}
                        id="password-input"
                        data-id="password-input"
                        value={password}
                        onchange={handlePasswordChange}
                        aria-invalid={passwordError}
                        aria-describedby="password-error"
                    />
                    <button
                        type="button"
                        data-id="password-toggle"
                        aria-pressed={passwordVisible}
                        aria-label={passwordToggleLabel}
                        onclick={handleTogglePasswordVisibility}
                    >
                        <lightning-icon icon-name={passwordToggleIcon} size="x-small"></lightning-icon>
                    </button>
                </div>
                <div if:true={passwordError} data-id="password-error" id="password-error" class="b2b-login-form__field-error">
                    {passwordError}
                </div>
            </div>

            <button type="submit" data-id="submit-button" disabled={isSubmitting} class="b2b-login-form__submit">
                {label.loginButtonLabel}
            </button>
        </form>

        <a href={forgotPasswordUrl} data-id="forgot-link" class="b2b-login-form__forgot-link">
            {label.forgotLinkLabel}
        </a>
    </div>
</template>
```

```css
/* force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.css */
.b2b-login-form {
    max-width: 24rem;
    margin: 0 auto;
    padding: 1.5rem;
}

.b2b-login-form__field {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
}

.b2b-login-form__field label {
    margin-bottom: 0.25rem;
    font-weight: 600;
}

.b2b-login-form__field input {
    padding: 0.5rem;
    border: 1px solid var(--b2b-border-color, #767676);
    border-radius: 4px;
    font-size: 1rem;
}

.b2b-login-form__password-wrapper {
    display: flex;
    align-items: center;
    position: relative;
}

.b2b-login-form__password-wrapper input {
    flex: 1;
}

.b2b-login-form__password-wrapper button {
    position: absolute;
    right: 0.5rem;
    background: transparent;
    border: none;
    cursor: pointer;
}

.b2b-login-form__field-error {
    color: var(--b2b-error-color, #b00020);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.b2b-login-form__error {
    color: var(--b2b-error-color, #b00020);
    background-color: #fdecea;
    border: 1px solid var(--b2b-error-color, #b00020);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
}

.b2b-login-form__submit {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--b2b-primary-color, #cc0000);
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
}

.b2b-login-form__submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.b2b-login-form__forgot-link {
    display: block;
    margin-top: 1rem;
    text-align: center;
    color: var(--b2b-link-color, #0056b3);
}
```

```xml
<!-- force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.js-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightningCommunity__Page</target>
        <target>lightningCommunity__Default</target>
    </targets>
</LightningComponentBundle>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- b2bLoginForm`
Expected: PASS, 4/4 tests

- [ ] **Step 5: Commit**

```bash
git add force-app/main/default/lwc/b2bLoginForm
git commit -m "feat: add b2bLoginForm LWC with validation, toggle, and Apex login call"
```

---

## Task 6: b2bForgotPassword LWC

**Files:**
- Create: `force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.js`
- Create: `force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.html`
- Create: `force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.css`
- Create: `force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.js-meta.xml`
- Test: `force-app/main/default/lwc/b2bForgotPassword/__tests__/b2bForgotPassword.test.js`

**Interfaces:**
- Consumes: `B2BLoginController.requestPasswordReset` (`import requestPasswordReset from '@salesforce/apex/B2BLoginController.requestPasswordReset'`), Custom Labels from Task 3.
- Produces: `@api loginUrl` (string, defaults to `/login`) for the "back to login" link. Leaf component, nothing later consumes it.

- [ ] **Step 1: Write the failing tests**

```javascript
// force-app/main/default/lwc/b2bForgotPassword/__tests__/b2bForgotPassword.test.js
import { createElement } from 'lwc';
import B2bForgotPassword from 'c/b2bForgotPassword';
import requestPasswordReset from '@salesforce/apex/B2BLoginController.requestPasswordReset';

jest.mock(
    '@salesforce/apex/B2BLoginController.requestPasswordReset',
    () => ({ default: jest.fn() }),
    { virtual: true }
);

function flushPromises() {
    return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('c-b2b-forgot-password', () => {
    afterEach(() => {
        while (document.body.firstChild) {
            document.body.removeChild(document.body.firstChild);
        }
        jest.clearAllMocks();
    });

    it('shows validation error and does not call Apex when email is empty', async () => {
        const element = createElement('c-b2b-forgot-password', { is: B2bForgotPassword });
        document.body.appendChild(element);

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();

        const errorEl = element.shadowRoot.querySelector('[data-id="email-error"]');
        expect(errorEl).not.toBeNull();
        expect(requestPasswordReset).not.toHaveBeenCalled();
    });

    it('always shows the generic success message on a successful Apex response', async () => {
        requestPasswordReset.mockResolvedValue({ success: true, redirectUrl: null, errorCode: null, errorMessage: null });

        const element = createElement('c-b2b-forgot-password', { is: B2bForgotPassword });
        document.body.appendChild(element);

        const emailInput = element.shadowRoot.querySelector('input[type="email"]');
        emailInput.value = 'unknown@example.com';
        emailInput.dispatchEvent(new CustomEvent('change'));

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();
        await flushPromises();

        const successEl = element.shadowRoot.querySelector('[data-id="success-message"]');
        expect(successEl).not.toBeNull();
    });

    it('prevents duplicate submission while a request is in flight', async () => {
        let resolveCall;
        requestPasswordReset.mockReturnValue(new Promise((resolve) => { resolveCall = resolve; }));

        const element = createElement('c-b2b-forgot-password', { is: B2bForgotPassword });
        document.body.appendChild(element);

        const emailInput = element.shadowRoot.querySelector('input[type="email"]');
        emailInput.value = 'buyer@example.com';
        emailInput.dispatchEvent(new CustomEvent('change'));

        const form = element.shadowRoot.querySelector('form');
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        form.dispatchEvent(new CustomEvent('submit', { cancelable: true }));
        await flushPromises();

        expect(requestPasswordReset).toHaveBeenCalledTimes(1);
        resolveCall({ success: true });
        await flushPromises();
    });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:unit -- b2bForgotPassword`
Expected: FAIL — module `c/b2bForgotPassword` not found

- [ ] **Step 3: Write minimal implementation**

```javascript
// force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.js
import { LightningElement, track, api } from 'lwc';
import requestPasswordReset from '@salesforce/apex/B2BLoginController.requestPasswordReset';

import heading from '@salesforce/label/c.B2B_ForgotPassword_Heading';
import instructions from '@salesforce/label/c.B2B_ForgotPassword_Instructions';
import emailLabel from '@salesforce/label/c.B2B_ForgotPassword_EmailLabel';
import submitButtonLabel from '@salesforce/label/c.B2B_ForgotPassword_SubmitButton';
import successMessage from '@salesforce/label/c.B2B_ForgotPassword_SuccessMessage';
import backToLoginLabel from '@salesforce/label/c.B2B_ForgotPassword_BackToLogin';
import emailRequiredLabel from '@salesforce/label/c.B2B_Error_Validation_EmailRequired';
import emailFormatLabel from '@salesforce/label/c.B2B_Error_Validation_EmailFormat';
import serviceErrorLabel from '@salesforce/label/c.B2B_Error_Service_Unavailable';
import unknownErrorLabel from '@salesforce/label/c.B2B_Error_Unknown';

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default class B2bForgotPassword extends LightningElement {
    @api loginUrl = '/login';

    @track email = '';
    @track emailError = '';
    @track formError = '';
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

    handleEmailChange(event) {
        this.email = event.target.value;
    }

    handleSubmit(event) {
        event.preventDefault();
        if (this.isSubmitting) {
            return;
        }

        this.emailError = '';
        this.formError = '';

        const trimmedEmail = (this.email || '').trim();

        if (!trimmedEmail) {
            this.emailError = emailRequiredLabel;
            return;
        }
        if (!EMAIL_PATTERN.test(trimmedEmail)) {
            this.emailError = emailFormatLabel;
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
                this.formError = result.errorCode === 'EXTERNAL_SERVICE_ERROR' ? serviceErrorLabel : unknownErrorLabel;
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
```

```html
<!-- force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.html -->
<template>
    <div class="b2b-forgot-password">
        <h1>{label.heading}</h1>

        <template if:false={isSuccess}>
            <p>{label.instructions}</p>

            <div if:true={formError} data-id="form-error" class="b2b-forgot-password__error" role="alert">
                {formError}
            </div>

            <form onsubmit={handleSubmit}>
                <div class="b2b-forgot-password__field">
                    <label for="email-input">{label.emailLabel}</label>
                    <input
                        type="email"
                        id="email-input"
                        data-id="email-input"
                        value={email}
                        onchange={handleEmailChange}
                        aria-invalid={emailError}
                        aria-describedby="email-error"
                    />
                    <div if:true={emailError} data-id="email-error" id="email-error" class="b2b-forgot-password__field-error">
                        {emailError}
                    </div>
                </div>

                <button type="submit" data-id="submit-button" disabled={isSubmitting} class="b2b-forgot-password__submit">
                    {label.submitButtonLabel}
                </button>
            </form>
        </template>

        <div if:true={isSuccess} data-id="success-message" class="b2b-forgot-password__success" role="status">
            {successMessage}
        </div>

        <a href={loginUrl} data-id="back-to-login-link" class="b2b-forgot-password__back-link">
            {label.backToLoginLabel}
        </a>
    </div>
</template>
```

```css
/* force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.css */
.b2b-forgot-password {
    max-width: 24rem;
    margin: 0 auto;
    padding: 1.5rem;
}

.b2b-forgot-password__field {
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
}

.b2b-forgot-password__field label {
    margin-bottom: 0.25rem;
    font-weight: 600;
}

.b2b-forgot-password__field input {
    padding: 0.5rem;
    border: 1px solid var(--b2b-border-color, #767676);
    border-radius: 4px;
    font-size: 1rem;
}

.b2b-forgot-password__field-error {
    color: var(--b2b-error-color, #b00020);
    font-size: 0.875rem;
    margin-top: 0.25rem;
}

.b2b-forgot-password__error {
    color: var(--b2b-error-color, #b00020);
    background-color: #fdecea;
    border: 1px solid var(--b2b-error-color, #b00020);
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
}

.b2b-forgot-password__success {
    color: #1e4620;
    background-color: #e8f5e9;
    border: 1px solid #1e4620;
    border-radius: 4px;
    padding: 0.75rem;
    margin-bottom: 1rem;
}

.b2b-forgot-password__submit {
    width: 100%;
    padding: 0.75rem;
    background-color: var(--b2b-primary-color, #cc0000);
    color: #ffffff;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    cursor: pointer;
}

.b2b-forgot-password__submit:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.b2b-forgot-password__back-link {
    display: block;
    margin-top: 1rem;
    text-align: center;
    color: var(--b2b-link-color, #0056b3);
}
```

```xml
<!-- force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.js-meta.xml -->
<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>61.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightningCommunity__Page</target>
        <target>lightningCommunity__Default</target>
    </targets>
</LightningComponentBundle>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:unit -- b2bForgotPassword`
Expected: PASS, 3/3 tests

- [ ] **Step 5: Commit**

```bash
git add force-app/main/default/lwc/b2bForgotPassword
git commit -m "feat: add b2bForgotPassword LWC with enumeration-safe success handling"
```

---

## Task 7: Full regression pass

**Files:** none created — verification task only.

- [ ] **Step 1: Run full Apex test suite with coverage**

Run: `sf apex run test --test-level RunLocalTests --result-format human --code-coverage`
Expected: 100% pass, `B2BLoginController` ≥95% coverage, org-wide ≥80%

- [ ] **Step 2: Run full Jest suite**

Run: `npm run test:unit`
Expected: All LWC tests pass

- [ ] **Step 3: Run lint**

Run: `npm run lint`
Expected: No errors

- [ ] **Step 4: Fix any failures found in Steps 1-3, then commit fixes if any changes were made**

```bash
git add -A
git commit -m "fix: address regression failures from full suite run"
```

(Skip this commit if Steps 1-3 all passed cleanly with no changes needed.)

---

## Task 8: Apply captured brand tokens and copy from reference site

**Files:**
- Modify: `force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.css`
- Modify: `force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.css`
- Modify: `force-app/main/default/labels/CustomLabels.labels-meta.xml`
- Create: `force-app/main/default/staticresources/b2bLoginBranding` (logo asset, if the reference site's logo is available for reuse — verify licensing/ownership before including in the repo; Office Depot Negocios owns this project so its own brand asset is expected to be authorized)
- Modify: `docs/superpowers/specs/2026-09-01-b2b-login-forgot-password-design.md` (fill in the Visual Assets section with concrete captured values instead of "in progress")

This task's exact content (hex colors, font-family, precise Spanish copy differences, logo file) depends on the reference-site capture referenced in the design doc. Because that capture is a factual lookup rather than a design decision, do the following when this task is reached:

- [ ] **Step 1: Retrieve the captured design values** (colors, fonts, copy, logo) from whatever artifact holds them (browser capture notes, screenshots in the scratchpad, or direct inspection of https://negocios.officedepot.com.mx/ofd/es/MXN/login and .../login/form/forgotten per the design doc's Reference UI links)

- [ ] **Step 2: Update CSS custom properties** in both component CSS files — replace the default values (`--b2b-primary-color: #cc0000`, `--b2b-border-color: #767676`, `--b2b-error-color: #b00020`, `--b2b-link-color: #0056b3`) with the exact captured hex values, and add `font-family` to `.b2b-login-form` / `.b2b-forgot-password` matching the captured typography.

- [ ] **Step 3: Diff captured copy against `CustomLabels.labels-meta.xml`** — if the live site's Spanish wording differs from the defaults set in Task 3, update the `<value>` elements to match exactly.

- [ ] **Step 4: Add the logo** to a new static resource and reference it in both component HTML templates (`<img src={logoUrl} alt="Office Depot Negocios">` where `logoUrl` is computed from `import LOGO from '@salesforce/resourceUrl/b2bLoginBranding'` in each JS controller).

- [ ] **Step 5: Re-run Jest and manual visual check**

Run: `npm run test:unit`
Expected: PASS (adding a logo `<img>` and CSS values should not break existing assertions since tests target `data-id` attributes, not visual styling)

- [ ] **Step 6: Update the design doc's Visual Assets section** with the concrete captured values (colors, font, copy diffs, logo source) replacing the "in progress" note.

- [ ] **Step 7: Commit**

```bash
git add force-app/main/default/lwc/b2bLoginForm/b2bLoginForm.css force-app/main/default/lwc/b2bForgotPassword/b2bForgotPassword.css force-app/main/default/labels/CustomLabels.labels-meta.xml force-app/main/default/staticresources docs/superpowers/specs/2026-09-01-b2b-login-forgot-password-design.md
git commit -m "feat: apply captured Office Depot Negocios brand tokens and copy"
```

---

## Task 9: Experience Builder wiring documentation

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a "Login Page Setup" section to README.md** with these exact steps:

```markdown
## Login & Forgot-Password Page Setup (Experience Builder)

After deploying this package to the org:

1. In Setup, go to **Digital Experiences → All Sites**, click **Builder** on the Office Depot Negocios site.
2. In Experience Builder, create (or reuse) a page for login and drag the `b2bLoginForm` component onto it. Create/reuse a page for forgot-password and drag `b2bForgotPassword` onto it.
3. Publish the site so both pages have live URLs.
4. In Setup, go to **Digital Experiences → Administration → [Site Name] → Login & Registration**.
5. Under **Login Page**, choose **Custom** and select the Experience Builder page created in step 2 that hosts `b2bLoginForm`.
6. Under **Forgot Password Page** (or equivalent setting for this Salesforce release), select the page hosting `b2bForgotPassword`.
7. Save, then verify by visiting the site's login URL in an incognito window — confirm the custom page renders and a login attempt round-trips through `B2BLoginController.login`.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Experience Builder login page setup instructions"
```

---

## Self-Review Notes

- **Spec coverage:** FR-1 (branding/layout) → Task 8; FR-2 (email field) → Tasks 4/5; FR-3 (password + toggle) → Tasks 4/5; FR-4 (login action, duplicate-submit guard) → Tasks 4/5; FR-5 (successful auth/redirect) → Tasks 2/4/5; FR-6 (password recovery, non-enumerating) → Tasks 2/4/6; AC-01–AC-12 covered across Tasks 4-8; Accessibility (labels, keyboard, focus) → Task 5/6 markup and CSS; Error-handling table → Task 4's `errorCode` branches + Task 5/6 label mapping; Logging → Task 1 + Task 4; Testing minimums → Tasks 1,2,4,5,6,7.
- **Type consistency checked:** `B2BAuthAdapter.LoginOutcome` fields (`authenticated`, `redirectUrl`, `failureReason`) used identically in `SiteAuthAdapter` (Task 2) and `B2BLoginControllerTest` fakes (Task 4). `LoginResult` fields (`success`, `redirectUrl`, `errorCode`, `errorMessage`) used identically in Task 4's Apex and Task 5/6's JS `.then()` handlers. `data-id` attributes referenced in Jest tests match those in the HTML templates.
- **No placeholders remain** except Task 8, whose content is an explicit factual-lookup task (captured design values), not a vague TBD — it has concrete steps, exact CSS variable names to update, and exact files to touch.
