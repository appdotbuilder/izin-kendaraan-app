import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateFcmTokenInput, type CreateUserInput } from '../schema';
import { updateFcmToken } from '../handlers/update_fcm_token';
import { eq } from 'drizzle-orm';

// Test user data
const testUser: CreateUserInput = {
  nik: '1234567890',
  username: 'testuser',
  password: 'password123',
  nama: 'Test User',
  role: 'Karyawan',
  fcm_token: null
};

describe('updateFcmToken', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update FCM token for existing user', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    const newFcmToken = 'new_fcm_token_123';

    const updateInput: UpdateFcmTokenInput = {
      user_id: createdUser.id,
      fcm_token: newFcmToken
    };

    const result = await updateFcmToken(updateInput);

    // Verify the returned user has updated FCM token
    expect(result.id).toEqual(createdUser.id);
    expect(result.fcm_token).toEqual(newFcmToken);
    expect(result.username).toEqual(testUser.username);
    expect(result.nama).toEqual(testUser.nama);
    expect(result.role).toEqual(testUser.role);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save updated FCM token to database', async () => {
    // Create a test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    const newFcmToken = 'database_fcm_token_456';

    const updateInput: UpdateFcmTokenInput = {
      user_id: createdUser.id,
      fcm_token: newFcmToken
    };

    await updateFcmToken(updateInput);

    // Query database to verify FCM token was updated
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].fcm_token).toEqual(newFcmToken);
    expect(users[0].username).toEqual(testUser.username);
  });

  it('should update FCM token from null to valid token', async () => {
    // Create user with null FCM token
    const userWithNullToken = {
      ...testUser,
      fcm_token: null
    };

    const userResult = await db.insert(usersTable)
      .values(userWithNullToken)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    expect(createdUser.fcm_token).toBeNull();

    const newFcmToken = 'first_fcm_token_789';

    const updateInput: UpdateFcmTokenInput = {
      user_id: createdUser.id,
      fcm_token: newFcmToken
    };

    const result = await updateFcmToken(updateInput);

    expect(result.fcm_token).toEqual(newFcmToken);
    
    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users[0].fcm_token).toEqual(newFcmToken);
  });

  it('should update FCM token from existing token to new token', async () => {
    // Create user with existing FCM token
    const oldFcmToken = 'old_fcm_token_111';
    const userWithToken = {
      ...testUser,
      fcm_token: oldFcmToken
    };

    const userResult = await db.insert(usersTable)
      .values(userWithToken)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    expect(createdUser.fcm_token).toEqual(oldFcmToken);

    const newFcmToken = 'new_fcm_token_222';

    const updateInput: UpdateFcmTokenInput = {
      user_id: createdUser.id,
      fcm_token: newFcmToken
    };

    const result = await updateFcmToken(updateInput);

    expect(result.fcm_token).toEqual(newFcmToken);
    expect(result.fcm_token).not.toEqual(oldFcmToken);
  });

  it('should throw error when user does not exist', async () => {
    const nonExistentUserId = 99999;
    const updateInput: UpdateFcmTokenInput = {
      user_id: nonExistentUserId,
      fcm_token: 'some_fcm_token'
    };

    await expect(updateFcmToken(updateInput)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should handle empty FCM token string', async () => {
    // Create a test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const createdUser = userResult[0];
    const emptyFcmToken = '';

    const updateInput: UpdateFcmTokenInput = {
      user_id: createdUser.id,
      fcm_token: emptyFcmToken
    };

    const result = await updateFcmToken(updateInput);

    expect(result.fcm_token).toEqual(emptyFcmToken);
    
    // Verify in database
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(users[0].fcm_token).toEqual(emptyFcmToken);
  });
});