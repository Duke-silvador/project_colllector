import pathlib, re

# Fix 1: useFeedback.ts — wrong import path + user shape + res type
f1 = pathlib.Path(r'frontend/src/hooks/useFeedback.ts')
src = f1.read_text(encoding='utf-8')
src = src.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';")
src = src.replace("import api from '../api/axiosInstance';", "import api from '../api/client';")
src = src.replace("const { user } = useAuth();", "const { role } = useAuth();")
src = src.replace("const isAdmin = (user as any)?.role === 'ADMIN';", "const isAdmin = role === 'ADMIN';")
src = src.replace(".then((res) => {", ".then((res: any) => {")
f1.write_text(src, encoding='utf-8')
print('useFeedback fixed')

# Fix 2: ComplaintsTab.tsx — wrong import path + res type
f2 = pathlib.Path(r'frontend/src/components/ComplaintsTab.tsx')
src = f2.read_text(encoding='utf-8')
src = src.replace("import api from '../api/axiosInstance';", "import api from '../api/client';")
src = src.replace(".then((res) => {", ".then((res: any) => {")
f2.write_text(src, encoding='utf-8')
print('ComplaintsTab fixed')

# Fix 3: NotificationPanel.tsx — remove unused MessageSquare import
f3 = pathlib.Path(r'frontend/src/components/NotificationPanel.tsx')
src = f3.read_text(encoding='utf-8')
src = src.replace("  Bell,\n  MessageSquare,\n", "  Bell,\n")
f3.write_text(src, encoding='utf-8')
print('NotificationPanel fixed')
