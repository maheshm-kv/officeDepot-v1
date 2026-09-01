/**
 * Result shape shared by B2BAuthAdapter and its implementers.
 *
 * Apex interfaces cannot contain nested types, so this is a top-level
 * class rather than a nested B2BAuthAdapter.LoginOutcome as originally
 * sketched in the plan — the shared contract is otherwise unchanged.
 */
public class LoginOutcome {
  public Boolean authenticated;
  public String redirectUrl;
  public String failureReason; // 'INVALID_CREDENTIALS' or 'SERVICE_ERROR', null when authenticated

  public LoginOutcome(
    Boolean authenticated,
    String redirectUrl,
    String failureReason
  ) {
    this.authenticated = authenticated;
    this.redirectUrl = redirectUrl;
    this.failureReason = failureReason;
  }
}
