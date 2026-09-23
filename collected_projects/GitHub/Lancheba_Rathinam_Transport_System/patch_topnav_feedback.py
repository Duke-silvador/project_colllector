import pathlib, re

f = pathlib.Path(r'frontend/src/components/TopNav.tsx')
src = f.read_text(encoding='utf-8')

# 1. Add useFeedback import after useAnnouncements import
src = src.replace(
    'import { useAnnouncements } from "../hooks/useAnnouncements";',
    'import { useAnnouncements } from "../hooks/useAnnouncements";\nimport { useFeedback } from "../hooks/useFeedback";'
)

# 2. Destructure isAdmin from useAuth
src = src.replace(
    'const { isLoggedIn, username, logout, canManageBuses: canPostAnnouncements } = useAuth();',
    'const { isLoggedIn, username, logout, role, canManageBuses: canPostAnnouncements } = useAuth();\n  const isAdmin = role === "ADMIN";'
)

# 3. Add useFeedback call after useAnnouncements
src = src.replace(
    'const announcements = useAnnouncements();',
    'const announcements = useAnnouncements();\n  const feedback = useFeedback();'
)

# 4. Make the red dot react to both unread sources
src = src.replace(
    '{announcements.unread > 0 && (',
    '{(announcements.unread > 0 || (isAdmin && feedback.unreadCount > 0)) && ('
)

f.write_text(src, encoding='utf-8')
print('Done')
