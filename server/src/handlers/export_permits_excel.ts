import { db } from '../db';
import { izinKendaraanTable, usersTable } from '../db/schema';
import { type ExportDataInput } from '../schema';
import { eq, gte, lte, and } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

export async function exportPermitsExcel(input: ExportDataInput): Promise<Buffer> {
  try {
    // Build conditions array for filters
    const conditions: SQL<unknown>[] = [];

    // Add date range filter
    conditions.push(gte(izinKendaraanTable.created_at, input.start_date));
    conditions.push(lte(izinKendaraanTable.created_at, input.end_date));

    // Add status filter if provided
    if (input.status) {
      conditions.push(eq(izinKendaraanTable.status, input.status));
    }

    // Build and execute query in one step
    const permits = await db.select({
      id: izinKendaraanTable.id,
      nama_pemakai: izinKendaraanTable.nama_pemakai,
      nik: izinKendaraanTable.nik,
      nama_sopir: izinKendaraanTable.nama_sopir,
      nomor_polisi: izinKendaraanTable.nomor_polisi,
      tujuan: izinKendaraanTable.tujuan,
      tanggal_berangkat: izinKendaraanTable.tanggal_berangkat,
      jam_berangkat: izinKendaraanTable.jam_berangkat,
      tanggal_kembali: izinKendaraanTable.tanggal_kembali,
      jam_kembali: izinKendaraanTable.jam_kembali,
      keterangan: izinKendaraanTable.keterangan,
      status: izinKendaraanTable.status,
      tanggal_persetujuan: izinKendaraanTable.tanggal_persetujuan,
      jam_persetujuan: izinKendaraanTable.jam_persetujuan,
      created_at: izinKendaraanTable.created_at,
      user_nama: usersTable.nama
    })
    .from(izinKendaraanTable)
    .innerJoin(usersTable, eq(izinKendaraanTable.user_id, usersTable.id))
    .where(and(...conditions))
    .execute();

    // Generate CSV content (which can be opened in Excel)
    const headers = [
      'No',
      'Nama Pemohon', 
      'Nama Pemakai',
      'NIK',
      'Nama Sopir',
      'Nomor Polisi',
      'Tujuan',
      'Tanggal Berangkat',
      'Jam Berangkat',
      'Tanggal Kembali',
      'Jam Kembali',
      'Keterangan',
      'Status',
      'Tanggal Persetujuan',
      'Jam Persetujuan',
      'Tanggal Dibuat'
    ];

    // Create CSV content
    let csvContent = '';
    
    // Add title and summary information
    csvContent += `LAPORAN IZIN KENDARAAN\n`;
    csvContent += `Periode: ${input.start_date.toLocaleDateString('id-ID')} - ${input.end_date.toLocaleDateString('id-ID')}\n`;
    csvContent += `Status: ${input.status || 'Semua'}\n`;
    csvContent += `Total: ${permits.length} permit\n`;
    csvContent += `\n`;
    
    // Add headers
    csvContent += headers.join(',') + '\n';

    // Add data rows
    permits.forEach((permit, index) => {
      const row = [
        index + 1,
        `"${permit.user_nama}"`,
        `"${permit.nama_pemakai}"`,
        `"${permit.nik}"`,
        `"${permit.nama_sopir}"`,
        `"${permit.nomor_polisi}"`,
        `"${permit.tujuan}"`,
        `"${permit.tanggal_berangkat.toLocaleDateString('id-ID')}"`,
        `"${permit.jam_berangkat}"`,
        `"${permit.tanggal_kembali.toLocaleDateString('id-ID')}"`,
        `"${permit.jam_kembali}"`,
        `"${permit.keterangan || '-'}"`,
        `"${permit.status}"`,
        `"${permit.tanggal_persetujuan ? permit.tanggal_persetujuan.toLocaleDateString('id-ID') : '-'}"`,
        `"${permit.jam_persetujuan || '-'}"`,
        `"${permit.created_at.toLocaleDateString('id-ID')}"`
      ];
      csvContent += row.join(',') + '\n';
    });

    // Convert to buffer with UTF-8 BOM for proper Excel display
    const bom = Buffer.from('\uFEFF', 'utf8');
    const csvBuffer = Buffer.from(csvContent, 'utf8');
    return Buffer.concat([bom, csvBuffer]);

  } catch (error) {
    console.error('Excel export failed:', error);
    throw error;
  }
}