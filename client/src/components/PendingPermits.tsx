import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import type { IzinKendaraan, UpdatePermitStatusInput } from '../../../server/src/schema';

interface PendingPermitsProps {
  getStatusBadge: (status: string) => React.ReactElement;
}

export function PendingPermits({ getStatusBadge }: PendingPermitsProps) {
  const [permits, setPermits] = useState<IzinKendaraan[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPendingPermits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const pendingPermits = await trpc.getPendingPermits.query();
      setPermits(pendingPermits);
    } catch (error) {
      console.error('Failed to load pending permits:', error);
      setError('Gagal memuat data permohonan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingPermits();
  }, [loadPendingPermits]);

  const handleStatusUpdate = async (permitId: number, status: 'Disetujui' | 'Ditolak') => {
    setActionLoading(permitId);
    setError(null);

    const now = new Date();
    const updateData: UpdatePermitStatusInput = {
      id: permitId,
      status,
      tanggal_persetujuan: now,
      jam_persetujuan: now.toTimeString().slice(0, 5) // HH:MM format
    };

    try {
      await trpc.updatePermitStatus.mutate(updateData);
      // Remove the updated permit from the list
      setPermits((prev: IzinKendaraan[]) => 
        prev.filter((permit: IzinKendaraan) => permit.id !== permitId)
      );
    } catch (error) {
      console.error('Failed to update permit status:', error);
      setError('Gagal memperbarui status permohonan. Silakan coba lagi.');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Memuat permohonan...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {permits.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-2">✅ Tidak ada permohonan pending</p>
          <p className="text-sm text-gray-400">
            Semua permohonan sudah diproses
          </p>
        </div>
      ) : (
        permits.map((permit: IzinKendaraan) => (
          <Card key={permit.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">
                  🚗 {permit.nomor_polisi} - {permit.nama_pemakai}
                </CardTitle>
                {getStatusBadge(permit.status)}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-4">
                <div>
                  <p><strong>NIK:</strong> {permit.nik}</p>
                  <p><strong>Sopir:</strong> {permit.nama_sopir}</p>
                  <p><strong>Tujuan:</strong> {permit.tujuan}</p>
                </div>
                <div>
                  <p><strong>Berangkat:</strong> {formatDate(permit.tanggal_berangkat)} - {permit.jam_berangkat}</p>
                  <p><strong>Kembali:</strong> {formatDate(permit.tanggal_kembali)} - {permit.jam_kembali}</p>
                  {permit.keterangan && (
                    <p><strong>Keterangan:</strong> {permit.keterangan}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="default" 
                      className="bg-green-600 hover:bg-green-700"
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === permit.id ? 'Memproses...' : '✅ Setujui'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Setujui Permohonan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menyetujui permohonan izin kendaraan {permit.nomor_polisi} untuk {permit.nama_pemakai}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleStatusUpdate(permit.id, 'Disetujui')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Ya, Setujui
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="destructive"
                      disabled={actionLoading !== null}
                    >
                      {actionLoading === permit.id ? 'Memproses...' : '❌ Tolak'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Tolak Permohonan</AlertDialogTitle>
                      <AlertDialogDescription>
                        Apakah Anda yakin ingin menolak permohonan izin kendaraan {permit.nomor_polisi} untuk {permit.nama_pemakai}?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleStatusUpdate(permit.id, 'Ditolak')}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Ya, Tolak
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              <div className="mt-3 pt-3 border-t">
                <p className="text-xs text-gray-500">
                  Dibuat: {formatDate(permit.created_at)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}