import pathlib

content = """import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosInstance';

const POLL_MS = 30_000;

export function useFeedback() {
  const { user } = useAuth();
  const isAdmin = (user as any)?.role === 'ADMIN';
  const [unreadCount, setUnreadCount] = useState(0);

  const reload = useCallback(() => {
    if (!isAdmin) return;
    api
      .get('/api/feedback/?status=NEW')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        setUnreadCount(data.length);
      })
      .catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    reload();
    const id = setInterval(() => {
      if (!document.hidden) reload();
    }, POLL_MS);
    return () => clearInterval(id);
  }, [reload]);

  return { unreadCount, reload };
}
"""

pathlib.Path(r'frontend/src/hooks/useFeedback.ts').write_text(content.strip(), encoding='utf-8')
print('Done')
