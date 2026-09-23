import pathlib

f = pathlib.Path(r'frontend/src/components/NotificationPanel.tsx')
src = f.read_text(encoding='utf-8')

# 1. Add MessageSquare to lucide imports
src = src.replace(
    'import {\n  Bell,',
    'import {\n  Bell,\n  MessageSquare,'
)

# 2. Extend Tab type to include complaints
src = src.replace(
    'type Tab = "announcements" | "activity";',
    'type Tab = "announcements" | "activity" | "complaints";'
)

# 3. Add unreadFeedback + isAdmin + onReloadFeedback to props interface
src = src.replace(
    '  /** Re-fetch announcements (after posting, deleting or pressing refresh) */\n  onReloadAnnouncements: () => void;',
    '  /** Re-fetch announcements (after posting, deleting or pressing refresh) */\n  onReloadAnnouncements: () => void;\n  /** Number of NEW feedback/complaint items (admins only) */\n  unreadFeedback?: number;\n  /** True when the viewer is an admin (shows Complaints tab) */\n  isAdmin?: boolean;\n  /** Re-fetch feedback count */\n  onReloadFeedback?: () => void;'
)

# 4. Destructure new props
src = src.replace(
    '  onSeenAnnouncements,\n}) => {',
    '  onSeenAnnouncements,\n  unreadFeedback = 0,\n  isAdmin = false,\n  onReloadFeedback,\n}) => {'
)

# 5. Wire onReloadFeedback into the refresh function
src = src.replace(
    '  const refresh = () => {\n    onReloadAnnouncements();\n    if (tab === "activity") fetchEvents();\n  };',
    '  const refresh = () => {\n    onReloadAnnouncements();\n    if (tab === "activity") fetchEvents();\n    onReloadFeedback?.();\n  };'
)

# 6. Add Complaints tab button after activity tab entry
src = src.replace(
    '              [\"activity\", \"Activity\", 0],\n            ] as const',
    '              ["activity", "Activity", 0],\n              ...(isAdmin ? [["complaints", "Complaints", unreadFeedback] as const] : []),\n            ] as const'
)

# 7. Add complaints panel in the tab content section
src = src.replace(
    '          {tab === "announcements" ? (',
    '          {tab === "complaints" ? (\n            <ComplaintsTab unreadCount={unreadFeedback} />\n          ) : tab === "announcements" ? ('
)

f.write_text(src, encoding='utf-8')
print('Done')
