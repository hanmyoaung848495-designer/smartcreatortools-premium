export const getUserTierName = (user: { role?: string; start_date?: any; expired_date?: any; is_lifetime?: boolean; startDate?: any; expiredDate?: any; isLifetime?: boolean; }) => {
  const role = user?.role || 'user';
  if (role === 'admin') return 'Admin';
  if (role === 'free') return 'Free';

  const isLifetime = user?.is_lifetime ?? user?.isLifetime ?? false;
  if (isLifetime) return 'Ultra';

  const rawStart = user?.start_date ?? user?.startDate;
  const rawExpired = user?.expired_date ?? user?.expiredDate;

  const parseMs = (val: any) => {
    if (!val) return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      if (!isNaN(Number(val))) return Number(val);
      return new Date(val).getTime();
    }
    return null;
  };

  const start = parseMs(rawStart);
  const expired = parseMs(rawExpired);

  if (start !== null && expired !== null && !isNaN(start) && !isNaN(expired)) {
    const durationMs = expired - start;
    const days = durationMs / (1000 * 60 * 60 * 24);

    if (days >= 365) return 'Ultra';
    if (days > 40) return 'Premium';
    return 'Pro';
  }

  return 'Premium';
};
