import { db } from '../db';
import { izinKendaraanTable } from '../db/schema';
import { type IzinKendaraan } from '../schema';
import { eq, desc } from 'drizzle-orm';

export async function getUserPermits(userId: number): Promise<IzinKendaraan[]> {
  try {
    const permits = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.user_id, userId))
      .orderBy(desc(izinKendaraanTable.created_at))
      .execute();

    return permits;
  } catch (error) {
    console.error('Failed to get user permits:', error);
    throw error;
  }
}