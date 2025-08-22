import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateFcmTokenInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateFcmToken = async (input: UpdateFcmTokenInput): Promise<User> => {
  try {
    // Update FCM token for the specified user
    const result = await db.update(usersTable)
      .set({
        fcm_token: input.fcm_token
      })
      .where(eq(usersTable.id, input.user_id))
      .returning()
      .execute();

    // Check if user was found and updated
    if (result.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Return the updated user
    const updatedUser = result[0];
    return {
      ...updatedUser,
      created_at: updatedUser.created_at
    };
  } catch (error) {
    console.error('FCM token update failed:', error);
    throw error;
  }
};