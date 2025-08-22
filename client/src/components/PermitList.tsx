import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IzinKendaraan } from '../../../server/src/schema';

interface PermitListProps {
  permits: IzinKendaraan[];
  getStatusBadge: (status: string) => React.ReactElement;
}

export function PermitList({ permits, getStatusBadge }: PermitListProps) {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  if (permits.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 mb-2">📝 Belum ada permohonan</p>
        <p className="text-sm text-gray-400">
          Buat permohonan baru di tab "Buat Permohonan"
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {permits.map((permit: IzinKendaraan) => (
        <Card key={permit.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <CardTitle className="text-lg">
                🚗 {permit.nomor_polisi}
              </CardTitle>
              {getStatusBadge(permit.status)}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p><strong>Pemakai:</strong> {permit.nama_pemakai}</p>
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
            
            {permit.status !== 'Pending' && permit.tanggal_persetujuan && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-600">
                  <strong>Diproses:</strong> {formatDate(permit.tanggal_persetujuan)} - {permit.jam_persetujuan}
                </p>
              </div>
            )}
            
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs text-gray-500">
                Dibuat: {formatDate(permit.created_at)}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}