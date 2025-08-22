import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';
import { pbkdf2Sync } from 'crypto';

// Helper function to verify password (matches the hashing logic in handler)
function verifyPassword(password: string, hashedPassword: string): boolean {
  const [salt, hash] = hashedPassword.split(':');
  const verifyHash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// Test input data
const testInput: CreateUserInput = {
  nik: '1234567890123456',
  username: 'testuser',
  password: 'password123',
  nama: 'Test User',
  role: 'Karyawan',
  fcm_token: 'test_fcm_token'
};

const testInputWithoutFcm: CreateUserInput = {
  nik: '9876543210987654',
  username: 'testuser2',
  password: 'password456',
  nama: 'Test User 2',
  role: 'HR',
  fcm_token: null
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a user with all fields', async () => {
    const result = await createUser(testInput);

    // Validate returned user object
    expect(result.nik).toEqual('1234567890123456');
    expect(result.username).toEqual('testuser');
    expect(result.nama).toEqual('Test User');
    expect(result.role).toEqual('Karyawan');
    expect(result.fcm_token).toEqual('test_fcm_token');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password).not.toEqual('password123');
    expect(result.password.includes(':')).toBe(true); // Contains salt separator
    expect(result.password.length).toBeGreaterThan(50); // Hashed passwords are long
  });

  it('should create a user with null fcm_token', async () => {
    const result = await createUser(testInputWithoutFcm);

    expect(result.nik).toEqual('9876543210987654');
    expect(result.username).toEqual('testuser2');
    expect(result.nama).toEqual('Test User 2');
    expect(result.role).toEqual('HR');
    expect(result.fcm_token).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(testInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    
    const savedUser = users[0];
    expect(savedUser.nik).toEqual('1234567890123456');
    expect(savedUser.username).toEqual('testuser');
    expect(savedUser.nama).toEqual('Test User');
    expect(savedUser.role).toEqual('Karyawan');
    expect(savedUser.fcm_token).toEqual('test_fcm_token');
    expect(savedUser.created_at).toBeInstanceOf(Date);
  });

  it('should hash the password correctly', async () => {
    const result = await createUser(testInput);

    // Verify password is hashed correctly using our verify function
    const isPasswordValid = verifyPassword('password123', result.password);
    expect(isPasswordValid).toBe(true);

    // Verify wrong password doesn't match
    const isWrongPasswordValid = verifyPassword('wrongpassword', result.password);
    expect(isWrongPasswordValid).toBe(false);
  });

  it('should throw error for duplicate NIK', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same NIK
    const duplicateNikInput: CreateUserInput = {
      ...testInput,
      username: 'differentusername' // Different username but same NIK
    };

    await expect(createUser(duplicateNikInput)).rejects.toThrow(/NIK already exists/i);
  });

  it('should throw error for duplicate username', async () => {
    // Create first user
    await createUser(testInput);

    // Try to create second user with same username
    const duplicateUsernameInput: CreateUserInput = {
      ...testInput,
      nik: '9999999999999999' // Different NIK but same username
    };

    await expect(createUser(duplicateUsernameInput)).rejects.toThrow(/Username already exists/i);
  });

  it('should create users with different roles', async () => {
    const adminInput: CreateUserInput = {
      nik: '1111111111111111',
      username: 'admin_user',
      password: 'admin123',
      nama: 'Admin User',
      role: 'Admin',
      fcm_token: null
    };

    const hrInput: CreateUserInput = {
      nik: '2222222222222222',
      username: 'hr_user',
      password: 'hr123',
      nama: 'HR User',
      role: 'HR',
      fcm_token: 'hr_fcm_token'
    };

    const karyawanInput: CreateUserInput = {
      nik: '3333333333333333',
      username: 'karyawan_user',
      password: 'karyawan123',
      nama: 'Karyawan User',
      role: 'Karyawan',
      fcm_token: 'karyawan_fcm_token'
    };

    // Create all three users
    const adminResult = await createUser(adminInput);
    const hrResult = await createUser(hrInput);
    const karyawanResult = await createUser(karyawanInput);

    // Verify roles are correctly assigned
    expect(adminResult.role).toEqual('Admin');
    expect(hrResult.role).toEqual('HR');
    expect(karyawanResult.role).toEqual('Karyawan');

    // Verify all users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(3);
    
    const roles = allUsers.map(user => user.role);
    expect(roles).toContain('Admin');
    expect(roles).toContain('HR');
    expect(roles).toContain('Karyawan');
  });

  it('should generate unique hashes for same password', async () => {
    const input1: CreateUserInput = {
      nik: '1111111111111111',
      username: 'user1',
      password: 'samepassword',
      nama: 'User One',
      role: 'Karyawan',
      fcm_token: null
    };

    const input2: CreateUserInput = {
      nik: '2222222222222222',
      username: 'user2',
      password: 'samepassword',
      nama: 'User Two',
      role: 'Karyawan',
      fcm_token: null
    };

    const user1 = await createUser(input1);
    const user2 = await createUser(input2);

    // Same password should generate different hashes due to salt
    expect(user1.password).not.toEqual(user2.password);
    
    // But both should verify correctly with the original password
    expect(verifyPassword('samepassword', user1.password)).toBe(true);
    expect(verifyPassword('samepassword', user2.password)).toBe(true);
  });
});