import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type IzinKendaraan } from '../schema';
import { eq } from 'drizzle-orm';

export async function getPermitById(permitId: number): Promise<IzinKendaraan | null> {
  try {
    // Query permit with user relation data
    const results = await db.select()
      .from(izinKendaraanTable)
      .innerJoin(usersTable, eq(izinKendaraanTable.user_id, usersTable.id))
      .where(eq(izinKendaraanTable.id, permitId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Extract permit data from the joined result
    const result = results[0];
    const permitData = result.izin_kendaraan;

    return {
      id: permitData.id,
      nama_pemakai: permitData.nama_pemakai,
      nik: permitData.nik,
      nama_sopir: permitData.nama_sopir,
      nomor_polisi: permitData.nomor_polisi,
      tujuan: permitData.tujuan,
      tanggal_berangkat: permitData.tanggal_berangkat,
      jam_berangkat: permitData.jam_berangkat,
      tanggal_kembali: permitData.tanggal_kembali,
      jam_kembali: permitData.jam_kembali,
      keterangan: permitData.keterangan,
      status: permitData.status,
      tanggal_persetujuan: permitData.tanggal_persetujuan,
      jam_persetujuan: permitData.jam_persetujuan,
      created_at: permitData.created_at,
      user_id: permitData.user_id
    };
  } catch (error) {
    console.error('Get permit by ID failed:', error);
    throw error;
  }
}