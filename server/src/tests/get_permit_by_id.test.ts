import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { type CreateUserInput, type CreateIzinKendaraanInput } from '../schema';
import { getPermitById } from '../handlers/get_permit_by_id';

// Test user data
const testUser: CreateUserInput = {
  nik: '1234567890',
  username: 'testuser',
  password: 'password123',
  nama: 'Test User',
  role: 'Karyawan',
  fcm_token: null
};

// Test permit data
const testPermitInput: CreateIzinKendaraanInput = {
  nama_pemakai: 'John Doe',
  nik: '9876543210',
  nama_sopir: 'Driver Smith',
  nomor_polisi: 'B1234ABC',
  tujuan: 'Jakarta',
  tanggal_berangkat: new Date('2024-01-15'),
  jam_berangkat: '08:00',
  tanggal_kembali: new Date('2024-01-16'),
  jam_kembali: '17:00',
  keterangan: 'Business trip',
  user_id: 1
};

describe('getPermitById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return permit when found', async () => {
    // Create test user first
    const userResults = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create test permit
    const permitResults = await db.insert(izinKendaraanTable)
      .values({
        ...testPermitInput,
        user_id: userId
      })
      .returning()
      .execute();

    const permitId = permitResults[0].id;

    // Test the handler
    const result = await getPermitById(permitId);

    // Verify all permit fields
    expect(result).not.toBeNull();
    expect(result!.id).toEqual(permitId);
    expect(result!.nama_pemakai).toEqual('John Doe');
    expect(result!.nik).toEqual('9876543210');
    expect(result!.nama_sopir).toEqual('Driver Smith');
    expect(result!.nomor_polisi).toEqual('B1234ABC');
    expect(result!.tujuan).toEqual('Jakarta');
    expect(result!.tanggal_berangkat).toBeInstanceOf(Date);
    expect(result!.jam_berangkat).toEqual('08:00');
    expect(result!.tanggal_kembali).toBeInstanceOf(Date);
    expect(result!.jam_kembali).toEqual('17:00');
    expect(result!.keterangan).toEqual('Business trip');
    expect(result!.status).toEqual('Pending');
    expect(result!.tanggal_persetujuan).toBeNull();
    expect(result!.jam_persetujuan).toBeNull();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.user_id).toEqual(userId);
  });

  it('should return null when permit not found', async () => {
    const result = await getPermitById(999);
    expect(result).toBeNull();
  });

  it('should work with permits that have approval data', async () => {
    // Create test user first
    const userResults = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create approved permit
    const approvalDate = new Date('2024-01-10');
    const permitResults = await db.insert(izinKendaraanTable)
      .values({
        ...testPermitInput,
        user_id: userId,
        status: 'Disetujui',
        tanggal_persetujuan: approvalDate,
        jam_persetujuan: '10:30'
      })
      .returning()
      .execute();

    const permitId = permitResults[0].id;

    // Test the handler
    const result = await getPermitById(permitId);

    // Verify approval data
    expect(result).not.toBeNull();
    expect(result!.status).toEqual('Disetujui');
    expect(result!.tanggal_persetujuan).toBeInstanceOf(Date);
    expect(result!.tanggal_persetujuan!.getTime()).toEqual(approvalDate.getTime());
    expect(result!.jam_persetujuan).toEqual('10:30');
  });

  it('should work with permits that have null keterangan', async () => {
    // Create test user first
    const userResults = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create permit without keterangan
    const permitResults = await db.insert(izinKendaraanTable)
      .values({
        ...testPermitInput,
        user_id: userId,
        keterangan: null
      })
      .returning()
      .execute();

    const permitId = permitResults[0].id;

    // Test the handler
    const result = await getPermitById(permitId);

    // Verify nullable field handling
    expect(result).not.toBeNull();
    expect(result!.keterangan).toBeNull();
  });

  it('should work with different permit statuses', async () => {
    // Create test user first
    const userResults = await db.insert(usersTable)
      .values({
        nik: testUser.nik,
        username: testUser.username,
        password: testUser.password,
        nama: testUser.nama,
        role: testUser.role,
        fcm_token: testUser.fcm_token
      })
      .returning()
      .execute();

    const userId = userResults[0].id;

    // Create rejected permit
    const permitResults = await db.insert(izinKendaraanTable)
      .values({
        ...testPermitInput,
        user_id: userId,
        status: 'Ditolak',
        tanggal_persetujuan: new Date(),
        jam_persetujuan: '14:00'
      })
      .returning()
      .execute();

    const permitId = permitResults[0].id;

    // Test the handler
    const result = await getPermitById(permitId);

    // Verify status handling
    expect(result).not.toBeNull();
    expect(result!.status).toEqual('Ditolak');
  });
});