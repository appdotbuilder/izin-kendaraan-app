import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
import type { IzinKendaraan, GetPermitsFilter, Status, DateFilter, ExportDataInput } from '../../../server/src/schema';

interface AdminDashboardProps {
  getStatusBadge: (status: string) => React.ReactElement;
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export function AdminDashboard({ getStatusBadge }: AdminDashboardProps) {
  const [permits, setPermits] = useState<IzinKendaraan[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filter, setFilter] = useState<GetPermitsFilter>({
    filter: 'Hari Ini',
    status: undefined,
    user_id: undefined
  });

  // Export state
  const [exportData, setExportData] = useState<ExportDataInput>({
    start_date: new Date(),
    end_date: new Date(),
    status: undefined
  });

  const loadPermits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const allPermits = await trpc.getIzinKendaraan.query(filter);
      setPermits(allPermits);
      
      // Calculate statistics
      const stats = {
        total: allPermits.length,
        pending: allPermits.filter((p: IzinKendaraan) => p.status === 'Pending').length,
        approved: allPermits.filter((p: IzinKendaraan) => p.status === 'Disetujui').length,
        rejected: allPermits.filter((p: IzinKendaraan) => p.status === 'Ditolak').length
      };
      setStatistics(stats);
    } catch (error) {
      console.error('Failed to load permits:', error);
      setError('Gagal memuat data permohonan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadPermits();
  }, [loadPermits]);

  const handleExport = async () => {
    setExportLoading(true);
    setError(null);
    try {
      const response = await trpc.exportPermitsExcel.mutate(exportData);
      
      // Create blob and download
      const binaryString = atob(response.data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export data:', error);
      setError('Gagal mengekspor data. Silakan coba lagi.');
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
              <p className="text-sm text-gray-600">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
              <p className="text-sm text-gray-600">Disetujui</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
              <p className="text-sm text-gray-600">Ditolak</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitor" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monitor">📊 Monitor & Laporan</TabsTrigger>
          <TabsTrigger value="export">📥 Export Data</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monitor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Filter Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Filter Tanggal</Label>
                  <Select
                    value={filter.filter || 'Hari Ini'}
                    onValueChange={(value: DateFilter) => 
                      setFilter((prev: GetPermitsFilter) => ({ 
                        ...prev, 
                        filter: value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Hari Ini">📅 Hari Ini</SelectItem>
                      <SelectItem value="Minggu Ini">📅 Minggu Ini</SelectItem>
                      <SelectItem value="Bulan Ini">📅 Bulan Ini</SelectItem>
                      <SelectItem value="Custom">📅 Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Filter Status</Label>
                  <Select
                    value={filter.status || 'all'}
                    onValueChange={(value: Status | 'all') => 
                      setFilter((prev: GetPermitsFilter) => ({ 
                        ...prev, 
                        status: value === 'all' ? undefined : value 
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Pending">⏳ Pending</SelectItem>
                      <SelectItem value="Disetujui">✅ Disetujui</SelectItem>
                      <SelectItem value="Ditolak">❌ Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>&nbsp;</Label>
                  <Button onClick={loadPermits} disabled={loading} className="w-full">
                    {loading ? 'Memuat...' : '🔍 Terapkan Filter'}
                  </Button>
                </div>
              </div>

              {filter.filter === 'Custom' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div className="space-y-2">
                    <Label>Tanggal Mulai</Label>
                    <Input
                      type="date"
                      value={filter.start_date ? formatDateForInput(filter.start_date) : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFilter((prev: GetPermitsFilter) => ({
                          ...prev,
                          start_date: e.target.value ? new Date(e.target.value) : undefined
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tanggal Akhir</Label>
                    <Input
                      type="date"
                      value={filter.end_date ? formatDateForInput(filter.end_date) : ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFilter((prev: GetPermitsFilter) => ({
                          ...prev,
                          end_date: e.target.value ? new Date(e.target.value) : undefined
                        }))
                      }
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daftar Permohonan ({permits.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Memuat data...</p>
                </div>
              ) : permits.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Tidak ada data permohonan</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {permits.map((permit: IzinKendaraan) => (
                    <Card key={permit.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg">
                              🚗 {permit.nomor_polisi} - {permit.nama_pemakai}
                            </h4>
                          </div>
                          {getStatusBadge(permit.status)}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
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
                          <div>
                            <p><strong>Dibuat:</strong> {formatDate(permit.created_at)}</p>
                            {permit.status !== 'Pending' && permit.tanggal_persetujuan && (
                              <p><strong>Diproses:</strong> {formatDate(permit.tanggal_persetujuan)} - {permit.jam_persetujuan}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Export Data ke Excel</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Tanggal Mulai</Label>
                  <Input
                    type="date"
                    value={formatDateForInput(exportData.start_date)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExportData((prev: ExportDataInput) => ({
                        ...prev,
                        start_date: new Date(e.target.value)
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tanggal Akhir</Label>
                  <Input
                    type="date"
                    value={formatDateForInput(exportData.end_date)}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setExportData((prev: ExportDataInput) => ({
                        ...prev,
                        end_date: new Date(e.target.value)
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Filter Status</Label>
                  <Select
                    value={exportData.status || 'all'}
                    onValueChange={(value: Status | 'all') => 
                      setExportData((prev: ExportDataInput) => ({
                        ...prev,
                        status: value === 'all' ? undefined : value
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Pending">⏳ Pending</SelectItem>
                      <SelectItem value="Disetujui">✅ Disetujui</SelectItem>
                      <SelectItem value="Ditolak">❌ Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button 
                onClick={handleExport} 
                disabled={exportLoading} 
                className="w-full mt-4"
              >
                {exportLoading ? 'Mengekspor...' : '📥 Export ke Excel'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}