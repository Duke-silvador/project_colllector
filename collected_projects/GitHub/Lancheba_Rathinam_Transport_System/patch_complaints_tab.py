import pathlib

# --- ComplaintsTab component (new file) ---
tab_content = """import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';

interface FeedbackItem {
  id: number;
  kind: string;
  category: string;
  subject: string;
  created_at: string;
  author_role: string;
  is_anonymous: boolean;
}

export const ComplaintsTab: React.FC<{ unreadCount: number }> = ({ unreadCount }) => {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get('/api/feedback/?status=NEW')
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
        setItems(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [unreadCount]);

  if (loading) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
      Loading complaints\u2026
    </div>
  );
  if (items.length === 0) return (
    <div style={{ color: 'var(--text-dim)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
      No new complaints.
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {items.map((item) => (
        <div key={item.id} style={{
          padding: '10px 10px', borderRadius: 10,
          background: 'rgb(var(--ov) / 0.03)',
          border: '1px solid rgb(var(--ov) / 0.08)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-soft)' }}>
            {item.subject}
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 3 }}>
            {item.kind} \u00b7 {item.category}
            {!item.is_anonymous && item.author_role ? ` \u00b7 ${item.author_role}` : ' \u00b7 Anonymous'}
          </div>
        </div>
      ))}
    </div>
  );
};
"""

pathlib.Path(r'frontend/src/components/ComplaintsTab.tsx').write_text(tab_content.strip(), encoding='utf-8')
print('ComplaintsTab written')
