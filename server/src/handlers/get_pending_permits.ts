import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type IzinKendaraan } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getPendingPermits(): Promise<IzinKendaraan[]> {
  try {
    // Query permits with 'Pending' status, joined with user data, ordered by creation date
    const results = await db.select()
      .from(izinKendaraanTable)
      .innerJoin(usersTable, eq(izinKendaraanTable.user_id, usersTable.id))
      .where(eq(izinKendaraanTable.status, 'Pending'))
      .orderBy(asc(izinKendaraanTable.created_at))
      .execute();

    // Transform the joined results to match the IzinKendaraan type
    return results.map(result => ({
      id: result.izin_kendaraan.id,
      nama_pemakai: result.izin_kendaraan.nama_pemakai,
      nik: result.izin_kendaraan.nik,
      nama_sopir: result.izin_kendaraan.nama_sopir,
      nomor_polisi: result.izin_kendaraan.nomor_polisi,
      tujuan: result.izin_kendaraan.tujuan,
      tanggal_berangkat: result.izin_kendaraan.tanggal_berangkat,
      jam_berangkat: result.izin_kendaraan.jam_berangkat,
      tanggal_kembali: result.izin_kendaraan.tanggal_kembali,
      jam_kembali: result.izin_kendaraan.jam_kembali,
      keterangan: result.izin_kendaraan.keterangan,
      status: result.izin_kendaraan.status,
      tanggal_persetujuan: result.izin_kendaraan.tanggal_persetujuan,
      jam_persetujuan: result.izin_kendaraan.jam_persetujuan,
      created_at: result.izin_kendaraan.created_at,
      user_id: result.izin_kendaraan.user_id
    }));
  } catch (error) {
    console.error('Failed to fetch pending permits:', error);
    throw error;
  }
}