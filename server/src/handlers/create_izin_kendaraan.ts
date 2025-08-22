import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type CreateIzinKendaraanInput, type IzinKendaraan } from '../schema';
import { eq } from 'drizzle-orm';

export const createIzinKendaraan = async (input: CreateIzinKendaraanInput): Promise<IzinKendaraan> => {
  try {
    // Validate that tanggal_kembali is after tanggal_berangkat
    if (input.tanggal_kembali <= input.tanggal_berangkat) {
      throw new Error('Tanggal kembali harus setelah tanggal berangkat');
    }

    // Verify that the user exists
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User tidak ditemukan');
    }

    // Insert new vehicle permit record
    const result = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: input.nama_pemakai,
        nik: input.nik,
        nama_sopir: input.nama_sopir,
        nomor_polisi: input.nomor_polisi,
        tujuan: input.tujuan,
        tanggal_berangkat: input.tanggal_berangkat,
        jam_berangkat: input.jam_berangkat,
        tanggal_kembali: input.tanggal_kembali,
        jam_kembali: input.jam_kembali,
        keterangan: input.keterangan,
        status: 'Pending', // Default status
        user_id: input.user_id,
        // tanggal_persetujuan and jam_persetujuan are nullable and will be null by default
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Vehicle permit creation failed:', error);
    throw error;
  }
};