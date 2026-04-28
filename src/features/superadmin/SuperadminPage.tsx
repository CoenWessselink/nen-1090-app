// PATCHED HANDLERS

const handleDeleteUser = async (userId: string) => {
  if (!confirm("Gebruiker verwijderen?")) return;

  try {
    await tenantUserActions.deleteUser.mutateAsync(userId);
    refreshMessage("Gebruiker verwijderd.");
  } catch (e) {
    refreshMessage(e instanceof Error ? e.message : "Verwijderen mislukt");
  }
};

const handleUpdateUser = async () => {
  if (!editingUser) return;

  try {
    await tenantUserActions.updateUser.mutateAsync({
      userId: editingUser.id,
      data: tenantUserEditForm,
    });

    setEditingUser(null);
    refreshMessage("Gebruiker bijgewerkt.");
  } catch (e) {
    refreshMessage(e instanceof Error ? e.message : "Update mislukt");
  }
};

const toggleUserActive = async (user: any) => {
  try {
    await tenantUserActions.updateUser.mutateAsync({
      userId: user.id,
      data: { is_active: !user.is_active },
    });

    refreshMessage("Status aangepast.");
  } catch (e) {
    refreshMessage(e instanceof Error ? e.message : "Toggle mislukt");
  }
};
