import pathlib
f = pathlib.Path(r'frontend/src/components/NotificationPanel.tsx')
src = f.read_text(encoding='utf-8')
src = src.replace(
    'import { AnnouncementsTab } from "./AnnouncementsTab";',
    'import { AnnouncementsTab } from "./AnnouncementsTab";\nimport { ComplaintsTab } from "./ComplaintsTab";'
)
f.write_text(src, encoding='utf-8')
print('Done')
