import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, izinKendaraanTable } from '../db/schema';
import { type ExportDataInput } from '../schema';
import { exportPermitsExcel } from '../handlers/export_permits_excel';

describe('exportPermitsExcel', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
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

    testUserId = userResult[0].id;
  });

  it('should export permits to CSV with all required columns', async () => {
    // Create test permits
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values([
        {
          nama_pemakai: 'John Doe',
          nik: '1234567890',
          nama_sopir: 'Driver One',
          nomor_polisi: 'B 1234 CD',
          tujuan: 'Jakarta',
          tanggal_berangkat: today,
          jam_berangkat: '08:00',
          tanggal_kembali: tomorrow,
          jam_kembali: '17:00',
          keterangan: 'Business trip',
          status: 'Disetujui',
          tanggal_persetujuan: today,
          jam_persetujuan: '07:00',
          user_id: testUserId
        },
        {
          nama_pemakai: 'Jane Smith',
          nik: '0987654321',
          nama_sopir: 'Driver Two',
          nomor_polisi: 'B 5678 EF',
          tujuan: 'Bandung',
          tanggal_berangkat: today,
          jam_berangkat: '09:00',
          tanggal_kembali: tomorrow,
          jam_kembali: '18:00',
          keterangan: null,
          status: 'Pending',
          tanggal_persetujuan: null,
          jam_persetujuan: null,
          user_id: testUserId
        }
      ])
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow
    };

    const buffer = await exportPermitsExcel(input);

    // Verify buffer is not empty
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // Convert buffer to string and verify content
    const csvContent = buffer.toString('utf8');
    
    // Check title and summary information
    expect(csvContent).toContain('LAPORAN IZIN KENDARAAN');
    expect(csvContent).toContain('Total: 2 permit');
    expect(csvContent).toContain('Status: Semua');
    
    // Check headers
    expect(csvContent).toContain('Nama Pemohon');
    expect(csvContent).toContain('Nama Pemakai');
    expect(csvContent).toContain('Status');
    
    // Check data content
    expect(csvContent).toContain('John Doe');
    expect(csvContent).toContain('Jane Smith');
    expect(csvContent).toContain('Jakarta');
    expect(csvContent).toContain('Bandung');
  });

  it('should filter permits by status', async () => {
    // Create permits with different statuses
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values([
        {
          nama_pemakai: 'Approved User',
          nik: '1111111111',
          nama_sopir: 'Driver One',
          nomor_polisi: 'B 1111 AA',
          tujuan: 'Jakarta',
          tanggal_berangkat: today,
          jam_berangkat: '08:00',
          tanggal_kembali: tomorrow,
          jam_kembali: '17:00',
          keterangan: 'Approved trip',
          status: 'Disetujui',
          tanggal_persetujuan: today,
          jam_persetujuan: '07:00',
          user_id: testUserId
        },
        {
          nama_pemakai: 'Pending User',
          nik: '2222222222',
          nama_sopir: 'Driver Two',
          nomor_polisi: 'B 2222 BB',
          tujuan: 'Bandung',
          tanggal_berangkat: today,
          jam_berangkat: '09:00',
          tanggal_kembali: tomorrow,
          jam_kembali: '18:00',
          keterangan: 'Pending trip',
          status: 'Pending',
          tanggal_persetujuan: null,
          jam_persetujuan: null,
          user_id: testUserId
        }
      ])
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow,
      status: 'Disetujui'
    };

    const buffer = await exportPermitsExcel(input);

    // Convert buffer to string and verify filtering
    const csvContent = buffer.toString('utf8');
    
    // Should contain only approved permit
    expect(csvContent).toContain('Total: 1 permit');
    expect(csvContent).toContain('Status: Disetujui');
    expect(csvContent).toContain('Approved User');
    expect(csvContent).not.toContain('Pending User');
  });

  it('should filter permits by date range', async () => {
    // Create permits on different dates
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values([
        {
          nama_pemakai: 'Old Permit',
          nik: '1111111111',
          nama_sopir: 'Driver One',
          nomor_polisi: 'B 1111 AA',
          tujuan: 'Jakarta',
          tanggal_berangkat: yesterday,
          jam_berangkat: '08:00',
          tanggal_kembali: today,
          jam_kembali: '17:00',
          keterangan: 'Old trip',
          status: 'Disetujui',
          tanggal_persetujuan: yesterday,
          jam_persetujuan: '07:00',
          user_id: testUserId,
          created_at: yesterday
        },
        {
          nama_pemakai: 'New Permit',
          nik: '2222222222',
          nama_sopir: 'Driver Two',
          nomor_polisi: 'B 2222 BB',
          tujuan: 'Bandung',
          tanggal_berangkat: today,
          jam_berangkat: '09:00',
          tanggal_kembali: tomorrow,
          jam_kembali: '18:00',
          keterangan: 'New trip',
          status: 'Pending',
          tanggal_persetujuan: null,
          jam_persetujuan: null,
          user_id: testUserId,
          created_at: today
        }
      ])
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow
    };

    const buffer = await exportPermitsExcel(input);

    // Convert buffer to string and verify date filtering
    const csvContent = buffer.toString('utf8');
    
    // Should contain only today's permit
    expect(csvContent).toContain('Total: 1 permit');
    expect(csvContent).toContain('New Permit');
    expect(csvContent).not.toContain('Old Permit');
  });

  it('should handle permits with null values correctly', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Test User',
        nik: '1234567890',
        nama_sopir: 'Test Driver',
        nomor_polisi: 'B 1234 CD',
        tujuan: 'Test Destination',
        tanggal_berangkat: today,
        jam_berangkat: '08:00',
        tanggal_kembali: tomorrow,
        jam_kembali: '17:00',
        keterangan: null, // Null keterangan
        status: 'Pending',
        tanggal_persetujuan: null, // Null approval date
        jam_persetujuan: null, // Null approval time
        user_id: testUserId
      })
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow
    };

    const buffer = await exportPermitsExcel(input);

    // Convert buffer to string and verify null handling
    const csvContent = buffer.toString('utf8');
    
    // Check that null values are displayed as '-'
    const lines = csvContent.split('\n');
    const dataLine = lines.find(line => line.includes('Test User'));
    expect(dataLine).toBeDefined();
    expect(dataLine).toContain('"-"'); // Should contain quoted dash for null values
  });

  it('should export empty result when no permits match filters', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow,
      status: 'Disetujui' // No permits with this status exist
    };

    const buffer = await exportPermitsExcel(input);

    // Convert buffer to string and verify empty result
    const csvContent = buffer.toString('utf8');
    
    // Should show 0 permits
    expect(csvContent).toContain('Total: 0 permit');
    expect(csvContent).toContain('Status: Disetujui');
    
    // Should still have headers but no data rows
    expect(csvContent).toContain('Nama Pemohon');
    
    // Count lines - should have title (4 lines) + header + no data rows
    const lines = csvContent.split('\n').filter(line => line.trim());
    expect(lines.length).toBe(5); // 4 title lines + 1 header
  });

  it('should include proper CSV formatting with BOM', async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Format Test User',
        nik: '1234567890',
        nama_sopir: 'Format Driver',
        nomor_polisi: 'B 1234 CD',
        tujuan: 'Format Destination',
        tanggal_berangkat: today,
        jam_berangkat: '08:00',
        tanggal_kembali: tomorrow,
        jam_kembali: '17:00',
        keterangan: 'Format test',
        status: 'Disetujui',
        tanggal_persetujuan: today,
        jam_persetujuan: '07:00',
        user_id: testUserId
      })
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: tomorrow
    };

    const buffer = await exportPermitsExcel(input);

    // Check that buffer starts with BOM
    const bomBytes = buffer.slice(0, 3);
    expect(bomBytes.toString()).toBe('\uFEFF');

    // Convert buffer to string and verify CSV structure
    const csvContent = buffer.toString('utf8');
    
    // Check CSV structure
    expect(csvContent).toContain('LAPORAN IZIN KENDARAAN');
    expect(csvContent).toContain('Periode:');
    expect(csvContent).toContain('Status:');
    expect(csvContent).toContain('Total:');
    
    // Check that data is properly quoted
    expect(csvContent).toContain('"Format Test User"');
    expect(csvContent).toContain('"Format Destination"');
  });

  it('should handle date filtering correctly with timestamps', async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day
    
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999); // End of day

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Create permit exactly at start of day
    await db.insert(izinKendaraanTable)
      .values({
        nama_pemakai: 'Timestamp Test',
        nik: '1234567890',
        nama_sopir: 'Test Driver',
        nomor_polisi: 'B 1234 CD',
        tujuan: 'Test Destination',
        tanggal_berangkat: today,
        jam_berangkat: '08:00',
        tanggal_kembali: tomorrow,
        jam_kembali: '17:00',
        keterangan: 'Timestamp test',
        status: 'Pending',
        tanggal_persetujuan: null,
        jam_persetujuan: null,
        user_id: testUserId,
        created_at: today
      })
      .execute();

    const input: ExportDataInput = {
      start_date: today,
      end_date: endOfDay
    };

    const buffer = await exportPermitsExcel(input);
    const csvContent = buffer.toString('utf8');
    
    // Should find the permit created at start of day
    expect(csvContent).toContain('Total: 1 permit');
    expect(csvContent).toContain('Timestamp Test');
  });
});