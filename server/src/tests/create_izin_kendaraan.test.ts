import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { type CreateIzinKendaraanInput } from '../schema';
import { createIzinKendaraan } from '../handlers/create_izin_kendaraan';
import { eq } from 'drizzle-orm';

// Create a test user first
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      nik: '1234567890',
      username: 'testuser',
      password: 'hashedpassword',
      nama: 'Test User',
      role: 'Karyawan',
      fcm_token: null
    })
    .returning()
    .execute();
  
  return result[0];
};

// Test input with all required fields
const testInput: CreateIzinKendaraanInput = {
  nama_pemakai: 'John Doe',
  nik: '9876543210',
  nama_sopir: 'Driver Name',
  nomor_polisi: 'B 1234 ABC',
  tujuan: 'Jakarta',
  tanggal_berangkat: new Date('2024-01-15'),
  jam_berangkat: '08:00',
  tanggal_kembali: new Date('2024-01-16'),
  jam_kembali: '17:00',
  keterangan: 'Business trip',
  user_id: 0 // Will be set after creating test user
};

describe('createIzinKendaraan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a vehicle permit successfully', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createIzinKendaraan(input);

    // Validate returned data
    expect(result.nama_pemakai).toEqual('John Doe');
    expect(result.nik).toEqual('9876543210');
    expect(result.nama_sopir).toEqual('Driver Name');
    expect(result.nomor_polisi).toEqual('B 1234 ABC');
    expect(result.tujuan).toEqual('Jakarta');
    expect(result.tanggal_berangkat).toEqual(new Date('2024-01-15'));
    expect(result.jam_berangkat).toEqual('08:00');
    expect(result.tanggal_kembali).toEqual(new Date('2024-01-16'));
    expect(result.jam_kembali).toEqual('17:00');
    expect(result.keterangan).toEqual('Business trip');
    expect(result.status).toEqual('Pending');
    expect(result.user_id).toEqual(user.id);
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.tanggal_persetujuan).toBeNull();
    expect(result.jam_persetujuan).toBeNull();
  });

  it('should save permit to database', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id };

    const result = await createIzinKendaraan(input);

    // Verify data was saved to database
    const permits = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.id, result.id))
      .execute();

    expect(permits).toHaveLength(1);
    expect(permits[0].nama_pemakai).toEqual('John Doe');
    expect(permits[0].status).toEqual('Pending');
    expect(permits[0].user_id).toEqual(user.id);
    expect(permits[0].created_at).toBeInstanceOf(Date);
  });

  it('should create permit with null keterangan', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = { ...testInput, user_id: user.id, keterangan: null };

    const result = await createIzinKendaraan(input);

    expect(result.keterangan).toBeNull();

    // Verify in database
    const permits = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.id, result.id))
      .execute();

    expect(permits[0].keterangan).toBeNull();
  });

  it('should throw error when tanggal_kembali is before tanggal_berangkat', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = {
      ...testInput,
      user_id: user.id,
      tanggal_berangkat: new Date('2024-01-16'),
      tanggal_kembali: new Date('2024-01-15') // Earlier date
    };

    await expect(createIzinKendaraan(input)).rejects.toThrow(/tanggal kembali harus setelah tanggal berangkat/i);
  });

  it('should throw error when tanggal_kembali equals tanggal_berangkat', async () => {
    // Create test user first
    const user = await createTestUser();
    const sameDate = new Date('2024-01-15');
    const input = {
      ...testInput,
      user_id: user.id,
      tanggal_berangkat: sameDate,
      tanggal_kembali: sameDate
    };

    await expect(createIzinKendaraan(input)).rejects.toThrow(/tanggal kembali harus setelah tanggal berangkat/i);
  });

  it('should throw error when user does not exist', async () => {
    const input = { ...testInput, user_id: 999 }; // Non-existent user ID

    await expect(createIzinKendaraan(input)).rejects.toThrow(/user tidak ditemukan/i);
  });

  it('should handle time format validation correctly', async () => {
    // Create test user first
    const user = await createTestUser();
    const input = {
      ...testInput,
      user_id: user.id,
      jam_berangkat: '23:59', // Valid time
      jam_kembali: '00:30'     // Valid time
    };

    const result = await createIzinKendaraan(input);

    expect(result.jam_berangkat).toEqual('23:59');
    expect(result.jam_kembali).toEqual('00:30');
  });

  it('should create multiple permits for the same user', async () => {
    // Create test user first
    const user = await createTestUser();
    
    const input1 = {
      ...testInput,
      user_id: user.id,
      tujuan: 'Bandung',
      tanggal_berangkat: new Date('2024-01-15'),
      tanggal_kembali: new Date('2024-01-16')
    };
    
    const input2 = {
      ...testInput,
      user_id: user.id,
      tujuan: 'Surabaya',
      tanggal_berangkat: new Date('2024-01-20'),
      tanggal_kembali: new Date('2024-01-21')
    };

    const result1 = await createIzinKendaraan(input1);
    const result2 = await createIzinKendaraan(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.tujuan).toEqual('Bandung');
    expect(result2.tujuan).toEqual('Surabaya');
    expect(result1.user_id).toEqual(user.id);
    expect(result2.user_id).toEqual(user.id);
  });
});