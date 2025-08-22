import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type UpdatePermitStatusInput, type IzinKendaraan } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePermitStatus = async (input: UpdatePermitStatusInput): Promise<IzinKendaraan> => {
  try {
    // Update the permit status
    const result = await db.update(izinKendaraanTable)
      .set({
        status: input.status,
        tanggal_persetujuan: input.tanggal_persetujuan,
        jam_persetujuan: input.jam_persetujuan
      })
      .where(eq(izinKendaraanTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Permit with ID ${input.id} not found`);
    }

    // Fetch user's FCM token for push notification
    const userResult = await db.select({ fcm_token: usersTable.fcm_token })
      .from(usersTable)
      .where(eq(usersTable.id, result[0].user_id))
      .execute();

    // Log FCM token retrieval (in real implementation, this would trigger push notification)
    if (userResult.length > 0 && userResult[0].fcm_token) {
      console.log(`FCM token found for user ${result[0].user_id}: ${userResult[0].fcm_token}`);
      console.log(`Sending push notification: Permit ${input.status} for permit ID ${input.id}`);
      // TODO: Implement actual push notification service call here
    } else {
      console.log(`No FCM token found for user ${result[0].user_id}`);
    }

    return result[0];
  } catch (error) {
    console.error('Permit status update failed:', error);
    throw error;
  }
};