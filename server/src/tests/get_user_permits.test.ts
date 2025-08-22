import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { getUserPermits } from '../handlers/get_user_permits';
import { eq } from 'drizzle-orm';

describe('getUserPermits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return permits for a specific user ordered by created_at desc', async () => {
    // Create test users
    const user1Result = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'test_user_1',
        password: 'password123',
        nama: 'Test User 1',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        nik: '0987654321',
        username: 'test_user_2',
        password: 'password123',
        nama: 'Test User 2',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;

    // Create permits for user1 - creating them in sequence to ensure different timestamps
    const permit1 = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test User 1',
        nik: '1234567890',
        nama_sopir: 'Driver 1',
        nomor_polisi: 'B1234XYZ',
        tujuan: 'Jakarta',
        tanggal_berangkat: new Date('2024-01-15'),
        jam_berangkat: '08:00',
        tanggal_kembali: new Date('2024-01-15'),
        jam_kembali: '17:00',
        keterangan: 'Business trip',
        status: 'Pending',
        user_id: user1Id
      })
      .returning()
      .execute();

    // Add a small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const permit2 = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test User 1',
        nik: '1234567890',
        nama_sopir: 'Driver 2',
        nomor_polisi: 'B5678ABC',
        tujuan: 'Bandung',
        tanggal_berangkat: new Date('2024-01-16'),
        jam_berangkat: '09:00',
        tanggal_kembali: new Date('2024-01-16'),
        jam_kembali: '18:00',
        keterangan: 'Meeting',
        status: 'Disetujui',
        user_id: user1Id
      })
      .returning()
      .execute();

    // Create permit for user2 (should not be returned)
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test User 2',
        nik: '0987654321',
        nama_sopir: 'Driver 3',
        nomor_polisi: 'B9999DEF',
        tujuan: 'Surabaya',
        tanggal_berangkat: new Date('2024-01-17'),
        jam_berangkat: '10:00',
        tanggal_kembali: new Date('2024-01-17'),
        jam_kembali: '19:00',
        keterangan: null,
        status: 'Pending',
        user_id: user2Id
      })
      .returning()
      .execute();

    // Get permits for user1
    const result = await getUserPermits(user1Id);

    // Should return only user1's permits
    expect(result).toHaveLength(2);

    // Should be ordered by created_at descending (most recent first)
    expect(result[0].id).toEqual(permit2[0].id);
    expect(result[1].id).toEqual(permit1[0].id);

    // Verify first permit details
    expect(result[0].nama_pemakai).toEqual('Test User 1');
    expect(result[0].tujuan).toEqual('Bandung');
    expect(result[0].status).toEqual('Disetujui');
    expect(result[0].user_id).toEqual(user1Id);

    // Verify second permit details
    expect(result[1].nama_pemakai).toEqual('Test User 1');
    expect(result[1].tujuan).toEqual('Jakarta');
    expect(result[1].status).toEqual('Pending');
    expect(result[1].user_id).toEqual(user1Id);

    // Verify date fields are properly typed
    expect(result[0].tanggal_berangkat).toBeInstanceOf(Date);
    expect(result[0].tanggal_kembali).toBeInstanceOf(Date);
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should return empty array for user with no permits', async () => {
    // Create a user with no permits
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1111111111',
        username: 'user_no_permits',
        password: 'password123',
        nama: 'User No Permits',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const result = await getUserPermits(userId);

    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should handle user with single permit', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '2222222222',
        username: 'single_permit_user',
        password: 'password123',
        nama: 'Single Permit User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create single permit
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Single Permit User',
        nik: '2222222222',
        nama_sopir: 'Driver Single',
        nomor_polisi: 'B0000XYZ',
        tujuan: 'Solo',
        tanggal_berangkat: new Date('2024-01-20'),
        jam_berangkat: '07:00',
        tanggal_kembali: new Date('2024-01-20'),
        jam_kembali: '16:00',
        keterangan: 'Single trip',
        status: 'Ditolak',
        tanggal_persetujuan: new Date('2024-01-19'),
        jam_persetujuan: '14:30',
        user_id: userId
      })
      .execute();

    const result = await getUserPermits(userId);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('Single Permit User');
    expect(result[0].tujuan).toEqual('Solo');
    expect(result[0].status).toEqual('Ditolak');
    expect(result[0].tanggal_persetujuan).toBeInstanceOf(Date);
    expect(result[0].jam_persetujuan).toEqual('14:30');
    expect(result[0].user_id).toEqual(userId);
  });

  it('should verify permits are saved correctly in database', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '3333333333',
        username: 'verify_user',
        password: 'password123',
        nama: 'Verify User',
        role: 'Karyawan',
        fcm_token: 'test_fcm_token'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create permit through handler's database
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Verify User',
        nik: '3333333333',
        nama_sopir: 'Verify Driver',
        nomor_polisi: 'B1111XYZ',
        tujuan: 'Yogyakarta',
        tanggal_berangkat: new Date('2024-02-01'),
        jam_berangkat: '06:00',
        tanggal_kembali: new Date('2024-02-01'),
        jam_kembali: '20:00',
        keterangan: null,
        status: 'Pending',
        user_id: userId
      })
      .execute();

    // Get permits using handler
    const handlerResult = await getUserPermits(userId);

    // Verify by direct database query
    const directResult = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.user_id, userId))
      .execute();

    expect(handlerResult).toHaveLength(1);
    expect(directResult).toHaveLength(1);
    
    // Compare results
    expect(handlerResult[0].id).toEqual(directResult[0].id);
    expect(handlerResult[0].nama_pemakai).toEqual(directResult[0].nama_pemakai);
    expect(handlerResult[0].tujuan).toEqual(directResult[0].tujuan);
    expect(handlerResult[0].status).toEqual(directResult[0].status);
    expect(handlerResult[0].keterangan).toBeNull();
  });

  it('should handle different permit statuses correctly', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '4444444444',
        username: 'status_test_user',
        password: 'password123',
        nama: 'Status Test User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create permits with different statuses
    await db.insert(izinKendaraanTable)
      .values([
        {
          nama_pemakai: 'Status Test User',
          nik: '4444444444',
          nama_sopir: 'Driver Pending',
          nomor_polisi: 'B2222ABC',
          tujuan: 'Pending Destination',
          tanggal_berangkat: new Date('2024-02-05'),
          jam_berangkat: '08:00',
          tanggal_kembali: new Date('2024-02-05'),
          jam_kembali: '17:00',
          keterangan: 'Pending permit',
          status: 'Pending',
          user_id: userId
        },
        {
          nama_pemakai: 'Status Test User',
          nik: '4444444444',
          nama_sopir: 'Driver Approved',
          nomor_polisi: 'B3333DEF',
          tujuan: 'Approved Destination',
          tanggal_berangkat: new Date('2024-02-06'),
          jam_berangkat: '09:00',
          tanggal_kembali: new Date('2024-02-06'),
          jam_kembali: '18:00',
          keterangan: 'Approved permit',
          status: 'Disetujui',
          tanggal_persetujuan: new Date('2024-02-05'),
          jam_persetujuan: '15:00',
          user_id: userId
        },
        {
          nama_pemakai: 'Status Test User',
          nik: '4444444444',
          nama_sopir: 'Driver Rejected',
          nomor_polisi: 'B4444GHI',
          tujuan: 'Rejected Destination',
          tanggal_berangkat: new Date('2024-02-07'),
          jam_berangkat: '10:00',
          tanggal_kembali: new Date('2024-02-07'),
          jam_kembali: '19:00',
          keterangan: 'Rejected permit',
          status: 'Ditolak',
          tanggal_persetujuan: new Date('2024-02-06'),
          jam_persetujuan: '16:00',
          user_id: userId
        }
      ])
      .execute();

    const result = await getUserPermits(userId);

    expect(result).toHaveLength(3);

    // Check all statuses are present
    const statuses = result.map(permit => permit.status);
    expect(statuses).toContain('Pending');
    expect(statuses).toContain('Disetujui');
    expect(statuses).toContain('Ditolak');

    // Find each permit by status and verify details
    const pendingPermit = result.find(p => p.status === 'Pending');
    const approvedPermit = result.find(p => p.status === 'Disetujui');
    const rejectedPermit = result.find(p => p.status === 'Ditolak');

    expect(pendingPermit?.tujuan).toEqual('Pending Destination');
    expect(pendingPermit?.tanggal_persetujuan).toBeNull();
    expect(pendingPermit?.jam_persetujuan).toBeNull();

    expect(approvedPermit?.tujuan).toEqual('Approved Destination');
    expect(approvedPermit?.tanggal_persetujuan).toBeInstanceOf(Date);
    expect(approvedPermit?.jam_persetujuan).toEqual('15:00');

    expect(rejectedPermit?.tujuan).toEqual('Rejected Destination');
    expect(rejectedPermit?.tanggal_persetujuan).toBeInstanceOf(Date);
    expect(rejectedPermit?.jam_persetujuan).toEqual('16:00');
  });
});