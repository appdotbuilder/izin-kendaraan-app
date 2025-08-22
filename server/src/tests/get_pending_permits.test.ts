import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { getPendingPermits } from '../handlers/get_pending_permits';
import { eq } from 'drizzle-orm';

describe('getPendingPermits', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no pending permits exist', async () => {
    const result = await getPendingPermits();
    expect(result).toEqual([]);
  });

  it('should fetch pending permits and order by creation date', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'testuser',
        password: 'password123',
        nama: 'Test User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create multiple permits with different statuses and creation times
    const now = new Date();
    const earlier = new Date(now.getTime() - 60000); // 1 minute earlier
    const later = new Date(now.getTime() + 60000); // 1 minute later

    // Insert first pending permit (oldest)
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'User One',
        nik: '1111111111',
        nama_sopir: 'Driver One',
        nomor_polisi: 'B 1234 ABC',
        tujuan: 'Jakarta',
        tanggal_berangkat: earlier,
        jam_berangkat: '08:00',
        tanggal_kembali: later,
        jam_kembali: '18:00',
        keterangan: 'Business trip',
        status: 'Pending',
        user_id: userId,
        created_at: earlier
      })
      .execute();

    // Insert approved permit (should not appear in results)
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'User Two',
        nik: '2222222222',
        nama_sopir: 'Driver Two',
        nomor_polisi: 'B 5678 DEF',
        tujuan: 'Bandung',
        tanggal_berangkat: now,
        jam_berangkat: '09:00',
        tanggal_kembali: later,
        jam_kembali: '19:00',
        keterangan: null,
        status: 'Disetujui',
        tanggal_persetujuan: now,
        jam_persetujuan: '10:00',
        user_id: userId,
        created_at: now
      })
      .execute();

    // Insert second pending permit (newer)
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'User Three',
        nik: '3333333333',
        nama_sopir: 'Driver Three',
        nomor_polisi: 'B 9876 GHI',
        tujuan: 'Surabaya',
        tanggal_berangkat: later,
        jam_berangkat: '07:00',
        tanggal_kembali: later,
        jam_kembali: '20:00',
        keterangan: 'Meeting',
        status: 'Pending',
        user_id: userId,
        created_at: later
      })
      .execute();

    const result = await getPendingPermits();

    // Should return only the 2 pending permits
    expect(result).toHaveLength(2);

    // Should be ordered by creation date (oldest first)
    expect(result[0].nama_pemakai).toEqual('User One');
    expect(result[0].status).toEqual('Pending');
    expect(result[0].created_at).toEqual(earlier);

    expect(result[1].nama_pemakai).toEqual('User Three');
    expect(result[1].status).toEqual('Pending');
    expect(result[1].created_at).toEqual(later);

    // Verify all required fields are present
    result.forEach(permit => {
      expect(permit.id).toBeDefined();
      expect(permit.nama_pemakai).toBeDefined();
      expect(permit.nik).toBeDefined();
      expect(permit.nama_sopir).toBeDefined();
      expect(permit.nomor_polisi).toBeDefined();
      expect(permit.tujuan).toBeDefined();
      expect(permit.tanggal_berangkat).toBeInstanceOf(Date);
      expect(permit.jam_berangkat).toBeDefined();
      expect(permit.tanggal_kembali).toBeInstanceOf(Date);
      expect(permit.jam_kembali).toBeDefined();
      expect(permit.status).toEqual('Pending');
      expect(permit.created_at).toBeInstanceOf(Date);
      expect(permit.user_id).toEqual(userId);
    });
  });

  it('should not return rejected permits', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'testuser',
        password: 'password123',
        nama: 'Test User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const now = new Date();

    // Insert rejected permit
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Rejected User',
        nik: '4444444444',
        nama_sopir: 'Rejected Driver',
        nomor_polisi: 'B 0000 XYZ',
        tujuan: 'Nowhere',
        tanggal_berangkat: now,
        jam_berangkat: '08:00',
        tanggal_kembali: now,
        jam_kembali: '18:00',
        keterangan: 'Rejected request',
        status: 'Ditolak',
        tanggal_persetujuan: now,
        jam_persetujuan: '10:00',
        user_id: userId
      })
      .execute();

    const result = await getPendingPermits();
    expect(result).toHaveLength(0);
  });

  it('should handle permits with null keterangan', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'testuser',
        password: 'password123',
        nama: 'Test User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const now = new Date();

    // Insert pending permit with null keterangan
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test User',
        nik: '5555555555',
        nama_sopir: 'Test Driver',
        nomor_polisi: 'B 1111 TEST',
        tujuan: 'Test Location',
        tanggal_berangkat: now,
        jam_berangkat: '08:00',
        tanggal_kembali: now,
        jam_kembali: '18:00',
        keterangan: null,
        status: 'Pending',
        user_id: userId
      })
      .execute();

    const result = await getPendingPermits();
    expect(result).toHaveLength(1);
    expect(result[0].keterangan).toBeNull();
    expect(result[0].tanggal_persetujuan).toBeNull();
    expect(result[0].jam_persetujuan).toBeNull();
  });

  it('should work with multiple users having pending permits', async () => {
    // Create two test users
    const user1Result = await db.insert(usersTable)
      .values({
        nik: '1111111111',
        username: 'user1',
        password: 'password123',
        nama: 'User One',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const user2Result = await db.insert(usersTable)
      .values({
        nik: '2222222222',
        username: 'user2',
        password: 'password123',
        nama: 'User Two',
        role: 'HR',
        fcm_token: null
      })
      .returning()
      .execute();

    const user1Id = user1Result[0].id;
    const user2Id = user2Result[0].id;
    const now = new Date();

    // Insert permits for both users
    await db.insert(izinKendaraanTable)
      .values([
        {
          nama_pemakai: 'User One Request',
          nik: '1111111111',
          nama_sopir: 'Driver A',
          nomor_polisi: 'B 1111 AAA',
          tujuan: 'Location A',
          tanggal_berangkat: now,
          jam_berangkat: '08:00',
          tanggal_kembali: now,
          jam_kembali: '18:00',
          keterangan: 'Request from user 1',
          status: 'Pending',
          user_id: user1Id
        },
        {
          nama_pemakai: 'User Two Request',
          nik: '2222222222',
          nama_sopir: 'Driver B',
          nomor_polisi: 'B 2222 BBB',
          tujuan: 'Location B',
          tanggal_berangkat: now,
          jam_berangkat: '09:00',
          tanggal_kembali: now,
          jam_kembali: '19:00',
          keterangan: 'Request from user 2',
          status: 'Pending',
          user_id: user2Id
        }
      ])
      .execute();

    const result = await getPendingPermits();
    expect(result).toHaveLength(2);

    // Verify both permits are returned
    const user1Permit = result.find(p => p.user_id === user1Id);
    const user2Permit = result.find(p => p.user_id === user2Id);

    expect(user1Permit).toBeDefined();
    expect(user1Permit!.nama_pemakai).toEqual('User One Request');
    expect(user2Permit).toBeDefined();
    expect(user2Permit!.nama_pemakai).toEqual('User Two Request');
  });

  it('should verify database contains the permits after creation', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        nik: '1234567890',
        username: 'testuser',
        password: 'password123',
        nama: 'Test User',
        role: 'Karyawan',
        fcm_token: null
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const now = new Date();

    // Insert pending permit
    const permitResult = await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Database Test User',
        nik: '9999999999',
        nama_sopir: 'Database Test Driver',
        nomor_polisi: 'B 9999 TEST',
        tujuan: 'Database Test Location',
        tanggal_berangkat: now,
        jam_berangkat: '08:00',
        tanggal_kembali: now,
        jam_kembali: '18:00',
        keterangan: 'Database verification test',
        status: 'Pending',
        user_id: userId
      })
      .returning()
      .execute();

    // Verify the permit exists in database
    const dbPermits = await db.select()
      .from(izinKendaraanTable)
      .where(eq(izinKendaraanTable.id, permitResult[0].id))
      .execute();

    expect(dbPermits).toHaveLength(1);
    expect(dbPermits[0].nama_pemakai).toEqual('Database Test User');
    expect(dbPermits[0].status).toEqual('Pending');

    // Test the handler
    const result = await getPendingPermits();
    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(permitResult[0].id);
    expect(result[0].nama_pemakai).toEqual('Database Test User');
  });
});