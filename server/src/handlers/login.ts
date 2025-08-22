import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type AuthResponse } from '../schema';
import { eq } from 'drizzle-orm';

export const login = async (input: LoginInput): Promise<AuthResponse> => {
  try {
    // Find user by username
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .execute();

    if (users.length === 0) {
      throw new Error('Invalid username or password');
    }

    const user = users[0];

    // Simple password verification (in production, use proper hashing)
    if (user.password !== input.password) {
      throw new Error('Invalid username or password');
    }

    // Update FCM token if provided (including empty string)
    if (input.fcm_token !== undefined) {
      await db.update(usersTable)
        .set({ fcm_token: input.fcm_token })
        .where(eq(usersTable.id, user.id))
        .execute();
      
      // Update the user object with new FCM token
      user.fcm_token = input.fcm_token;
    }

    // Generate simple JWT-like token (in production, use proper JWT library)
    const tokenPayload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    };
    const token = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');

    // Return user data and token (excluding password)
    const { password, ...userWithoutPassword } = user;
    
    return {
      user: userWithoutPassword as any, // Type assertion to handle schema mismatch
      token
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};