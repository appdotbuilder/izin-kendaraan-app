import { z } from 'zod';

// Status enum for vehicle permit applications
export const statusEnum = z.enum(['Pending', 'Disetujui', 'Ditolak']);
export type Status = z.infer<typeof statusEnum>;

// User role enum
export const userRoleEnum = z.enum(['Karyawan', 'HR', 'Admin']);
export type UserRole = z.infer<typeof userRoleEnum>;

// User schema
export const userSchema = z.object({
  id: z.number(),
  nik: z.string(),
  username: z.string(),
  password: z.string(),
  nama: z.string(),
  role: userRoleEnum,
  fcm_token: z.string().nullable(), // For push notifications
  created_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Vehicle permit schema
export const izinKendaraanSchema = z.object({
  id: z.number(),
  nama_pemakai: z.string(),
  nik: z.string(),
  nama_sopir: z.string(),
  nomor_polisi: z.string(),
  tujuan: z.string(),
  tanggal_berangkat: z.coerce.date(),
  jam_berangkat: z.string(),
  tanggal_kembali: z.coerce.date(),
  jam_kembali: z.string(),
  keterangan: z.string().nullable(),
  status: statusEnum,
  tanggal_persetujuan: z.coerce.date().nullable(),
  jam_persetujuan: z.string().nullable(),
  created_at: z.coerce.date(),
  user_id: z.number() // Foreign key to users table
});

export type IzinKendaraan = z.infer<typeof izinKendaraanSchema>;

// Input schema for creating vehicle permits
export const createIzinKendaraanInputSchema = z.object({
  nama_pemakai: z.string().min(1, "Nama pemakai is required"),
  nik: z.string().min(1, "NIK is required"),
  nama_sopir: z.string().min(1, "Nama sopir is required"),
  nomor_polisi: z.string().min(1, "Nomor polisi is required"),
  tujuan: z.string().min(1, "Tujuan is required"),
  tanggal_berangkat: z.coerce.date(),
  jam_berangkat: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam harus HH:MM"),
  tanggal_kembali: z.coerce.date(),
  jam_kembali: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam harus HH:MM"),
  keterangan: z.string().nullable(),
  user_id: z.number()
});

export type CreateIzinKendaraanInput = z.infer<typeof createIzinKendaraanInputSchema>;

// Input schema for updating permit status (HR action)
export const updatePermitStatusInputSchema = z.object({
  id: z.number(),
  status: z.enum(['Disetujui', 'Ditolak']),
  tanggal_persetujuan: z.coerce.date(),
  jam_persetujuan: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Format jam harus HH:MM")
});

export type UpdatePermitStatusInput = z.infer<typeof updatePermitStatusInputSchema>;

// User authentication schemas
export const loginInputSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
  fcm_token: z.string().optional() // For push notifications
});

export type LoginInput = z.infer<typeof loginInputSchema>;

export const createUserInputSchema = z.object({
  nik: z.string().min(1, "NIK is required"),
  username: z.string().min(1, "Username is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  nama: z.string().min(1, "Nama is required"),
  role: userRoleEnum,
  fcm_token: z.string().nullable()
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

// Filter schemas for admin reports
export const dateFilterEnum = z.enum(['Hari Ini', 'Minggu Ini', 'Bulan Ini', 'Custom']);
export type DateFilter = z.infer<typeof dateFilterEnum>;

export const getPermitsFilterSchema = z.object({
  filter: dateFilterEnum.optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: statusEnum.optional(),
  user_id: z.number().optional() // For filtering by specific user
});

export type GetPermitsFilter = z.infer<typeof getPermitsFilterSchema>;

// Export data schema for Excel export
export const exportDataInputSchema = z.object({
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: statusEnum.optional()
});

export type ExportDataInput = z.infer<typeof exportDataInputSchema>;

// Authentication response schema
export const authResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export type AuthResponse = z.infer<typeof authResponseSchema>;

// Update FCM token schema
export const updateFcmTokenInputSchema = z.object({
  user_id: z.number(),
  fcm_token: z.string()
});

export type UpdateFcmTokenInput = z.infer<typeof updateFcmTokenInputSchema>;