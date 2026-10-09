import shutil
from pathlib import Path

def run_restore():
    current_dir = Path.cwd()
    backup_dir = current_dir / "backup"

    if not backup_dir.exists() or not backup_dir.is_dir():
        print("[X] Lỗi: Thư mục 'backup' không tồn tại!")
        return

    print("--- BẮT ĐẦU KHÔI PHỦC (RESTORE) ---")

    for item in backup_dir.iterdir():
        destination = current_dir / item.name

        try:
            if item.is_dir():
                if destination.exists():
                    shutil.rmtree(destination)
                shutil.copytree(item, destination)
                print(f"[Thư mục] Đã khôi phục: {item.name}")
            else:
                shutil.copy2(item, destination)
                print(f"[File]    Đã khôi phục: {item.name}")
        except Exception as e:
            print(f"[Lỗi] Không thể khôi phục {item.name}: {e}")

    print("--- HOÀN THÀNH KHÔI PHỦC ---")

if __name__ == "__main__":
    run_restore()