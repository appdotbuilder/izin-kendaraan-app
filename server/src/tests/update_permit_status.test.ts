import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { type UpdatePermitStatusInput } from '../schema';
import { updatePermitStatus } from '../handlers/update_permit_status';
import { eq } from 'drizzle-orm';

describe('updatePermitStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;
  let testPermitId: number;

  beforeEach(async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'testuser',
        password: 'password123',
        nama: 'Test User',
        role: 'Karyawan',
        fcm_token: 'test-fcm-token-12345'
      })
      .returning()
      .execute();
    
    testUserId = userResult[0].id;

    // Create test permit
    const permitResult = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test Employee',
        nik: '1234567890',
        nama_sopir: 'Test Driver',
        nomor_polisi: 'B1234XYZ',
        tujuan: 'Jakarta Selatan',
        tanggal_berangkat: new Date('2024-01-15T00:00:00Z'),
        jam_berangkat: '08:00',
        tanggal_kembali: new Date('2024-01-15T00:00:00Z'),
        jam_kembali: '17:00',
        keterangan: 'Business trip',
        status: 'Pending',
        user_id: testUserId
      })
      .returning()
      .execute();

    testPermitId = permitResult[0].id;
  });

  const approveInput: UpdatePermitStatusInput = {
    id: 0, // Will be set in test
    status: 'Disetujui',
    tanggal_persetujuan: new Date('2024-01-10T00:00:00Z'),
    jam_persetujuan: '14:30'
  };

  const rejectInput: UpdatePermitStatusInput = {
    id: 0, // Will be set in test
    status: 'Ditolak',
    tanggal_persetujuan: new Date('2024-01-10T00:00:00Z'),
    jam_persetujuan: '15:45'
  };

  it('should approve a permit successfully', async () => {
    const input = { ...approveInput, id: testPermitId };
    
    const result = await updatePermitStatus(input);

    // Verify returned data
    expect(result.id).toEqual(testPermitId);
    expect(result.status).toEqual('Disetujui');
    expect(result.tanggal_persetujuan).toEqual(new Date('2024-01-10T00:00:00Z'));
    expect(result.jam_persetujuan).toEqual('14:30');
    expect(result.nama_pemakai).toEqual('Test Employee');
    expect(result.user_id).toEqual(testUserId);
  });

  it('should reject a permit successfully', async () => {
    const input = { ...rejectInput, id: testPermitId };
    
    const result = await updatePermitStatus(input);

    // Verify returned data
    expect(result.id).toEqual(testPermitId);
    expect(result.status).toEqual('Ditolak');
    expect(result.tanggal_persetujuan).toEqual(new Date('2024-01-10T00:00:00Z'));
    expect(result.jam_persetujuan).toEqual('15:45');
    expect(result.nama_pemakai).toEqual('Test Employee');
    expect(result.user_id).toEqual(testUserId);
  });

  it('should save updated status to database', async () => {
    const input = { ...approveInput, id: testPermitId };
    
    await updatePermitStatus(input);

    // Verify database was updated
    const permits = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.id, testPermitId))
      .execute();

    expect(permits).toHaveLength(1);
    expect(permits[0].status).toEqual('Disetujui');
    expect(permits[0].tanggal_persetujuan).toEqual(new Date('2024-01-10T00:00:00Z'));
    expect(permits[0].jam_persetujuan).toEqual('14:30');
    expect(permits[0].nama_pemakai).toEqual('Test Employee');
  });

  it('should handle permit not found', async () => {
    const input = { ...approveInput, id: 99999 };
    
    await expect(updatePermitStatus(input)).rejects.toThrow(/Permit with ID 99999 not found/i);
  });

  it('should handle user without FCM token', async () => {
    // Create user without FCM token
    const userWithoutToken = await db.insert(usersTable)
      .values({
        nik: '0987654321',
        username: 'usernotoken',
        password: 'password123',
        nama: 'User No Token',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    // Create permit for user without FCM token
    const permitForUserNoToken = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Employee No Token',
        nik: '0987654321',
        nama_sopir: 'Driver No Token',
        nomor_polisi: 'B5678ABC',
        tujuan: 'Bandung',
        tanggal_berangkat: new Date('2024-01-16T00:00:00Z'),
        jam_berangkat: '09:00',
        tanggal_kembali: new Date('2024-01-16T00:00:00Z'),
        jam_kembali: '18:00',
        keterangan: 'Meeting',
        status: 'Pending',
        user_id: userWithoutToken[0].id
      })
      .returning()
      .execute();

    const input = { ...approveInput, id: permitForUserNoToken[0].id };
    
    // Should still work despite no FCM token
    const result = await updatePermitStatus(input);
    expect(result.status).toEqual('Disetujui');
  });

  it('should preserve other permit fields during update', async () => {
    const input = { ...rejectInput, id: testPermitId };
    
    const result = await updatePermitStatus(input);

    // Verify all original fields are preserved
    expect(result.nama_pemakai).toEqual('Test Employee');
    expect(result.nik).toEqual('1234567890');
    expect(result.nama_sopir).toEqual('Test Driver');
    expect(result.nomor_polisi).toEqual('B1234XYZ');
    expect(result.tujuan).toEqual('Jakarta Selatan');
    expect(result.tanggal_berangkat).toEqual(new Date('2024-01-15T00:00:00Z'));
    expect(result.jam_berangkat).toEqual('08:00');
    expect(result.tanggal_kembali).toEqual(new Date('2024-01-15T00:00:00Z'));
    expect(result.jam_kembali).toEqual('17:00');
    expect(result.keterangan).toEqual('Business trip');
    expect(result.user_id).toEqual(testUserId);
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should handle permit with null keterangan', async () => {
    // Create permit with null keterangan
    const permitWithNullKeterangan = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Employee Null Note',
        nik: '1111222233',
        nama_sopir: 'Driver Null Note',
        nomor_polisi: 'B9999ZZZ',
        tujuan: 'Surabaya',
        tanggal_berangkat: new Date('2024-01-17T00:00:00Z'),
        jam_berangkat: '07:00',
        tanggal_kembali: new Date('2024-01-17T00:00:00Z'),
        jam_kembali: '19:00',
        keterangan: null,
        status: 'Pending',
        user_id: testUserId
      })
      .returning()
      .execute();

    const input = { ...approveInput, id: permitWithNullKeterangan[0].id };
    
    const result = await updatePermitStatus(input);

    expect(result.status).toEqual('Disetujui');
    expect(result.keterangan).toBeNull();
    expect(result.nama_pemakai).toEqual('Employee Null Note');
  });
});