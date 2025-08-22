import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoginForm } from '@/components/LoginForm';
import { PermitForm } from '@/components/PermitForm';
import { PermitList } from '@/components/PermitList';
import { PendingPermits } from '@/components/PendingPermits';
import { AdminDashboard } from '@/components/AdminDashboard';
import { trpc } from '@/utils/trpc';
import type { User, IzinKendaraan } from '../../server/src/schema';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [userPermits, setUserPermits] = useState<IzinKendaraan[]>([]);
  const [loading, setLoading] = useState(false);

  // Check if user is stored in localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('vehicle-permit-user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (error) {
        console.error('Failed to parse stored user:', error);
        localStorage.removeItem('vehicle-permit-user');
      }
    }
  }, []);

  // Load user permits when user is set and is an employee
  useEffect(() => {
    if (user && user.role === 'Karyawan') {
      loadUserPermits();
    }
  }, [user]);

  const loadUserPermits = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const permits = await trpc.getUserPermits.query({ userId: user.id });
      setUserPermits(permits);
    } catch (error) {
      console.error('Failed to load user permits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    localStorage.setItem('vehicle-permit-user', JSON.stringify(loggedInUser));
  };

  const handleLogout = () => {
    setUser(null);
    setUserPermits([]);
    localStorage.removeItem('vehicle-permit-user');
  };

  const handlePermitCreated = (newPermit: IzinKendaraan) => {
    setUserPermits(prev => [newPermit, ...prev]);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-500';
      case 'Disetujui': return 'bg-green-500';
      case 'Ditolak': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    const colorClass = getStatusColor(status);
    return (
      <Badge className={`${colorClass} text-white`}>
        {status}
      </Badge>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-gray-800">
                🚗 Sistem Izin Kendaraan
              </CardTitle>
              <p className="text-gray-600">Silakan login untuk melanjutkan</p>
            </CardHeader>
            <CardContent>
              <LoginForm onLogin={handleLogin} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚗</span>
            <div>
              <h1 className="text-xl font-bold text-gray-800">Sistem Izin Kendaraan</h1>
              <p className="text-sm text-gray-600">
                Selamat datang, {user.nama} ({user.role})
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {user.role === 'Karyawan' && (
          <Tabs defaultValue="create" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="create">📝 Buat Permohonan</TabsTrigger>
              <TabsTrigger value="history">📋 Riwayat Permohonan</TabsTrigger>
            </TabsList>
            
            <TabsContent value="create" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Form Permohonan Izin Kendaraan</CardTitle>
                </CardHeader>
                <CardContent>
                  <PermitForm 
                    userId={user.id} 
                    onPermitCreated={handlePermitCreated}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Riwayat Permohonan Anda</CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="text-center py-8">
                      <p className="text-gray-500">Memuat data...</p>
                    </div>
                  ) : (
                    <PermitList 
                      permits={userPermits}
                      getStatusBadge={getStatusBadge}
                    />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {user.role === 'HR' && (
          <Card>
            <CardHeader>
              <CardTitle>📋 Permohonan Menunggu Persetujuan</CardTitle>
            </CardHeader>
            <CardContent>
              <PendingPermits getStatusBadge={getStatusBadge} />
            </CardContent>
          </Card>
        )}

        {user.role === 'Admin' && (
          <AdminDashboard getStatusBadge={getStatusBadge} />
        )}
      </main>
    </div>
  );
}

export default App;