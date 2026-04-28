import React, { useState } from "react";
import { useTenantUserActions } from "@/hooks/useTenantUserActions";

type TenantUser = {
  id: string;
  email: string;
  is_active: boolean;
};

export default function SuperadminPage() {
  const tenantUserActions = useTenantUserActions();
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [editingUser, setEditingUser] = useState<TenantUser | null>(null);

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Delete user?")) return;
    await tenantUserActions.deleteUser.mutateAsync(userId);
    setUsers(prev => prev.filter(u => u.id !== userId));
  };

  const toggleUserActive = async (user: TenantUser) => {
    await tenantUserActions.updateUser.mutateAsync({
      userId: user.id,
      data: { is_active: !user.is_active }
    });
    setUsers(prev => prev.map(u => u.id === user.id ? {...u, is_active: !u.is_active} : u));
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Superadmin</h1>
      {users.map(user => (
        <div key={user.id}>
          {user.email}
          <button onClick={() => toggleUserActive(user)}>Toggle</button>
          <button onClick={() => handleDeleteUser(user.id)}>Delete</button>
        </div>
      ))}
    </div>
  );
}
