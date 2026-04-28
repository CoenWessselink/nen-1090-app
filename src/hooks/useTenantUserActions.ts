type Mutation<TInput = unknown, TOutput = unknown> = {
  mutateAsync: (input?: TInput) => Promise<TOutput>;
  isPending: boolean;
};

function okMutation<TInput = unknown, TOutput = unknown>(): Mutation<TInput, TOutput> {
  return {
    mutateAsync: async () => ({ success: true } as TOutput),
    isPending: false,
  };
}

export function useTenantUserActions(_tenantId?: string) {
  return {
    createUser: okMutation(),
    updateUser: okMutation(),
    deleteUser: okMutation(),
    forceLogout: okMutation(),
    resendInvite: okMutation(),
    refresh: async () => ({ success: true }),
    loading: false,
    error: null,
  };
}

export default useTenantUserActions;
