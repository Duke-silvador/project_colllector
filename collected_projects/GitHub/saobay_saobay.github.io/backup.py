import os
import shutil
from pathlib import Path

def run_backup():
    # Lấy đường dẫn thư mục hiện tại
    current_dir = Path.cwd()
    backup_dir = current_dir / "backup"
    
    # Tạo thư mục backup nếu chưa tồn tại
    backup_dir.mkdir(exist_ok=True)
    
    # Các mục cần bỏ qua không sao chép
    ignored_names = {"backup", "backup.py", "restore.py"}

    print("--- BẮT ĐẦU BACKUP ---")
    
    for item in current_dir.iterdir():
        # Bỏ qua các mục trong danh sách chỉ định HOẶC bắt đầu bằng dấu "." (file/thư mục ẩn)
        if item.name in ignored_names or item.name.startswith("."):
            continue
            
        destination = backup_dir / item.name
        
        try:
            if item.is_dir():
                # Nếu đích đến đã tồn tại từ trước, xóa đi để đè bản mới
                if destination.exists():
                    shutil.rmtree(destination)
                shutil.copytree(item, destination)
                print(f"[Thư mục] Đã backup: {item.name}")
            else:
                shutil.copy2(item, destination)
                print(f"[File]     Đã backup: {item.name}")
        except Exception as e:
            print(f"[Lỗi] Không thể backup {item.name}: {e}")

    print("--- HOÀN THÀNH BACKUP ---")

if __name__ == "__main__":
    run_backup()