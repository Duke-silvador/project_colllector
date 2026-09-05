# -*- coding: utf-8 -*-

# Form implementation generated from reading ui file 'login_data.ui'
#
# Created by: PyQt5 UI code generator 5.13.0
#
# WARNING! All changes made in this file will be lost!


from PyQt5 import QtCore, QtGui, QtWidgets
from PyQt5.QtWidgets import QApplication


class Ui_Dialog(object):
    def setupUi(self, Dialog):
        # 获取屏幕分辨率并设置窗口大小
        screen = QApplication.desktop().screenGeometry()
        size = screen.size()
        w = size.width()
        h = size.height()

        Dialog.setObjectName("Dialog")
        #Dialog.resize(601, 409)
        Dialog.resize(w,h)
        icon = QtGui.QIcon()
        icon.addPixmap(QtGui.QPixmap(":/icons/ui_imgs/icons/目标检测.jpeg"), QtGui.QIcon.Normal, QtGui.QIcon.Off)
        Dialog.setWindowIcon(icon)
        Dialog.setAutoFillBackground(False)
        Dialog.setStyleSheet("border-color: qlineargradient(spread:pad, x1:0, y1:0, x2:1, y2:0, stop:0 rgba(0, 0, 0, 255), stop:1 rgba(255, 255, 255, 255));")

        #self.horizontalLayout_1 = QtWidgets.QHBoxLayout(Dialog)
        #self.horizontalLayout_1.setContentsMargins(0, 0, 0, 0)
        #self.horizontalLayout_1.setObjectName("horizontalLayout_1")
        self.p_login = QtWidgets.QLabel(Dialog)
        #self.p_login.setGeometry(QtCore.QRect(240, 90, 121, 41))
        self.p_login.setGeometry(QtCore.QRect(w/2-20, h/2-150, 121, 41))
        self.p_login.setStyleSheet("color: rgb(255, 255, 255);\n"
"font: 24pt \"楷体\";")
        self.p_login.setObjectName("p_login")
        #self.horizontalLayout_1.addWidget(self.p_login)

        self.user_name = QtWidgets.QLineEdit(Dialog)
        #self.user_name.setGeometry(QtCore.QRect(200, 150, 211, 31))
        self.user_name.setGeometry(QtCore.QRect(w/2-60, h/2-90, 211, 31))
        self.user_name.setStyleSheet("background-color: rgb(255, 255, 255);\n"
"")
        self.user_name.setObjectName("user_name")
        #self.horizontalLayout_1.addWidget(self.user_name)

        self.user_passwd = QtWidgets.QLineEdit(Dialog)
        #self.user_passwd.setGeometry(QtCore.QRect(200, 210, 211, 31))
        self.user_passwd.setGeometry(QtCore.QRect(w/2-60, h/2-30, 211, 31))
        self.user_passwd.setStyleSheet("background-color: rgb(255, 255, 255);")
        self.user_passwd.setText("")
        self.user_passwd.setEchoMode(QtWidgets.QLineEdit.Password)
        self.user_passwd.setObjectName("user_passwd")
        #self.horizontalLayout_1.addWidget(self.user_passwd)

        self.passwd = QtWidgets.QLabel(Dialog)
        #self.passwd.setGeometry(QtCore.QRect(120, 210, 51, 31))
        self.passwd.setGeometry(QtCore.QRect(w/2-140, h/2-30, 51, 31))
        self.passwd.setStyleSheet("font: 14pt \"楷体\";\n"
"color: rgb(255, 255, 255);")
        self.passwd.setObjectName("passwd")
        #self.horizontalLayout_1.addWidget(self.passwd)

        self.reme_passwd = QtWidgets.QCheckBox(Dialog)
        #self.reme_passwd.setGeometry(QtCore.QRect(200, 270, 91, 21))
        self.reme_passwd.setGeometry(QtCore.QRect(w/2-60, h/2+30, 91, 21))
        self.reme_passwd.setStyleSheet("font: 10pt \"楷体\";\n"
"color: rgb(255, 255, 255);")
        self.reme_passwd.setObjectName("reme_passwd")
        self.auto_login = QtWidgets.QCheckBox(Dialog)
        #self.auto_login.setGeometry(QtCore.QRect(320, 270, 91, 21))
        self.auto_login.setGeometry(QtCore.QRect(w/2+60, h/2+30, 91, 21))
        self.auto_login.setStyleSheet("font: 10pt \"楷体\";\n"
"color: rgb(255, 255, 255);")
        self.auto_login.setObjectName("auto_login")
        self.login = QtWidgets.QPushButton(Dialog)
        #self.login.setGeometry(QtCore.QRect(260, 310, 91, 31))
        self.login.setGeometry(QtCore.QRect(w/2, h/2+70, 91, 31))
        self.login.setStyleSheet("font: 16pt \"楷体\";\n"
"background-color: rgb(255, 255, 255);\n"
"")
        self.login.setObjectName("login")
        self.label = QtWidgets.QLabel(Dialog)
        #self.label.setGeometry(QtCore.QRect(110, 150, 71, 31))
        self.label.setGeometry(QtCore.QRect(w/2-150, h/2-90, 71, 31))
        self.label.setStyleSheet("font: 14pt \"楷体\";\n"
"color: rgb(255, 255, 255);")
        self.label.setObjectName("label")

        self.retranslateUi(Dialog)
        QtCore.QMetaObject.connectSlotsByName(Dialog)

    def retranslateUi(self, Dialog):
        _translate = QtCore.QCoreApplication.translate
        Dialog.setWindowTitle(_translate("Dialog", "Dialog"))
        self.p_login.setText(_translate("Dialog", "请登录"))
        self.passwd.setText(_translate("Dialog", "密码"))
        self.reme_passwd.setText(_translate("Dialog", "记住密码"))
        self.auto_login.setText(_translate("Dialog", "自动登录"))
        self.login.setText(_translate("Dialog", "登录"))
        self.label.setText(_translate("Dialog", "用户名"))
#import apprcc_rc
