import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export type LoginPayload = {
  email: string;
  tenant: string;
  password: string;
};

export function LoginPage() {
  const [form, setForm] = useState<LoginPayload>({ email: '', tenant: '', password: '' });

  return (
    <div className="page-stack auth-page">
      <PageHeader title="Login" description="Log in op het CWS NEN-1090 platform." />
      <Card>
        <div className="form-grid">
          <Input value={form.tenant} onChange={(e) => setForm((s) => ({ ...s, tenant: e.target.value }))} placeholder="Tenant" />
          <Input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} placeholder="E-mail" />
          <Input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} placeholder="Wachtwoord" />
          <Button type="button" disabled>Inloggen</Button>
        </div>
      </Card>
    </div>
  );
}

export default LoginPage;
