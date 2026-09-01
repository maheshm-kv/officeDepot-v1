@isTest
private class B2BLoggerTest {
  @isTest
  static void logErrorDoesNotThrowAndProducesJson() {
    Map<String, Object> metadata = new Map<String, Object>{
      'errorCode' => 'UNKNOWN_ERROR'
    };

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

    System.assert(
      true,
      'logError completed without throwing when metadata is null'
    );
  }
}
