import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum definitions
export const statusEnum = pgEnum('status', ['Pending', 'Disetujui', 'Ditolak']);
export const userRoleEnum = pgEnum('user_role', ['Karyawan', 'HR', 'Admin']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  nik: text('nik').notNull().unique(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  nama: text('nama').notNull(),
  role: userRoleEnum('role').notNull(),
  fcm_token: text('fcm_token'), // Nullable for push notifications
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Vehicle permits table
export const izinKendaraanTable = pgTable('izin_kendaraan', {
  id: serial('id').primaryKey(),
  nama_pemakai: text('nama_pemakai').notNull(),
  nik: text('nik').notNull(),
  nama_sopir: text('nama_sopir').notNull(),
  nomor_polisi: text('nomor_polisi').notNull(),
  tujuan: text('tujuan').notNull(),
  tanggal_berangkat: timestamp('tanggal_berangkat').notNull(),
  jam_berangkat: text('jam_berangkat').notNull(),
  tanggal_kembali: timestamp('tanggal_kembali').notNull(),
  jam_kembali: text('jam_kembali').notNull(),
  keterangan: text('keterangan'), // Nullable
  status: statusEnum('status').notNull().default('Pending'),
  tanggal_persetujuan: timestamp('tanggal_persetujuan'), // Nullable
  jam_persetujuan: text('jam_persetujuan'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
});

// Relations
export const usersRelations = relations(usersTable, ({ many }) => ({
  izinKendaraan: many(izinKendaraanTable),
}));

export const izinKendaraanRelations = relations(izinKendaraanTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [izinKendaraanTable.user_id],
    references: [usersTable.id],
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect; // For SELECT operations
export type NewUser = typeof usersTable.$inferInsert; // For INSERT operations

export type IzinKendaraan = typeof izinKendaraanTable.$inferSelect; // For SELECT operations
export type NewIzinKendaraan = typeof izinKendaraanTable.$inferInsert; // For INSERT operations

// Export all tables and relations for proper query building
export const tables = { 
  users: usersTable, 
  izinKendaraan: izinKendaraanTable 
};

export const schema = {
  ...tables,
  usersRelations,
  izinKendaraanRelations,
};