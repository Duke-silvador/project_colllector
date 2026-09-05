# -*- coding: utf-8 -*-
"""
主程序入口文件
负责应用程序的启动和主要流程控制
"""
import sys
from PyQt5.QtWidgets import QApplication

from gui.main_window import MainWindow
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[logging.FileHandler("app.log"), logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger(__name__)


class Application:
    """应用程序主控制类"""

    def __init__(self):
        self.app = None
        self.main_window = None

    def initialize_app(self):
        """初始化应用程序"""
        try:
            self.app = QApplication(sys.argv)
            self.app.setApplicationName("传感器数据采集与检测系统")
            self.app.setApplicationVersion("1.0.0")

            # 设置应用程序样式
            self._setup_app_style()

            logger.info("应用程序初始化成功")
            return True

        except Exception as e:
            logger.error(f"应用程序初始化失败: {e}")
            return False

    def _setup_app_style(self):
        """设置应用程序样式"""
        # 可以在这里设置全局样式表
        pass

    def create_main_window(self):
        """创建主窗口"""
        try:
            self.main_window = MainWindow()
            self.main_window.show()
            logger.info("主窗口创建成功")
            return True

        except Exception as e:
            logger.error(f"主窗口创建失败: {e}")
            return False

    def run(self):
        """运行应用程序"""
        if not self.initialize_app():
            return 1

        if not self.create_main_window():
            return 1

        try:
            logger.info("应用程序启动成功")
            return self.app.exec_()

        except Exception as e:
            logger.error(f"应用程序运行异常: {e}")
            return 1

    def cleanup(self):
        """清理资源"""
        if self.main_window:
            try:
                self.main_window.cleanup_all_resources()
            except Exception as e:
                logger.error(f"清理主窗口资源时出错: {e}")

        logger.info("应用程序清理完成")


def main():
    """主程序入口"""
    app = Application()

    try:
        exit_code = app.run()
        return exit_code

    except KeyboardInterrupt:
        logger.info("用户中断程序")
        return 0

    except Exception as e:
        logger.error(f"程序异常退出: {e}")
        return 1

    finally:
        app.cleanup()


if __name__ == "__main__":
    sys.exit(main())
