import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type GetPermitsFilter, type IzinKendaraan } from '../schema';
import { eq, gte, lte, and, desc, type SQL } from 'drizzle-orm';

export async function getIzinKendaraan(filter?: GetPermitsFilter): Promise<IzinKendaraan[]> {
  try {
    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (filter) {
      // Handle date filtering
      if (filter.filter && filter.filter !== 'Custom') {
        const now = new Date();
        let startDate: Date;
        let endDate = new Date(now);

        switch (filter.filter) {
          case 'Hari Ini':
            startDate = new Date(now);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'Minggu Ini':
            startDate = new Date(now);
            const dayOfWeek = now.getDay();
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Sunday = 0, Monday = 1
            startDate.setDate(now.getDate() - daysToMonday);
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate);
            endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;
          case 'Bulan Ini':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;
        }

        conditions.push(gte(izinKendaraanTable.created_at, startDate!));
        conditions.push(lte(izinKendaraanTable.created_at, endDate));
      }

      // Handle custom date range
      if (filter.filter === 'Custom' && filter.start_date && filter.end_date) {
        const startDate = new Date(filter.start_date);
        startDate.setHours(0, 0, 0, 0);
        const endDate = new Date(filter.end_date);
        endDate.setHours(23, 59, 59, 999);

        conditions.push(gte(izinKendaraanTable.created_at, startDate));
        conditions.push(lte(izinKendaraanTable.created_at, endDate));
      }

      // Handle status filtering
      if (filter.status) {
        conditions.push(eq(izinKendaraanTable.status, filter.status));
      }

      // Handle user_id filtering
      if (filter.user_id) {
        conditions.push(eq(izinKendaraanTable.user_id, filter.user_id));
      }
    }

    // Build the complete query in one go to avoid TypeScript issues
    const baseQuery = db.select({
      id: izinKendaraanTable.id,
      nama_pemakai: izinKendaraanTable.nama_pemakai,
      nik: izinKendaraanTable.nik,
      nama_sopir: izinKendaraanTable.nama_sopir,
      nomor_polisi: izinKendaraanTable.nomor_polisi,
      tujuan: izinKendaraanTable.tujuan,
      tanggal_berangkat: izinKendaraanTable.tanggal_berangkat,
      jam_berangkat: izinKendaraanTable.jam_berangkat,
      tanggal_kembali: izinKendaraanTable.tanggal_kembali,
      jam_kembali: izinKendaraanTable.jam_kembali,
      keterangan: izinKendaraanTable.keterangan,
      status: izinKendaraanTable.status,
      tanggal_persetujuan: izinKendaraanTable.tanggal_persetujuan,
      jam_persetujuan: izinKendaraanTable.jam_persetujuan,
      created_at: izinKendaraanTable.created_at,
      user_id: izinKendaraanTable.user_id
    })
    .from(izinKendaraanTable)
    .innerJoin(usersTable, eq(izinKendaraanTable.user_id, usersTable.id));

    // Apply conditions and ordering in a single chain
    const query = conditions.length > 0
      ? baseQuery
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(izinKendaraanTable.created_at))
      : baseQuery
          .orderBy(desc(izinKendaraanTable.created_at));

    const results = await query.execute();

    // Map results to proper IzinKendaraan type
    return results.map(result => ({
      id: result.id,
      nama_pemakai: result.nama_pemakai,
      nik: result.nik,
      nama_sopir: result.nama_sopir,
      nomor_polisi: result.nomor_polisi,
      tujuan: result.tujuan,
      tanggal_berangkat: result.tanggal_berangkat,
      jam_berangkat: result.jam_berangkat,
      tanggal_kembali: result.tanggal_kembali,
      jam_kembali: result.jam_kembali,
      keterangan: result.keterangan,
      status: result.status,
      tanggal_persetujuan: result.tanggal_persetujuan,
      jam_persetujuan: result.jam_persetujuan,
      created_at: result.created_at,
      user_id: result.user_id
    }));
  } catch (error) {
    console.error('Failed to get izin kendaraan:', error);
    throw error;
  }
}