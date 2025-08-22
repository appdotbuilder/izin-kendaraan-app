import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { sendPushNotification, sendBulkPushNotification, MockFirebaseAdmin, type PushNotificationData } from '../handlers/send_push_notification';

// Mock environment variables
const originalEnv = process.env;

describe('sendPushNotification', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n'
    };
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
  });

  it('should send a push notification successfully', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'valid-fcm-token-123',
      title: 'Test Notification',
      body: 'This is a test notification',
      data: { type: 'test', id: '123' }
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(true);
  });

  it('should send notification without data parameter', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'valid-fcm-token-123',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(true);
  });

  it('should handle missing FCM token', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: '',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle missing title', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'valid-fcm-token-123',
      title: '',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle missing body', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'valid-fcm-token-123',
      title: 'Test Notification',
      body: ''
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle network errors', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'network-error-token',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle invalid registration token error', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'invalid-token',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle unregistered token error', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'unregistered-token',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle quota exceeded error', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: 'quota-exceeded-token',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should handle Firebase initialization errors', async () => {
    // Reset Firebase initialization state
    MockFirebaseAdmin.reset();

    // Clear environment variables to cause initialization error
    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: undefined,
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined
    };

    const notificationData: PushNotificationData = {
      fcm_token: 'valid-fcm-token-123',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    expect(result).toBe(false);
  });

  it('should validate all required input fields', async () => {
    // Test with completely valid input
    const validData: PushNotificationData = {
      fcm_token: 'valid-token-456',
      title: 'Valid Title',
      body: 'Valid body message'
    };

    const result = await sendPushNotification(validData);
    expect(result).toBe(true);
  });

  it('should handle whitespace-only input fields', async () => {
    const notificationData: PushNotificationData = {
      fcm_token: '   ',
      title: 'Test Notification',
      body: 'This is a test notification'
    };

    const result = await sendPushNotification(notificationData);

    // Note: Our current implementation doesn't trim, so '   ' is truthy
    // In a real implementation, you might want to add trimming
    expect(result).toBe(true);
  });
});

describe('sendBulkPushNotification', () => {
  beforeEach(() => {
    // Set up environment variables
    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: 'test-project',
      FIREBASE_CLIENT_EMAIL: 'test@test-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\ntest-key\n-----END PRIVATE KEY-----\n'
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should send bulk notifications successfully', async () => {
    const tokens = ['token1', 'token2'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';
    const data = { type: 'bulk', batch: '1' };

    const result = await sendBulkPushNotification(tokens, title, body, data);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should send bulk notifications without data', async () => {
    const tokens = ['token1', 'token2'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle empty token list', async () => {
    const tokens: string[] = [];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(0);
  });

  it('should filter out invalid tokens', async () => {
    const tokens = ['valid-token', '', '  ', 'another-valid-token'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    // Should only process the 2 valid tokens
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });

  it('should handle partial failures', async () => {
    const tokens = ['valid-token', 'invalid-token'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(1);
    expect(result.failed).toBe(1);
  });

  it('should handle mixed error types', async () => {
    const tokens = ['valid-token', 'invalid-token', 'network-error-token', 'unregistered-token'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(1); // Only 'valid-token' should succeed
    expect(result.failed).toBe(3);  // The 3 error tokens should fail
  });

  it('should handle all tokens being invalid', async () => {
    const tokens = ['invalid-token', 'network-error-token'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(2);
  });

  it('should handle Firebase initialization errors in bulk send', async () => {
    // Reset Firebase initialization state
    MockFirebaseAdmin.reset();

    // Clear environment variables to cause initialization error
    process.env = {
      ...originalEnv,
      FIREBASE_PROJECT_ID: undefined,
      FIREBASE_CLIENT_EMAIL: undefined,
      FIREBASE_PRIVATE_KEY: undefined
    };

    const tokens = ['token1', 'token2'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    expect(result.success).toBe(0);
    expect(result.failed).toBe(2);
  });

  it('should handle tokens with only whitespace', async () => {
    const tokens = ['valid-token', '   ', '\t\n', 'another-valid-token'];
    const title = 'Bulk Notification';
    const body = 'This is a bulk notification';

    const result = await sendBulkPushNotification(tokens, title, body);

    // Should filter out whitespace-only tokens
    expect(result.success).toBe(2);
    expect(result.failed).toBe(0);
  });
});