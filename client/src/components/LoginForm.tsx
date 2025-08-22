import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { trpc } from '@/utils/trpc';
import type { User, LoginInput } from '../../../server/src/schema';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginInput>({
    username: '',
    password: '',
    fcm_token: undefined
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await trpc.login.mutate(formData);
      onLogin(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      setError('Username atau password salah. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="username">Username/NIK</Label>
        <Input
          id="username"
          type="text"
          value={formData.username}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, username: e.target.value }))
          }
          placeholder="Masukkan username atau NIK"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={formData.password}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setFormData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
          }
          placeholder="Masukkan password"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sedang login...' : 'Login'}
      </Button>
    </form>
  );
}