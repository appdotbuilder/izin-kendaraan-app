import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { type GetPermitsFilter } from '../schema';
import { getIzinKendaraan } from '../handlers/get_izin_kendaraan';

describe('getIzinKendaraan', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test helper to create a user
  const createTestUser = async (userData: {
    nik: string;
    username: string;
    nama: string;
    role: 'Karyawan' | 'HR' | 'Admin';
  }) => {
    const result = await db.insert(usersTable)
      .values({
        nik: userData.nik,
        username: userData.username,
        password: 'password123',
        nama: userData.nama,
        role: userData.role,
        fcm_token: null
      })
      .returning()
      .execute();
    return result[0];
  };

  // Test helper to create a permit
  const createTestPermit = async (permitData: {
    user_id: number;
    nama_pemakai: string;
    status?: 'Pending' | 'Disetujui' | 'Ditolak';
    created_at?: Date;
  }) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const result = await db.insert(izinKendaraanTable)
      .values({
        user_id: permitData.user_id,
        nama_pemakai: permitData.nama_pemakai,
        nik: '1234567890',
        nama_sopir: 'Test Driver',
        nomor_polisi: 'B 1234 CD',
        tujuan: 'Test Destination',
        tanggal_berangkat: new Date(),
        jam_berangkat: '08:00',
        tanggal_kembali: tomorrow,
        jam_kembali: '17:00',
        keterangan: null,
        status: permitData.status || 'Pending',
        tanggal_persetujuan: null,
        jam_persetujuan: null,
        created_at: permitData.created_at
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should return all permits when no filter is provided', async () => {
    // Create test user
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    // Create test permits
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'John Doe'
    });
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Jane Smith'
    });

    const result = await getIzinKendaraan();

    expect(result).toHaveLength(2);
    expect(result[0].nama_pemakai).toBeDefined();
    expect(result[0].user_id).toEqual(user.id);
    expect(result[0].status).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
  });

  it('should filter by status', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    // Create permits with different statuses
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'John Doe',
      status: 'Pending'
    });
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Jane Smith',
      status: 'Disetujui'
    });
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Bob Wilson',
      status: 'Ditolak'
    });

    const filter: GetPermitsFilter = {
      status: 'Disetujui'
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].status).toEqual('Disetujui');
    expect(result[0].nama_pemakai).toEqual('Jane Smith');
  });

  it('should filter by user_id', async () => {
    // Create two test users
    const user1 = await createTestUser({
      nik: '1234567890',
      username: 'testuser1',
      nama: 'Test User 1',
      role: 'Karyawan'
    });

    const user2 = await createTestUser({
      nik: '0987654321',
      username: 'testuser2',
      nama: 'Test User 2',
      role: 'Karyawan'
    });

    // Create permits for both users
    await createTestPermit({
      user_id: user1.id,
      nama_pemakai: 'User1 Permit'
    });
    await createTestPermit({
      user_id: user2.id,
      nama_pemakai: 'User2 Permit'
    });

    const filter: GetPermitsFilter = {
      user_id: user1.id
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(user1.id);
    expect(result[0].nama_pemakai).toEqual('User1 Permit');
  });

  it('should filter by "Hari Ini" (today)', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Create permit from today
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Today Permit',
      created_at: today
    });

    // Create permit from yesterday
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Yesterday Permit',
      created_at: yesterday
    });

    const filter: GetPermitsFilter = {
      filter: 'Hari Ini'
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('Today Permit');
    expect(result[0].created_at.toDateString()).toEqual(today.toDateString());
  });

  it('should filter by "Minggu Ini" (this week)', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();
    const lastWeek = new Date(today);
    lastWeek.setDate(today.getDate() - 8); // 8 days ago (definitely last week)

    // Create permit from this week
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'This Week Permit',
      created_at: today
    });

    // Create permit from last week
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Last Week Permit',
      created_at: lastWeek
    });

    const filter: GetPermitsFilter = {
      filter: 'Minggu Ini'
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('This Week Permit');
  });

  it('should filter by "Bulan Ini" (this month)', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();
    const lastMonth = new Date(today);
    lastMonth.setMonth(today.getMonth() - 1);

    // Create permit from this month
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'This Month Permit',
      created_at: today
    });

    // Create permit from last month
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Last Month Permit',
      created_at: lastMonth
    });

    const filter: GetPermitsFilter = {
      filter: 'Bulan Ini'
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('This Month Permit');
  });

  it('should filter by custom date range', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();
    const threeDaysAgo = new Date(today);
    threeDaysAgo.setDate(today.getDate() - 3);
    const fiveDaysAgo = new Date(today);
    fiveDaysAgo.setDate(today.getDate() - 5);

    // Create permits on different dates
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'In Range Permit',
      created_at: threeDaysAgo
    });

    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Out of Range Permit',
      created_at: fiveDaysAgo
    });

    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(today.getDate() - 2);

    const filter: GetPermitsFilter = {
      filter: 'Custom',
      start_date: threeDaysAgo,
      end_date: twoDaysAgo
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('In Range Permit');
  });

  it('should combine multiple filters', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();

    // Create permits with different combinations
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Match All Filters',
      status: 'Disetujui',
      created_at: today
    });

    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Wrong Status',
      status: 'Pending',
      created_at: today
    });

    const filter: GetPermitsFilter = {
      filter: 'Hari Ini',
      status: 'Disetujui',
      user_id: user.id
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(1);
    expect(result[0].nama_pemakai).toEqual('Match All Filters');
    expect(result[0].status).toEqual('Disetujui');
    expect(result[0].user_id).toEqual(user.id);
  });

  it('should return results ordered by created_at descending', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    // Create permits in different order
    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Older Permit',
      created_at: yesterday
    });

    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Newer Permit',
      created_at: today
    });

    const result = await getIzinKendaraan();

    expect(result).toHaveLength(2);
    expect(result[0].nama_pemakai).toEqual('Newer Permit'); // Should be first (newest)
    expect(result[1].nama_pemakai).toEqual('Older Permit'); // Should be second
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should return empty array when no permits match filter', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    await createTestPermit({
      user_id: user.id,
      nama_pemakai: 'Pending Permit',
      status: 'Pending'
    });

    const filter: GetPermitsFilter = {
      status: 'Disetujui'
    };

    const result = await getIzinKendaraan(filter);

    expect(result).toHaveLength(0);
  });

  it('should include all required permit fields in response', async () => {
    const user = await createTestUser({
      nik: '1234567890',
      username: 'testuser',
      nama: 'Test User',
      role: 'Karyawan'
    });

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values({
        user_id: user.id,
        nama_pemakai: 'Complete Test',
        nik: '9876543210',
        nama_sopir: 'Test Driver Name',
        nomor_polisi: 'B 5678 EF',
        tujuan: 'Jakarta',
        tanggal_berangkat: new Date(),
        jam_berangkat: '09:30',
        tanggal_kembali: tomorrow,
        jam_kembali: '18:00',
        keterangan: 'Test keterangan',
        status: 'Disetujui',
        tanggal_persetujuan: new Date(),
        jam_persetujuan: '08:00'
      })
      .execute();

    const result = await getIzinKendaraan();

    expect(result).toHaveLength(1);
    const permit = result[0];
    
    // Verify all required fields are present
    expect(permit.id).toBeDefined();
    expect(permit.nama_pemakai).toEqual('Complete Test');
    expect(permit.nik).toEqual('9876543210');
    expect(permit.nama_sopir).toEqual('Test Driver Name');
    expect(permit.nomor_polisi).toEqual('B 5678 EF');
    expect(permit.tujuan).toEqual('Jakarta');
    expect(permit.tanggal_berangkat).toBeInstanceOf(Date);
    expect(permit.jam_berangkat).toEqual('09:30');
    expect(permit.tanggal_kembali).toBeInstanceOf(Date);
    expect(permit.jam_kembali).toEqual('18:00');
    expect(permit.keterangan).toEqual('Test keterangan');
    expect(permit.status).toEqual('Disetujui');
    expect(permit.tanggal_persetujuan).toBeInstanceOf(Date);
    expect(permit.jam_persetujuan).toEqual('08:00');
    expect(permit.created_at).toBeInstanceOf(Date);
    expect(permit.user_id).toEqual(user.id);
  });
});