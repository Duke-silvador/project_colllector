# -*- coding: utf-8 -*-

import sys

from PyQt5.QtWidgets import QMessageBox,QDialog
from login_data import *
from PyQt5.QtGui import QPalette , QBrush , QPixmap
from PyQt5.QtCore import QSettings, QTimer
from main import *

class loginWidget(QDialog, Ui_Dialog):
    def __init__(self, parent=None):    
        super(loginWidget, self).__init__(parent) #super调用父类的构造函数，避免构造函数被调用多次，即使继承的多重父类有相同的构造函数
        self.setupUi(self)
        self.initUI()
    def initUI(self):
        # 获取屏幕分辨率并设置窗口大小
        screen = QApplication.desktop().screenGeometry()
        size = screen.size()

        palette	= QPalette()
        #palette.setBrush(QPalette.Background,QBrush(QPixmap("./images/login.jpg")))   
        palette.setBrush(QPalette.Background,QBrush(QPixmap(":/icons/ui_imgs/icons/login.png")))
        self.setPalette(palette)
        self.login.clicked.connect(self.login_database)
        self.auto_login.clicked.connect(self.login_auto)
        self.reme_passwd.clicked.connect(self.login_rem)
        self.user_name.textChanged.connect(self.login_user)
        self.user_passwd.textChanged.connect(self.login_passwd)
        self.setting= QSettings("./config.ini",QSettings.IniFormat)#setting生成本地的配置文件
        self.auto=self.setting.value("Login/auto_")=="true"
        self.remem=self.setting.value("Login/remem_")=="true"
        self.auto_login.setChecked(self.auto)
        self.reme_passwd.setChecked(self.remem)
        self.timer = QTimer(self) #初始化一个定时器
        self.timer.timeout.connect(self.operate) #计时结束调用operate()方法
        self.flag=1 #防止一直调用定时器的槽函数

        print("gyf:size.width()={}, size.height()={}".format(size.width(), size.height()))
        self.setGeometry(0, 0, size.width(), size.height())
        
        if(self.remem):
            username_i=self.setting.value("Login_new/user")
            self.user_name.setText(username_i)
            passwd_i=self.setting.value("Login_newp/password")
            self.user_passwd.setText(passwd_i)
        else:
            username_i=self.setting.value("Login_new/user")
            self.user_name.setText(username_i)
            self.user_passwd.clear()
        if(self.auto):
            self.timer.start(2000) #设置计时间隔并启动
    

    def operate(self):
        if(self.flag==1):
            self.login_database()
            self.flag=0
    
    def login_database(self):
        if((self.user_name.text()==("admin"))&(self.user_passwd.text()==("admin"))):
            # self.hide()
            # self.hello=helloWidget()
            # self.hello.show()
            self.accept()
        else:
            QMessageBox.warning(self,("提示"),("用户名或密码错误！！"),QMessageBox.Yes)
    
    def login_auto(self):
        if(self.auto_login.isChecked()):
            self.auto_="true"
        else:
            self.auto_="false"
        self.setting.beginGroup("Login") #group对应不同的组中键值
        self.setting.setValue("auto_",self.auto_)
        self.setting.endGroup()
    
    def login_rem(self):
        if(self.reme_passwd.isChecked()):
            self.remember="true"
        else:
            self.remember="false"
            self.user_passwd.clear()
        self.setting.beginGroup("Login") #group对应不同的组中键值
        self.setting.setValue("remem_",self.remember)
        self.setting.endGroup()
    
    def login_user(self):
        self.username=self.user_name.text()
        self.setting.beginGroup("Login_new")
        self.setting.setValue("user",self.username)
        self.setting.endGroup()
    
    def login_passwd(self):
        self.passwd_=self.user_passwd.text()
        self.setting.beginGroup("Login_newp")
        self.setting.setValue("password",self.passwd_)
        self.setting.endGroup()
        

        
if __name__=="__main__": 
    app = QApplication(sys.argv)  
    myWin = loginWidget()
    myWin.setWindowTitle("热片缺陷检测系统")
    myWin.show()
    if(myWin.exec_()==QDialog.Accepted):
        the_window = myMainWindow()
        the_window.show()
        sys.exit(app.exec_())
    
