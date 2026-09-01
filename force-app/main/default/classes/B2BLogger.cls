/**
 * Structured, PII-safe logging utility. Callers must never place email,
 * password, session id, or auth token values into safeMetadata.
 */
public with sharing class B2BLogger {
  public static void logError(
    String event,
    String requestId,
    Map<String, Object> safeMetadata
  ) {
    Map<String, Object> payload = new Map<String, Object>{
      'event' => event,
      'timestamp' => System.now().getTime(),
      'requestId' => requestId,
      'metadata' => safeMetadata == null
        ? new Map<String, Object>()
        : safeMetadata
    };
    System.debug(LoggingLevel.ERROR, JSON.serialize(payload));
  }
}
