import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput, type User } from '../schema';
import { eq, or } from 'drizzle-orm';
import { createHash, randomBytes, pbkdf2Sync } from 'crypto';

// Simple password hashing using Node.js crypto
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  try {
    // Check if NIK or username already exists
    const existingUsers = await db.select()
      .from(usersTable)
      .where(
        or(
          eq(usersTable.nik, input.nik),
          eq(usersTable.username, input.username)
        )
      )
      .execute();

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      if (existingUser.nik === input.nik) {
        throw new Error('NIK already exists');
      }
      if (existingUser.username === input.username) {
        throw new Error('Username already exists');
      }
    }

    // Hash the password
    const hashedPassword = hashPassword(input.password);

    // Insert new user
    const result = await db.insert(usersTable)
      .values({
        nik: input.nik,
        username: input.username,
        password: hashedPassword,
        nama: input.nama,
        role: input.role,
        fcm_token: input.fcm_token || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User creation failed:', error);
    throw error;
  }
}