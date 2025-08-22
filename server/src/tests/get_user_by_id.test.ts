import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUserById } from '../handlers/get_user_by_id';

// Test user data
const testUser: CreateUserInput = {
  nik: '1234567890123456',
  username: 'test_user',
  password: 'hashed_password_123',
  nama: 'Test User',
  role: 'Karyawan',
  fcm_token: 'test_fcm_token_123'
};

const testUser2: CreateUserInput = {
  nik: '9876543210987654',
  username: 'test_hr_user',
  password: 'hashed_password_456',
  nama: 'HR Test User',
  role: 'HR',
  fcm_token: null
};

describe('getUserById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return user when found', async () => {
    // Create a test user
    const createResult = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const createdUser = createResult[0];

    // Get the user by ID
    const result = await getUserById(createdUser.id);

    // Verify the returned user
    expect(result).not.toBeNull();
    expect(result!.id).toBe(createdUser.id);
    expect(result!.nik).toBe(testUser.nik);
    expect(result!.username).toBe(testUser.username);
    expect(result!.password).toBe(testUser.password);
    expect(result!.nama).toBe(testUser.nama);
    expect(result!.role).toBe(testUser.role);
    expect(result!.fcm_token).toBe(testUser.fcm_token);
    expect(result!.created_at).toBeInstanceOf(Date);
  });

  it('should return null when user not found', async () => {
    // Try to get a user with non-existent ID
    const result = await getUserById(99999);

    expect(result).toBeNull();
  });

  it('should handle different user roles correctly', async () => {
    // Create users with different roles
    const hrUserResult = await db.insert(usersTable)
      .values({
        nik: testUser2.nik,
        username: testUser2.username,
        password: testUser2.password,
        nama: testUser2.nama,
        role: testUser2.role,
        fcm_token: testUser2.fcm_token
      })
      .returning()
      .execute();

    const adminUserResult = await db.insert(usersTable)
      .values({
        nik: '1111222233334444',
        username: 'admin_user',
        password: 'admin_password',
        nama: 'Admin User',
        role: 'Admin',
        fcm_token: 'admin_fcm_token'
      })
      .returning()
      .execute();

    // Test HR user
    const hrUser = await getUserById(hrUserResult[0].id);
    expect(hrUser).not.toBeNull();
    expect(hrUser!.role).toBe('HR');
    expect(hrUser!.fcm_token).toBeNull();

    // Test Admin user
    const adminUser = await getUserById(adminUserResult[0].id);
    expect(adminUser).not.toBeNull();
    expect(adminUser!.role).toBe('Admin');
    expect(adminUser!.nama).toBe('Admin User');
  });

  it('should return user with null fcm_token when not provided', async () => {
    // Create user without FCM token
    const userResult = await db.insert(usersTable)
      .values({
        nik: '5555666677778888',
        username: 'no_fcm_user',
        password: 'test_password',
        nama: 'No FCM User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const result = await getUserById(userResult[0].id);

    expect(result).not.toBeNull();
    expect(result!.fcm_token).toBeNull();
    expect(result!.username).toBe('no_fcm_user');
  });

  it('should handle multiple users correctly', async () => {
    // Create multiple users
    const user1Result = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        nik: testUser2.nik,
        username: testUser2.username,
        password: testUser2.password,
        nama: testUser2.nama,
        role: testUser2.role,
        fcm_token: testUser2.fcm_token
      })
      .returning()
      .execute();

    // Get each user by their specific ID
    const result1 = await getUserById(user1Result[0].id);
    const result2 = await getUserById(user2Result[0].id);

    // Verify we get the correct users
    expect(result1).not.toBeNull();
    expect(result1!.username).toBe(testUser.username);
    expect(result1!.role).toBe('Karyawan');

    expect(result2).not.toBeNull();
    expect(result2!.username).toBe(testUser2.username);
    expect(result2!.role).toBe('HR');
  });
});