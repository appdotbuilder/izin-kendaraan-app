import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { CreateIzinKendaraanInput, IzinKendaraan } from '../../../server/src/schema';

interface PermitFormProps {
  userId: number;
  onPermitCreated: (permit: IzinKendaraan) => void;
}

export function PermitForm({ userId, onPermitCreated }: PermitFormProps) {
  const [formData, setFormData] = useState<CreateIzinKendaraanInput>({
    nama_pemakai: '',
    nik: '',
    nama_sopir: '',
    nomor_polisi: '',
    tujuan: '',
    tanggal_berangkat: new Date(),
    jam_berangkat: '',
    tanggal_kembali: new Date(),
    jam_kembali: '',
    keterangan: null,
    user_id: userId
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const newPermit = await trpc.createIzinKendaraan.mutate(formData);
      onPermitCreated(newPermit);
      setSuccess(true);
      
      // Reset form
      setFormData({
        nama_pemakai: '',
        nik: '',
        nama_sopir: '',
        nomor_polisi: '',
        tujuan: '',
        tanggal_berangkat: new Date(),
        jam_berangkat: '',
        tanggal_kembali: new Date(),
        jam_kembali: '',
        keterangan: null,
        user_id: userId
      });
    } catch (error) {
      console.error('Failed to create permit:', error);
      setError('Gagal membuat permohonan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="bg-green-50 border-green-200 text-green-800">
          <AlertDescription>
            ✅ Permohonan berhasil dibuat! Status: Pending
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nama_pemakai">Nama Pemakai</Label>
          <Input
            id="nama_pemakai"
            value={formData.nama_pemakai}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                nama_pemakai: e.target.value 
              }))
            }
            placeholder="Nama lengkap pemakai kendaraan"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nik">NIK</Label>
          <Input
            id="nik"
            value={formData.nik}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                nik: e.target.value 
              }))
            }
            placeholder="Nomor Induk Kependudukan"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nama_sopir">Nama Sopir</Label>
          <Input
            id="nama_sopir"
            value={formData.nama_sopir}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                nama_sopir: e.target.value 
              }))
            }
            placeholder="Nama sopir yang akan mengemudi"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="nomor_polisi">Nomor Polisi</Label>
          <Input
            id="nomor_polisi"
            value={formData.nomor_polisi}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                nomor_polisi: e.target.value 
              }))
            }
            placeholder="B 1234 XYZ"
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tujuan">Tujuan</Label>
          <Input
            id="tujuan"
            value={formData.tujuan}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                tujuan: e.target.value 
              }))
            }
            placeholder="Tujuan perjalanan"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tanggal_berangkat">Tanggal Berangkat</Label>
          <Input
            id="tanggal_berangkat"
            type="date"
            value={formatDateForInput(formData.tanggal_berangkat)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                tanggal_berangkat: new Date(e.target.value) 
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jam_berangkat">Jam Berangkat</Label>
          <Input
            id="jam_berangkat"
            type="time"
            value={formData.jam_berangkat}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                jam_berangkat: e.target.value 
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tanggal_kembali">Tanggal Kembali</Label>
          <Input
            id="tanggal_kembali"
            type="date"
            value={formatDateForInput(formData.tanggal_kembali)}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                tanggal_kembali: new Date(e.target.value) 
              }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="jam_kembali">Jam Kembali</Label>
          <Input
            id="jam_kembali"
            type="time"
            value={formData.jam_kembali}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                jam_kembali: e.target.value 
              }))
            }
            required
          />
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="keterangan">Keterangan (Opsional)</Label>
          <Textarea
            id="keterangan"
            value={formData.keterangan || ''}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
              setFormData((prev: CreateIzinKendaraanInput) => ({ 
                ...prev, 
                keterangan: e.target.value || null 
              }))
            }
            placeholder="Keterangan tambahan jika diperlukan"
            rows={3}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sedang membuat...' : '🚗 Buat Permohonan'}
      </Button>
    </form>
  );
}