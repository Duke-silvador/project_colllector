import pathlib
f = pathlib.Path(r'frontend/src/components/TopNav.tsx')
src = f.read_text(encoding='utf-8')
src = src.replace(
    'canPost={canPostAnnouncements}\n            onReloadAnnouncements={announcements.reload}\n            onSeenAnnouncements={announcements.markSeen}',
    'canPost={canPostAnnouncements}\n            onReloadAnnouncements={announcements.reload}\n            onSeenAnnouncements={announcements.markSeen}\n            isAdmin={isAdmin}\n            unreadFeedback={feedback.unreadCount}\n            onReloadFeedback={feedback.reload}'
)
f.write_text(src, encoding='utf-8')
print('Done')
