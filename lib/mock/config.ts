// Never enable passwordless demo accounts or mock writes in a production build.
export const MOCK_ENABLED = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true';
export const MOCK_ACCOUNTS = ['admin', 'admin_support', 'teacher', 'assistant', 'student', 'pending'] as const;
export const mockEmail = (account: string) => `${account}@mock.local`;