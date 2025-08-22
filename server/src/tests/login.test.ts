import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { login } from '../handlers/login';
import { eq } from 'drizzle-orm';

// Test user data
const testUserData = {
  nik: '1234567890',
  username: 'testuser',
  password: 'testpassword',
  nama: 'Test User',
  role: 'Karyawan' as const,
  fcm_token: null
};

describe('login', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user
  const createTestUser = async () => {
    const result = await db.insert(usersTable)
      .values(testUserData)
      .returning()
      .execute();
    return result[0];
  };

  it('should login successfully with valid credentials', async () => {
    // Create test user
    const testUser = await createTestUser();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password
    };

    const result = await login(loginInput);

    // Verify user data
    expect(result.user.id).toEqual(testUser.id);
    expect(result.user.username).toEqual(testUserData.username);
    expect(result.user.nama).toEqual(testUserData.nama);
    expect(result.user.role).toEqual(testUserData.role);
    expect(result.user.nik).toEqual(testUserData.nik);
    expect(result.user.created_at).toBeInstanceOf(Date);

    // Verify password is not included in response
    expect((result.user as any).password).toBeUndefined();

    // Verify token
    expect(result.token).toBeDefined();
    expect(typeof result.token).toEqual('string');

    // Verify token payload
    const decodedPayload = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decodedPayload.userId).toEqual(testUser.id);
    expect(decodedPayload.username).toEqual(testUserData.username);
    expect(decodedPayload.role).toEqual(testUserData.role);
    expect(decodedPayload.exp).toBeGreaterThan(Date.now());
  });

  it('should update FCM token when provided', async () => {
    // Create test user
    const testUser = await createTestUser();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password,
      fcm_token: 'new-fcm-token-123'
    };

    const result = await login(loginInput);

    // Verify FCM token is updated in response
    expect(result.user.fcm_token).toEqual('new-fcm-token-123');

    // Verify FCM token is updated in database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser[0].fcm_token).toEqual('new-fcm-token-123');
  });

  it('should not update FCM token when not provided', async () => {
    // Create test user with existing FCM token
    const existingFcmToken = 'existing-fcm-token';
    const userWithFcmToken = {
      ...testUserData,
      fcm_token: existingFcmToken
    };

    await db.insert(usersTable)
      .values(userWithFcmToken)
      .returning()
      .execute();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password
    };

    const result = await login(loginInput);

    // Verify existing FCM token is preserved
    expect(result.user.fcm_token).toEqual(existingFcmToken);
  });

  it('should throw error for invalid username', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: testUserData.password
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should throw error for invalid password', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: 'wrongpassword'
    };

    await expect(login(loginInput)).rejects.toThrow(/invalid username or password/i);
  });

  it('should work with different user roles', async () => {
    // Create HR user
    const hrUserData = {
      ...testUserData,
      username: 'hruser',
      role: 'HR' as const
    };

    await db.insert(usersTable)
      .values(hrUserData)
      .returning()
      .execute();

    const loginInput: LoginInput = {
      username: 'hruser',
      password: testUserData.password
    };

    const result = await login(loginInput);

    expect(result.user.role).toEqual('HR');
    expect(result.user.username).toEqual('hruser');

    // Verify token contains correct role
    const decodedPayload = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decodedPayload.role).toEqual('HR');
  });

  it('should handle empty FCM token string', async () => {
    // Create test user
    const testUser = await createTestUser();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password,
      fcm_token: ''
    };

    const result = await login(loginInput);

    // Verify empty FCM token is updated
    expect(result.user.fcm_token).toEqual('');

    // Verify in database
    const updatedUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUser.id))
      .execute();

    expect(updatedUser[0].fcm_token).toEqual('');
  });

  it('should create valid token with expiration', async () => {
    // Create test user
    await createTestUser();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password
    };

    const result = await login(loginInput);

    // Verify token structure
    expect(result.token).toBeDefined();
    
    const decodedPayload = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decodedPayload.userId).toBeDefined();
    expect(decodedPayload.username).toBeDefined();
    expect(decodedPayload.role).toBeDefined();
    expect(decodedPayload.exp).toBeDefined();
    
    // Verify expiration is in the future (24 hours)
    const expectedExp = Date.now() + (24 * 60 * 60 * 1000);
    expect(decodedPayload.exp).toBeGreaterThan(Date.now());
    expect(decodedPayload.exp).toBeLessThanOrEqual(expectedExp);
  });

  it('should handle Admin role correctly', async () => {
    // Create Admin user
    const adminUserData = {
      ...testUserData,
      username: 'adminuser',
      role: 'Admin' as const
    };

    await db.insert(usersTable)
      .values(adminUserData)
      .returning()
      .execute();

    const loginInput: LoginInput = {
      username: 'adminuser',
      password: testUserData.password
    };

    const result = await login(loginInput);

    expect(result.user.role).toEqual('Admin');
    expect(result.user.username).toEqual('adminuser');

    // Verify token contains correct role
    const decodedPayload = JSON.parse(Buffer.from(result.token, 'base64').toString());
    expect(decodedPayload.role).toEqual('Admin');
  });
});