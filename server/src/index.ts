import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  loginInputSchema,
  createIzinKendaraanInputSchema,
  updatePermitStatusInputSchema,
  getPermitsFilterSchema,
  exportDataInputSchema,
  updateFcmTokenInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { login } from './handlers/login';
import { createIzinKendaraan } from './handlers/create_izin_kendaraan';
import { getIzinKendaraan } from './handlers/get_izin_kendaraan';
import { getUserPermits } from './handlers/get_user_permits';
import { updatePermitStatus } from './handlers/update_permit_status';
import { getPendingPermits } from './handlers/get_pending_permits';
import { exportPermitsExcel } from './handlers/export_permits_excel';
import { updateFcmToken } from './handlers/update_fcm_token';
import { getUserById } from './handlers/get_user_by_id';
import { getPermitById } from './handlers/get_permit_by_id';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management routes
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  login: publicProcedure
    .input(loginInputSchema)
    .mutation(({ input }) => login(input)),

  getUserById: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserById(input.userId)),

  updateFcmToken: publicProcedure
    .input(updateFcmTokenInputSchema)
    .mutation(({ input }) => updateFcmToken(input)),

  // Vehicle permit routes for employees
  createIzinKendaraan: publicProcedure
    .input(createIzinKendaraanInputSchema)
    .mutation(({ input }) => createIzinKendaraan(input)),

  getUserPermits: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserPermits(input.userId)),

  getPermitById: publicProcedure
    .input(z.object({ permitId: z.number() }))
    .query(({ input }) => getPermitById(input.permitId)),

  // HR routes for approval
  getPendingPermits: publicProcedure
    .query(() => getPendingPermits()),

  updatePermitStatus: publicProcedure
    .input(updatePermitStatusInputSchema)
    .mutation(({ input }) => updatePermitStatus(input)),

  // Admin routes for monitoring and reports
  getIzinKendaraan: publicProcedure
    .input(getPermitsFilterSchema.optional())
    .query(({ input }) => getIzinKendaraan(input)),

  exportPermitsExcel: publicProcedure
    .input(exportDataInputSchema)
    .mutation(async ({ input }) => {
      const excelBuffer = await exportPermitsExcel(input);
      // Convert Buffer to base64 string for JSON transport
      return {
        data: excelBuffer.toString('base64'),
        filename: `permits_${input.start_date.toISOString().split('T')[0]}_to_${input.end_date.toISOString().split('T')[0]}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    }),

  // Statistics route for admin dashboard
  getPermitStatistics: publicProcedure
    .input(z.object({
      filter: z.enum(['Hari Ini', 'Minggu Ini', 'Bulan Ini']).optional()
    }).optional())
    .query(({ input }) => {
      // This is a placeholder declaration! Real code should be implemented here.
      // The goal is to return statistics like total permits, approved, rejected, pending
      // based on the specified time filter for admin dashboard
      return Promise.resolve({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0
      });
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();