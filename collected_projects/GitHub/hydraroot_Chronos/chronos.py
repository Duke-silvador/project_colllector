# Chronos — floating multi-timer for Windows
# Copyright 2026 WDS657
# SPDX-License-Identifier: Apache-2.0
# Project direction, product design, requirements, validation and maintenance: WDS657.
# Implementation developed with AI-assisted coding.

from __future__ import annotations

import json
import math
import ctypes
import os
import queue
import struct
import sys
import threading
import time
import uuid
import wave
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import messagebox

try:
    import winsound
except ImportError:  # Allows source-level checks on non-Windows systems.
    winsound = None

try:
    from PIL import Image, ImageTk
except ImportError:
    Image = ImageTk = None

APP_NAME = "Chronos"
VERSION = "1.0"
INSTANCE_MUTEX = r"Local\Chronos_WDS657_SingleInstance"
INSTANCE_EVENT = r"Local\Chronos_WDS657_Activate"

# Reference-image palette: midnight navy, electric cyan, luminous green and warm gold.
BG = "#050A14"
PANEL = "#0B1424"
PANEL_2 = "#101F34"
PANEL_HOVER = "#142943"
BORDER = "#087EA5"
CYAN = "#21DFFF"
CYAN_BRIGHT = "#78F3FF"
GREEN = "#82FF91"
GOLD = "#FFC65C"
PINK = "#FF55B8"
TEXT = "#F1F8FF"
MUTED = "#91A9C4"
DARK_TEXT = "#06111B"
FONT = "Segoe UI"
DIGITS = "Consolas"

# User-selectable interface language. User-created timer titles and notes are never translated.
TRANSLATIONS = {
    "en": {
        "Nuevo temporizador — Chronos": "New Timer — Chronos",
        "NUEVO TEMPORIZADOR": "NEW TIMER", "NOMBRE": "NAME", "TIEMPO": "TIME",
        "HORAS": "HOURS", "MINUTOS": "MINUTES", "SEGUNDOS": "SECONDS",
        "NOTA / DETALLE": "NOTE / DETAILS", "Alarma sonora repetitiva": "Repeating sound alarm",
        "PROBAR SONIDO": "TEST SOUND", "CANCELAR": "CANCEL", "INICIAR  ›": "START  ›",
        "Ingresá un tiempo válido.": "Enter a valid time.",
        "El tiempo debe ser mayor que cero.": "The duration must be greater than zero.",
        "Cocina": "Cooking", "Recordatorio": "Reminder",
        "TRANSPARENCIA": "TRANSPARENCY", "DETENER ALARMA  /  CONFIRMAR": "STOP ALARM  /  ACKNOWLEDGE",
        "Plegar / desplegar": "Collapse / expand", "Mostrar Chronos": "Show Chronos",
        "Detener alarma": "Stop alarm", "Ocultar reloj": "Hide timer",
        "Eliminar temporizador…": "Delete timer…",
        "TU ALIADO PARA NO OLVIDAR NADA…": "YOUR ALLY IN REMEMBERING EVERYTHING…",
        "ACCIONES RÁPIDAS": "QUICK ACTIONS", "Nuevo temporizador…": "New timer…",
        "Opciones…": "Settings…", "Mostrar todos los relojes": "Show all timers",
        "Ocultar todos los relojes": "Hide all timers", "Acerca de…": "About…",
        "Salir": "Exit", "TEMPORIZADORES": "TIMERS", "HISTORIAL": "HISTORY",
        "TEMPORIZADORES ACTIVOS": "ACTIVE TIMERS", "Doble clic en la barra de un reloj para plegar o desplegar.": "Double-click a timer's title bar to collapse or expand it.",
        "HISTORIAL DE CREACIÓN": "CREATION HISTORY", "Fecha y hora local de creación": "Local creation date and time",
        "BORRAR TODO": "CLEAR ALL", "Todavía no hay temporizadores.\nCreá uno con Ctrl+N.": "There are no timers yet.\nCreate one with Ctrl+N.",
        "Todavía no hay registros.\nLos temporizadores nuevos aparecerán aquí.": "There are no history entries yet.\nNew timers will appear here.",
        "ABRIR": "OPEN", "En curso": "Running", "En pausa": "Paused", "Finalizado": "Finished",
        "Eliminado": "Deleted", "Creado": "Created", "Fecha no registrada": "Date not recorded",
        "Fecha no disponible": "Date unavailable", "¡TIEMPO CUMPLIDO!": "TIME IS UP!",
        "REANUDAR": "RESUME", "PAUSAR": "PAUSE", "REINICIAR": "RESET",
        "EN PAUSA": "PAUSED", "EN MARCHA": "RUNNING", "EN MARCHA · SIEMPRE VISIBLE": "RUNNING · ALWAYS ON TOP",
        "Acerca de Chronos": "About Chronos", "Ocultar todos los relojes": "Hide all timers",
        "Abrir Chronos": "Open Chronos", "Acerca de Chronos": "About Chronos",
        "WDS657  ·  CONTROL": "WDS657  ·  CONTROL",
        "¿Eliminar todos los registros del historial?\n\nEsta acción no elimina los temporizadores activos.": "Delete all history entries?\n\nThis does not delete active timers.",
        "¿Eliminar el historial '{title}'?": "Delete '{title}' from history?",
        "¿Eliminar el temporizador '{title}'?": "Delete timer '{title}'?",
        "Opciones — Chronos": "Settings — Chronos", "OPCIONES": "SETTINGS",
        "La alarma se repite hasta que la confirmes.": "The alarm repeats until you acknowledge it.",
        "El control de transparencia se ajusta individualmente en cada reloj.": "Transparency is adjusted individually for each timer.",
        "CERRAR": "CLOSE", "IDIOMA": "LANGUAGE",
        "ESPAÑOL": "SPANISH", "INGLÉS": "ENGLISH", "APLICAR IDIOMA": "APPLY LANGUAGE",
        "Idioma guardado. La interfaz se actualizará.": "Language saved. The interface will update.",
        "Temporizadores flotantes y recordatorios para Windows.": "Floating timers and reminders for Windows.",
        "Interfaz neón · Relojes redimensionables · Alarmas sonoras": "Neon interface · Resizable timers · Sound alarms",
        "Los temporizadores se guardan localmente.": "Timers are stored locally.",
        "¿Salir completamente de Chronos?\n\nLos temporizadores no podrán sonar mientras la aplicación esté cerrada.\nLos datos quedan guardados y se recuperan al volver a abrirla.": "Exit Chronos completely?\n\nTimers cannot sound while the application is closed.\nYour data is saved and will be restored the next time you open it.",
        "No voy a ocultar la ventana porque Windows todavía no confirmó que el icono de bandeja esté activo.\n\nDetalle: {error}\n\nLa ventana queda abierta para que no tengas que finalizar el proceso.": "The window will remain open because Windows has not confirmed that the tray icon is active.\n\nDetails: {error}\n\nThe window will stay open so you do not need to terminate the process.",
        "No se pudo activar el icono de bandeja.\n\n{error}": "The tray icon could not be activated.\n\n{error}",
        "El icono de Chronos todavía no confirmó su inicio.": "The Chronos tray icon has not confirmed startup yet.",
        "No se pudieron guardar los temporizadores:\n{error}": "Could not save timers:\n{error}",
        "No se pudieron recuperar los temporizadores guardados:\n{error}": "Could not restore saved timers:\n{error}",
        "No se pudo reproducir el sonido de prueba:\n{error}": "Could not play the test sound:\n{error}",
        "No se pudo guardar el historial:\n{error}": "Could not save history:\n{error}",
        "No se pudo cargar el historial:\n{error}": "Could not load history:\n{error}",
        "Ocurrió un error en Chronos:\n{error}": "An error occurred in Chronos:\n{error}",
        "No se pudo activar el icono de bandeja.\n\n{error}": "The tray icon could not be activated.\n\n{error}",
        "¿Eliminar del historial '{title}'?": "Delete '{title}' from history?",
        "¿Eliminar todos los registros del historial?": "Delete all history entries?",
        "¿Eliminar el temporizador '{title}'?": "Delete timer '{title}'?",
    }
}


def log_runtime(message: str) -> None:
    """Write diagnostics to the user's Chronos data folder without showing a console."""
    try:
        log_path = app_data_dir() / "chronos.log"
        stamp = time.strftime("%Y-%m-%d %H:%M:%S")
        with log_path.open("a", encoding="utf-8") as stream:
            stream.write(f"[{stamp}] {message}\n")
    except Exception:
        pass


def apply_no_taskbar_button(tk_window, owner_window=None) -> bool:
    """Make a floating timer an owned Win32 tool window, not a taskbar app.

    WS_EX_TOOLWINDOW alone was not sufficient on some Windows 11 builds.
    The owner link points to a separate invisible native HWND, never to the
    dashboard, so the timer stays off the taskbar without following dashboard
    minimize/withdraw operations. Keep the window interactive and topmost.
    """
    if os.name != "nt":
        return False
    try:
        user32 = ctypes.WinDLL("user32", use_last_error=True)
        user32.GetAncestor.argtypes = [ctypes.c_void_p, ctypes.c_uint]
        user32.GetAncestor.restype = ctypes.c_void_p
        user32.GetWindow.argtypes = [ctypes.c_void_p, ctypes.c_uint]
        user32.GetWindow.restype = ctypes.c_void_p

        raw_hwnd = int(tk_window.winfo_id())
        hwnd_value = int(user32.GetAncestor(ctypes.c_void_p(raw_hwnd), 2) or raw_hwnd)  # GA_ROOT
        hwnd = ctypes.c_void_p(hwnd_value)

        owner_value = 0
        if owner_window is not None:
            if isinstance(owner_window, int):
                owner_value = int(owner_window)
            else:
                raw_owner = int(owner_window.winfo_id())
                owner_value = int(user32.GetAncestor(ctypes.c_void_p(raw_owner), 2) or raw_owner)
            if owner_value == hwnd_value:
                raise RuntimeError("La ventana flotante y su propietario devolvieron el mismo HWND.")

        get_long = getattr(user32, "GetWindowLongPtrW", None)
        set_long = getattr(user32, "SetWindowLongPtrW", None)
        if get_long is None:  # 32-bit Windows fallback
            get_long = user32.GetWindowLongW
            set_long = user32.SetWindowLongW
        get_long.argtypes = [ctypes.c_void_p, ctypes.c_int]
        get_long.restype = ctypes.c_ssize_t
        set_long.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_ssize_t]
        set_long.restype = ctypes.c_ssize_t

        GWL_EXSTYLE = -20
        GWLP_HWNDPARENT = -8  # Owner for a top-level window (not a child parent).
        GW_OWNER = 4
        WS_EX_TOOLWINDOW = 0x00000080
        WS_EX_APPWINDOW = 0x00040000
        SWP_NOSIZE = 0x0001
        SWP_NOMOVE = 0x0002
        SWP_NOZORDER = 0x0004
        SWP_NOACTIVATE = 0x0010
        SWP_FRAMECHANGED = 0x0020

        # Establish the real Win32 owner relationship to the separate hidden
        # timer host. This is intentionally not the visible dashboard HWND.
        if owner_value:
            ctypes.set_last_error(0)
            set_long(hwnd, GWLP_HWNDPARENT, owner_value)
            owner_error = ctypes.get_last_error()
            if owner_error:
                log_runtime(f"No se pudo establecer GWLP_HWNDPARENT: {owner_error}")
                return False

        ctypes.set_last_error(0)
        old_style = int(get_long(hwnd, GWL_EXSTYLE))
        style_error = ctypes.get_last_error()
        if style_error:
            log_runtime(f"No se pudo leer GWL_EXSTYLE: {style_error}")
            return False
        new_style = (old_style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
        ctypes.set_last_error(0)
        set_long(hwnd, GWL_EXSTYLE, new_style)
        set_error = ctypes.get_last_error()
        if set_error:
            log_runtime(f"SetWindowLongPtrW no pudo actualizar WS_EX_TOOLWINDOW: {set_error}")
            return False

        user32.SetWindowPos.argtypes = [
            ctypes.c_void_p, ctypes.c_void_p, ctypes.c_int, ctypes.c_int,
            ctypes.c_int, ctypes.c_int, ctypes.c_uint32,
        ]
        user32.SetWindowPos.restype = ctypes.c_int
        flags = SWP_NOSIZE | SWP_NOMOVE | SWP_NOZORDER | SWP_NOACTIVATE | SWP_FRAMECHANGED
        if not user32.SetWindowPos(hwnd, None, 0, 0, 0, 0, flags):
            error = ctypes.get_last_error()
            log_runtime(f"SetWindowPos no pudo aplicar el estilo de ventana de herramienta: {error}")
            return False

        check_style = int(get_long(hwnd, GWL_EXSTYLE))
        actual_owner = int(user32.GetWindow(hwnd, GW_OWNER) or 0)
        style_ok = bool(check_style & WS_EX_TOOLWINDOW) and not bool(check_style & WS_EX_APPWINDOW)
        owner_ok = (not owner_value) or actual_owner == owner_value
        ok = style_ok and owner_ok
        log_runtime(
            f"Ventana flotante HWND=0x{hwnd_value:X}: "
            f"owner=0x{actual_owner:X} (esperado=0x{owner_value:X}, correcto={owner_ok}), "
            f"WS_EX_TOOLWINDOW={bool(check_style & WS_EX_TOOLWINDOW)}, "
            f"WS_EX_APPWINDOW={bool(check_style & WS_EX_APPWINDOW)}; taskbar_hidden={ok}."
        )
        return ok
    except Exception as exc:
        log_runtime(f"No se pudo quitar el botón de la barra de tareas a un reloj: {exc!r}")
        return False


def create_native_timer_owner():
    """Create an invisible Win32 owner independent of the dashboard window."""
    if os.name != "nt":
        return None
    try:
        user32 = ctypes.WinDLL("user32", use_last_error=True)
        kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
        user32.CreateWindowExW.argtypes = [
            ctypes.c_uint32, ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint32,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
        ]
        user32.CreateWindowExW.restype = ctypes.c_void_p
        kernel32.GetModuleHandleW.argtypes = [ctypes.c_wchar_p]
        kernel32.GetModuleHandleW.restype = ctypes.c_void_p
        WS_EX_TOOLWINDOW = 0x00000080
        WS_EX_NOACTIVATE = 0x08000000
        WS_POPUP = 0x80000000
        hinstance = kernel32.GetModuleHandleW(None)
        ctypes.set_last_error(0)
        hwnd = user32.CreateWindowExW(
            WS_EX_TOOLWINDOW | WS_EX_NOACTIVATE, "STATIC", "Chronos_TimerOwner_WDS657",
            WS_POPUP, -32000, -32000, 1, 1, None, None, hinstance, None
        )
        if not hwnd:
            error = ctypes.get_last_error()
            raise OSError(error, f"CreateWindowExW no pudo crear el propietario invisible: {error}")
        value = int(hwnd)
        log_runtime(f"Propietario nativo independiente creado: HWND=0x{value:X}.")
        return value
    except Exception as exc:
        log_runtime(f"No se pudo crear el propietario nativo de temporizadores: {exc!r}")
        return None


def destroy_native_timer_owner(hwnd_value):
    """Destroy the invisible owner after all floating timers are closed."""
    if os.name != "nt" or not hwnd_value:
        return
    try:
        user32 = ctypes.WinDLL("user32", use_last_error=True)
        user32.DestroyWindow.argtypes = [ctypes.c_void_p]
        user32.DestroyWindow.restype = ctypes.c_int
        if user32.DestroyWindow(ctypes.c_void_p(int(hwnd_value))):
            log_runtime(f"Propietario nativo de temporizadores destruido: HWND=0x{int(hwnd_value):X}.")
        else:
            log_runtime(f"No se pudo destruir propietario nativo: {ctypes.get_last_error()}")
    except Exception as exc:
        log_runtime(f"Error al destruir propietario nativo: {exc!r}")


class SingleInstanceGuard:
    """Windows named mutex + auto-reset event for single-instance activation."""
    ERROR_ALREADY_EXISTS = 183
    EVENT_MODIFY_STATE = 0x0002
    WAIT_OBJECT_0 = 0x00000000
    WAIT_TIMEOUT = 0x00000102

    def __init__(self):
        self.kernel32 = None
        self.mutex_handle = None
        self.event_handle = None
        self.is_primary = True

    def _load_kernel(self):
        if self.kernel32 is None:
            if os.name != "nt":
                return None
            self.kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)
            self.kernel32.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_wchar_p]
            self.kernel32.CreateMutexW.restype = ctypes.c_void_p
            self.kernel32.CreateEventW.argtypes = [ctypes.c_void_p, ctypes.c_int, ctypes.c_int, ctypes.c_wchar_p]
            self.kernel32.CreateEventW.restype = ctypes.c_void_p
            self.kernel32.OpenEventW.argtypes = [ctypes.c_uint32, ctypes.c_int, ctypes.c_wchar_p]
            self.kernel32.OpenEventW.restype = ctypes.c_void_p
            self.kernel32.SetEvent.argtypes = [ctypes.c_void_p]
            self.kernel32.SetEvent.restype = ctypes.c_bool
            self.kernel32.WaitForSingleObject.argtypes = [ctypes.c_void_p, ctypes.c_uint32]
            self.kernel32.WaitForSingleObject.restype = ctypes.c_uint32
            self.kernel32.CloseHandle.argtypes = [ctypes.c_void_p]
            self.kernel32.CloseHandle.restype = ctypes.c_bool
        return self.kernel32

    def acquire(self) -> bool:
        if os.name != "nt":
            return True
        kernel = self._load_kernel()
        ctypes.set_last_error(0)
        handle = kernel.CreateMutexW(None, False, INSTANCE_MUTEX)
        error = ctypes.get_last_error()
        if not handle:
            raise OSError(error, "No se pudo crear el mutex de Chronos")
        if error == self.ERROR_ALREADY_EXISTS:
            kernel.CloseHandle(handle)
            self.is_primary = False
            return False
        self.mutex_handle = handle
        self.event_handle = kernel.CreateEventW(None, False, False, INSTANCE_EVENT)
        if not self.event_handle:
            error = ctypes.get_last_error()
            log_runtime(f"No se pudo crear el evento de activación: {error}")
        return True

    def activate_existing(self) -> bool:
        if os.name != "nt":
            return False
        kernel = self._load_kernel()
        # The primary process creates the event immediately after taking the mutex.
        for _ in range(30):
            event = kernel.OpenEventW(self.EVENT_MODIFY_STATE, False, INSTANCE_EVENT)
            if event:
                try:
                    return bool(kernel.SetEvent(event))
                finally:
                    kernel.CloseHandle(event)
            time.sleep(0.05)
        return False

    def consume_activation(self) -> bool:
        if os.name != "nt" or not self.event_handle:
            return False
        return kernel_wait(self.kernel32, self.event_handle)

    def close(self) -> None:
        if self.kernel32 is not None:
            for attr in ("event_handle", "mutex_handle"):
                handle = getattr(self, attr)
                if handle:
                    try:
                        self.kernel32.CloseHandle(handle)
                    except Exception:
                        pass
                    setattr(self, attr, None)


def kernel_wait(kernel, handle) -> bool:
    try:
        return kernel.WaitForSingleObject(handle, 0) == SingleInstanceGuard.WAIT_OBJECT_0
    except Exception:
        return False



class _TrayGUID(ctypes.Structure):
    _fields_ = [("Data1", ctypes.c_uint32), ("Data2", ctypes.c_uint16),
                ("Data3", ctypes.c_uint16), ("Data4", ctypes.c_ubyte * 8)]


class _TrayTimeoutVersion(ctypes.Union):
    _fields_ = [("uTimeout", ctypes.c_uint32), ("uVersion", ctypes.c_uint32)]


class _TrayNotifyIconDataW(ctypes.Structure):
    _anonymous_ = ("timeout_version",)
    _fields_ = [
        ("cbSize", ctypes.c_uint32), ("hWnd", ctypes.c_void_p),
        ("uID", ctypes.c_uint32), ("uFlags", ctypes.c_uint32),
        ("uCallbackMessage", ctypes.c_uint32), ("hIcon", ctypes.c_void_p),
        ("szTip", ctypes.c_wchar * 128), ("dwState", ctypes.c_uint32),
        ("dwStateMask", ctypes.c_uint32), ("szInfo", ctypes.c_wchar * 256),
        ("timeout_version", _TrayTimeoutVersion), ("szInfoTitle", ctypes.c_wchar * 64),
        ("dwInfoFlags", ctypes.c_uint32), ("guidItem", _TrayGUID),
        ("hBalloonIcon", ctypes.c_void_p),
    ]


class _TrayPoint(ctypes.Structure):
    _fields_ = [("x", ctypes.c_long), ("y", ctypes.c_long)]


class _TrayRect(ctypes.Structure):
    _fields_ = [("left", ctypes.c_long), ("top", ctypes.c_long),
                ("right", ctypes.c_long), ("bottom", ctypes.c_long)]


class _TrayNotifyIconIdentifier(ctypes.Structure):
    _fields_ = [("cbSize", ctypes.c_uint32), ("hWnd", ctypes.c_void_p),
                ("uID", ctypes.c_uint32), ("guidItem", _TrayGUID)]


class _TrayMSG(ctypes.Structure):
    _fields_ = [("hwnd", ctypes.c_void_p), ("message", ctypes.c_uint32),
                ("wParam", ctypes.c_size_t), ("lParam", ctypes.c_ssize_t),
                ("time", ctypes.c_uint32), ("pt", _TrayPoint), ("lPrivate", ctypes.c_uint32)]


class _TrayWNDCLASSW(ctypes.Structure):
    _fields_ = [("style", ctypes.c_uint32), ("lpfnWndProc", ctypes.c_void_p),
                ("cbClsExtra", ctypes.c_int), ("cbWndExtra", ctypes.c_int),
                ("hInstance", ctypes.c_void_p), ("hIcon", ctypes.c_void_p),
                ("hCursor", ctypes.c_void_p), ("hbrBackground", ctypes.c_void_p),
                ("lpszMenuName", ctypes.c_wchar_p), ("lpszClassName", ctypes.c_wchar_p)]


class NativeWindowsTray:
    """Native Windows notification-area icon using Shell_NotifyIconW.

    This deliberately avoids pystray's backend/thread integration. A hidden
    Win32 window owns the icon and its message loop on one dedicated thread.
    Right-clicks are forwarded to Tk so Chronos can draw its own neon popup;
    Tkinter is only touched through the thread-safe action callback.
    """
    NIM_ADD = 0x00000000
    NIM_MODIFY = 0x00000001
    NIM_DELETE = 0x00000002
    NIM_SETFOCUS = 0x00000003
    NIM_SETVERSION = 0x00000004
    NOTIFYICON_VERSION_4 = 4
    NIF_MESSAGE = 0x00000001
    NIF_ICON = 0x00000002
    NIF_TIP = 0x00000004
    NIF_GUID = 0x00000020
    NIF_SHOWTIP = 0x00000080

    WM_DESTROY = 0x0002
    WM_CLOSE = 0x0010
    WM_LBUTTONUP = 0x0202
    WM_LBUTTONDBLCLK = 0x0203
    WM_RBUTTONUP = 0x0205
    WM_CONTEXTMENU = 0x007B
    NIN_SELECT = 0x0400
    NIN_KEYSELECT = 0x0401
    WM_TRAY = 0x8000 + 0x51
    CS_DBLCLKS = 0x0008
    IMAGE_ICON = 1
    LR_LOADFROMFILE = 0x0010
    LR_DEFAULTSIZE = 0x0040


    NOTIFYICONDATAW = _TrayNotifyIconDataW
    POINT = _TrayPoint
    MSG = _TrayMSG
    WNDCLASSW = _TrayWNDCLASSW
    NOTIFYICONIDENTIFIER = _TrayNotifyIconIdentifier
    RECT = _TrayRect

    # Stable per-application GUID. Windows 7+ prefers GUID identity over HWND+uID.
    CHRONOS_TRAY_GUID = _TrayGUID(
        0x8D1F4A62, 0xB5C3, 0x4A79,
        (ctypes.c_ubyte * 8)(0x9E, 0x32, 0x57, 0x44, 0x53, 0x36, 0x57, 0x01)
    )

    def __init__(self, icon_path: Path, on_action, on_ready, on_error):
        self.icon_path = Path(icon_path)
        self.on_action = on_action
        self.on_ready = on_ready
        self.on_error = on_error
        self._thread = None
        self._hwnd = None
        self._hicon = None
        self._nid = None
        self._ready = threading.Event()
        self._stop_requested = threading.Event()
        self._wndproc_callback = None
        self._wndclass_name = f"ChronosTrayWindow_{os.getpid()}"
        self._taskbar_created = 0
        self._user32 = None
        self._shell32 = None
        self._kernel32 = None
        self._last_error = None

    @property
    def ready(self):
        return self._ready.is_set()

    @property
    def last_error(self):
        return self._last_error

    def start(self):
        if os.name != "nt":
            self._last_error = "La bandeja nativa solo está disponible en Windows."
            self.on_error(self._last_error)
            return
        self._thread = threading.Thread(target=self._thread_main, name="ChronosNativeTray", daemon=True)
        self._thread.start()

    def _bind_api(self):
        self._user32 = ctypes.WinDLL("user32", use_last_error=True)
        self._shell32 = ctypes.WinDLL("shell32", use_last_error=True)
        self._kernel32 = ctypes.WinDLL("kernel32", use_last_error=True)

        self._kernel32.GetModuleHandleW.argtypes = [ctypes.c_wchar_p]
        self._kernel32.GetModuleHandleW.restype = ctypes.c_void_p
        self._shell32.Shell_NotifyIconW.argtypes = [ctypes.c_uint32, ctypes.POINTER(self.NOTIFYICONDATAW)]
        # Win32 BOOL is a 32-bit integer (not C's one-byte bool).
        self._shell32.Shell_NotifyIconW.restype = ctypes.c_int
        self._shell32.Shell_NotifyIconGetRect.argtypes = [
            ctypes.POINTER(self.NOTIFYICONIDENTIFIER), ctypes.POINTER(self.RECT)
        ]
        self._shell32.Shell_NotifyIconGetRect.restype = ctypes.c_long

        self._user32.RegisterClassW.argtypes = [ctypes.POINTER(self.WNDCLASSW)]
        self._user32.RegisterClassW.restype = ctypes.c_uint16
        self._user32.CreateWindowExW.argtypes = [
            ctypes.c_uint32, ctypes.c_wchar_p, ctypes.c_wchar_p, ctypes.c_uint32,
            ctypes.c_int, ctypes.c_int, ctypes.c_int, ctypes.c_int,
            ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p, ctypes.c_void_p,
        ]
        self._user32.CreateWindowExW.restype = ctypes.c_void_p
        self._user32.DefWindowProcW.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_size_t, ctypes.c_ssize_t]
        self._user32.DefWindowProcW.restype = ctypes.c_ssize_t
        self._user32.GetMessageW.argtypes = [ctypes.POINTER(self.MSG), ctypes.c_void_p, ctypes.c_uint32, ctypes.c_uint32]
        self._user32.GetMessageW.restype = ctypes.c_int
        self._user32.TranslateMessage.argtypes = [ctypes.POINTER(self.MSG)]
        self._user32.TranslateMessage.restype = ctypes.c_bool
        self._user32.DispatchMessageW.argtypes = [ctypes.POINTER(self.MSG)]
        self._user32.DispatchMessageW.restype = ctypes.c_ssize_t
        self._user32.PostQuitMessage.argtypes = [ctypes.c_int]
        self._user32.PostQuitMessage.restype = None
        self._user32.DestroyWindow.argtypes = [ctypes.c_void_p]
        self._user32.DestroyWindow.restype = ctypes.c_bool
        self._user32.PostMessageW.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_size_t, ctypes.c_ssize_t]
        self._user32.PostMessageW.restype = ctypes.c_bool
        self._user32.LoadImageW.argtypes = [ctypes.c_void_p, ctypes.c_wchar_p, ctypes.c_uint32,
                                            ctypes.c_int, ctypes.c_int, ctypes.c_uint32]
        self._user32.LoadImageW.restype = ctypes.c_void_p
        self._user32.DestroyIcon.argtypes = [ctypes.c_void_p]
        self._user32.DestroyIcon.restype = ctypes.c_bool
        self._user32.GetCursorPos.argtypes = [ctypes.POINTER(self.POINT)]
        self._user32.GetCursorPos.restype = ctypes.c_bool
        self._user32.RegisterWindowMessageW.argtypes = [ctypes.c_wchar_p]
        self._user32.RegisterWindowMessageW.restype = ctypes.c_uint32

    def _thread_main(self):
        try:
            self._bind_api()
            hinstance = self._kernel32.GetModuleHandleW(None)
            WNDPROC = ctypes.WINFUNCTYPE(ctypes.c_ssize_t, ctypes.c_void_p, ctypes.c_uint32,
                                         ctypes.c_size_t, ctypes.c_ssize_t)
            self._wndproc_callback = WNDPROC(self._wndproc)
            wndclass = self.WNDCLASSW()
            wndclass.style = self.CS_DBLCLKS
            wndclass.lpfnWndProc = ctypes.cast(self._wndproc_callback, ctypes.c_void_p)
            wndclass.cbClsExtra = 0
            wndclass.cbWndExtra = 0
            wndclass.hInstance = hinstance
            wndclass.hIcon = None
            wndclass.hCursor = None
            wndclass.hbrBackground = None
            wndclass.lpszMenuName = None
            wndclass.lpszClassName = self._wndclass_name
            atom = self._user32.RegisterClassW(ctypes.byref(wndclass))
            if not atom:
                err = ctypes.get_last_error()
                raise OSError(err, f"RegisterClassW falló ({err})")

            # Hidden top-level owner window. It does not create a taskbar button.
            self._hwnd = self._user32.CreateWindowExW(
                0, self._wndclass_name, "Chronos Notification Icon", 0,
                0, 0, 0, 0, None, None, hinstance, None
            )
            if not self._hwnd:
                err = ctypes.get_last_error()
                raise OSError(err, f"CreateWindowExW falló ({err})")

            self._taskbar_created = self._user32.RegisterWindowMessageW("TaskbarCreated")
            self._hicon = self._user32.LoadImageW(
                None, str(self.icon_path), self.IMAGE_ICON, 32, 32,
                self.LR_LOADFROMFILE | self.LR_DEFAULTSIZE
            )
            if not self._hicon:
                err = ctypes.get_last_error()
                raise OSError(err, f"No se pudo cargar chronos.ico ({err})")

            self._nid = self.NOTIFYICONDATAW()
            self._nid.cbSize = ctypes.sizeof(self.NOTIFYICONDATAW)
            self._nid.hWnd = self._hwnd
            self._nid.uID = 1
            self._nid.uFlags = (self.NIF_MESSAGE | self.NIF_ICON | self.NIF_TIP |
                                self.NIF_GUID | self.NIF_SHOWTIP)
            self._nid.uCallbackMessage = self.WM_TRAY
            self._nid.hIcon = self._hicon
            self._nid.szTip = "Chronos — WDS657"
            self._nid.guidItem = self.CHRONOS_TRAY_GUID
            log_runtime(
                f"Tray identity: GUID={self._nid.guidItem.Data1:08X}-"
                f"{self._nid.guidItem.Data2:04X}-{self._nid.guidItem.Data3:04X}; "
                f"NOTIFYICONDATA bytes={ctypes.sizeof(self.NOTIFYICONDATAW)}; "
                f"flags=0x{self._nid.uFlags:08X}."
            )

            added = False
            for attempt in range(5):
                if self._add_icon():
                    added = True
                    break
                time.sleep(0.6)
            if not added:
                err = ctypes.get_last_error()
                raise OSError(err, f"Shell_NotifyIconW(NIM_ADD) no pudo registrar el icono ({err})")

            self._ready.set()
            self.on_ready()
            log_runtime("Shell_NotifyIconW(NIM_ADD) aceptó el icono de Chronos.")
            # Explorer may place new app icons in its overflow flyout. Query the
            # actual shell rectangle so the log distinguishes visible vs overflow.
            time.sleep(0.35)
            self._log_shell_icon_position()

            msg = self.MSG()
            while not self._stop_requested.is_set():
                result = self._user32.GetMessageW(ctypes.byref(msg), None, 0, 0)
                if result <= 0:
                    break
                self._user32.TranslateMessage(ctypes.byref(msg))
                self._user32.DispatchMessageW(ctypes.byref(msg))
        except Exception as exc:
            self._last_error = repr(exc)
            log_runtime(f"Error de bandeja nativa: {self._last_error}")
            try:
                self.on_error(str(exc))
            except Exception:
                pass
        finally:
            self._ready.clear()
            try:
                if self._nid is not None and self._hwnd:
                    self._shell32.Shell_NotifyIconW(self.NIM_DELETE, ctypes.byref(self._nid))
            except Exception:
                pass
            try:
                if self._hwnd:
                    self._user32.DestroyWindow(self._hwnd)
            except Exception:
                pass
            try:
                if self._hicon:
                    self._user32.DestroyIcon(self._hicon)
            except Exception:
                pass
            self._hwnd = self._hicon = self._nid = None

    def _add_icon(self):
        """Register the icon using a stable GUID and configure callback protocol v4."""
        ctypes.set_last_error(0)
        ok = bool(self._shell32.Shell_NotifyIconW(self.NIM_ADD, ctypes.byref(self._nid)))
        if not ok:
            self._last_error = (
                f"Shell_NotifyIconW(NIM_ADD) devolvió FALSE; "
                f"GetLastError={ctypes.get_last_error()}"
            )
            log_runtime(self._last_error)
            return False

        # Microsoft requires NIM_SETVERSION after every NIM_ADD. This also enables
        # the modern v4 callback format on current Windows versions.
        self._nid.uVersion = self.NOTIFYICON_VERSION_4
        ctypes.set_last_error(0)
        version_ok = bool(self._shell32.Shell_NotifyIconW(
            self.NIM_SETVERSION, ctypes.byref(self._nid)
        ))
        if version_ok:
            self._callback_version = self.NOTIFYICON_VERSION_4
            log_runtime("NIM_SETVERSION(NOTIFYICON_VERSION_4) aceptado.")
        else:
            self._callback_version = 0
            self._nid.uVersion = 0
            log_runtime(
                "Aviso: NIM_SETVERSION no fue aceptado; se conserva el protocolo clásico. "
                f"GetLastError={ctypes.get_last_error()}"
            )
        return True

    def _log_shell_icon_position(self):
        """Query Explorer for the icon rectangle (S_OK visible, S_FALSE overflow)."""
        if not self._nid or not self._hwnd:
            return
        try:
            ident = self.NOTIFYICONIDENTIFIER()
            ident.cbSize = ctypes.sizeof(self.NOTIFYICONIDENTIFIER)
            ident.hWnd = self._hwnd
            ident.uID = self._nid.uID
            ident.guidItem = self._nid.guidItem
            rect = self.RECT()
            hr = int(self._shell32.Shell_NotifyIconGetRect(
                ctypes.byref(ident), ctypes.byref(rect)
            ))
            if hr == 0:
                log_runtime(
                    "Shell_NotifyIconGetRect: S_OK; Chronos tiene rectángulo en la bandeja "
                    f"(left={rect.left}, top={rect.top}, right={rect.right}, bottom={rect.bottom})."
                )
            elif hr == 1:
                log_runtime(
                    "Shell_NotifyIconGetRect: S_FALSE; Explorer no devolvió una posición visible. "
                    "Esto suele indicar que el icono está en el área de desbordamiento/iconos ocultos."
                )
            else:
                log_runtime(f"Shell_NotifyIconGetRect: HRESULT=0x{hr & 0xFFFFFFFF:08X}.")
        except Exception as exc:
            log_runtime(f"No se pudo consultar Shell_NotifyIconGetRect: {exc!r}")

    def _wndproc(self, hwnd, message, wparam, lparam):
        try:
            if self._taskbar_created and message == self._taskbar_created:
                if self._add_icon():
                    self._ready.set()
                    self.on_ready()
                    log_runtime("Explorer reinició la barra; icono de Chronos registrado nuevamente.")
                    self._log_shell_icon_position()
                else:
                    self._ready.clear()
                    self.on_error(self._last_error or "No se pudo restaurar el icono después de reiniciar Explorer.")
                return 0
            if message == self.WM_TRAY:
                # For NOTIFYICON_VERSION_4 the event remains in LOWORD(lParam).
                event = int(lparam) & 0xFFFF
                if event in (self.WM_LBUTTONUP, self.WM_LBUTTONDBLCLK,
                             self.NIN_SELECT, self.NIN_KEYSELECT):
                    self.on_action("show")
                    return 0
                if event in (self.WM_RBUTTONUP, self.WM_CONTEXTMENU):
                    self._show_context_menu()
                    return 0
            if message == self.WM_CLOSE:
                try:
                    if self._nid is not None:
                        self._shell32.Shell_NotifyIconW(self.NIM_DELETE, ctypes.byref(self._nid))
                finally:
                    self._user32.DestroyWindow(hwnd)
                return 0
            if message == self.WM_DESTROY:
                self._user32.PostQuitMessage(0)
                return 0
        except Exception as exc:
            log_runtime(f"Excepción en ventana de bandeja: {exc!r}")
        return self._user32.DefWindowProcW(hwnd, message, wparam, lparam)

    def _show_context_menu(self):
        """Ask the Tk UI thread to display Chronos' own neon popup menu.

        The stock Win32 TrackPopupMenu is intentionally not used because it
        always uses the Windows system menu palette rather than Chronos' theme.
        """
        point = self.POINT()
        if not self._user32.GetCursorPos(ctypes.byref(point)):
            log_runtime(f"GetCursorPos falló al abrir el menú de bandeja: {ctypes.get_last_error()}")
            return
        self.on_action(f"tray_menu:{int(point.x)}:{int(point.y)}")

    def ensure_visible(self):
        # The icon is registered and owned by the shell while this flag is set.
        # TaskbarCreated is monitored to restore it after an Explorer restart.
        return self.ready and self._nid is not None

    def stop(self):
        self._stop_requested.set()
        hwnd = self._hwnd
        if hwnd and self._user32:
            try:
                self._user32.PostMessageW(hwnd, self.WM_CLOSE, 0, 0)
            except Exception:
                pass
        if self._thread and self._thread.is_alive() and threading.current_thread() is not self._thread:
            self._thread.join(timeout=1.5)


def resource_path(name: str) -> Path:
    """Resolve an asset both from source and from a PyInstaller one-file build."""
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
    return base / name


def app_data_dir() -> Path:
    if os.name == "nt":
        base = Path(os.environ.get("APPDATA", Path.home()))
    else:
        base = Path.home() / ".config"
    folder = base / "Chronos"
    folder.mkdir(parents=True, exist_ok=True)
    return folder


def data_file() -> Path:
    target = app_data_dir() / "timers.json"
    # One-time migration from the previous ORION Reminder versions.
    old = (Path(os.environ.get("APPDATA", Path.home())) / "ORIONReminder" / "timers.json")
    if not target.exists() and old.exists():
        try:
            target.write_bytes(old.read_bytes())
        except OSError:
            pass
    return target


def alarm_file() -> Path:
    return app_data_dir() / "chronos_alarm.wav"


def history_file() -> Path:
    return app_data_dir() / "history.json"


def settings_file() -> Path:
    return app_data_dir() / "settings.json"


def format_local_datetime(timestamp) -> str:
    if timestamp in (None, ""):
        return "Fecha no registrada"
    try:
        return datetime.fromtimestamp(float(timestamp)).strftime("%d/%m/%Y  %H:%M:%S")
    except (TypeError, ValueError, OSError, OverflowError):
        return "Fecha no disponible"


def create_alarm_wav(path: Path) -> Path:
    """Create a clear three-note alarm locally; no network or external audio file."""
    path.parent.mkdir(parents=True, exist_ok=True)
    sample_rate = 44100
    pattern = [(880, .22), (0, .09), (1046, .22), (0, .09), (1318, .34), (0, .42)]
    frames = bytearray()
    for frequency, duration in pattern:
        count = int(sample_rate * duration)
        for i in range(count):
            if frequency == 0:
                sample = 0
            else:
                edge = min(1.0, i / 250.0, (count - 1 - i) / 250.0)
                sample = int(32767 * .72 * max(0.0, edge) * math.sin(2 * math.pi * frequency * i / sample_rate))
            frames.extend(struct.pack("<h", sample))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(sample_rate)
        wav.writeframes(frames)
    return path


def play_wav(path: Path, loop: bool = False) -> None:
    if winsound is None:
        raise RuntimeError("La reproducción WAV de Windows solo está disponible en Windows.")
    flags = winsound.SND_FILENAME | winsound.SND_ASYNC
    if loop:
        flags |= winsound.SND_LOOP
    winsound.PlaySound(str(path), flags)


def stop_wav() -> None:
    if winsound is not None:
        try:
            winsound.PlaySound(None, 0)
        except RuntimeError:
            pass


def fmt(seconds: float) -> str:
    total = max(0, int(math.ceil(seconds)))
    hours, rem = divmod(total, 3600)
    minutes, seconds = divmod(rem, 60)
    return f"{hours:02d}:{minutes:02d}:{seconds:02d}"


def truncate(text: str, limit: int = 18) -> str:
    text = " ".join(str(text).split())
    return text if len(text) <= limit else text[:limit - 1].rstrip() + "…"


def rounded_panel(parent, bg=PANEL, border=BORDER, padx=1, pady=1):
    frame = tk.Frame(parent, bg=border, padx=padx, pady=pady, bd=0, highlightthickness=0)
    inner = tk.Frame(frame, bg=bg, bd=0, highlightthickness=0)
    inner.pack(fill="both", expand=True)
    return frame, inner


class NeonButton(tk.Frame):
    """Flat neon command row with the appearance of the reference menu."""
    def __init__(self, parent, glyph, label, command, hint="", accent=CYAN, danger=False):
        super().__init__(parent, bg=PANEL, height=37, cursor="hand2")
        self.pack_propagate(False)
        self.command = command
        self.normal_bg = PANEL
        self.hover_bg = PANEL_HOVER
        self.glyph = tk.Label(self, text=glyph, bg=PANEL, fg=(PINK if danger else accent),
                              font=(FONT, 18, "bold"), width=3)
        self.glyph.pack(side="left", padx=(8, 8), fill="y")
        self.label = tk.Label(self, text=label, bg=PANEL, fg=TEXT,
                              font=(FONT, 10), anchor="w")
        self.label.pack(side="left", fill="both", expand=True)
        self.hint = tk.Label(self, text=hint, bg=PANEL, fg=MUTED,
                             font=(FONT, 8, "italic"))
        self.hint.pack(side="right", padx=(4, 14))
        for widget in (self, self.glyph, self.label, self.hint):
            widget.bind("<Button-1>", self._click)
            widget.bind("<Enter>", self._enter)
            widget.bind("<Leave>", self._leave)

    def _click(self, _event=None):
        self.command()

    def _enter(self, _event=None):
        for widget in (self, self.glyph, self.label, self.hint):
            widget.configure(bg=self.hover_bg)
        self.label.configure(fg=CYAN_BRIGHT)

    def _leave(self, _event=None):
        for widget in (self, self.glyph, self.label, self.hint):
            widget.configure(bg=self.normal_bg)
        self.label.configure(fg=TEXT)


class NewTimerDialog:
    def __init__(self, app: "ChronosApp"):
        self.app = app
        self.t = app.t
        self.result = None
        self.window = tk.Toplevel(app.root)
        self.window.title(self.t("Nuevo temporizador — Chronos"))
        self.window.configure(bg=BG)
        self.window.resizable(False, False)
        self.window.transient(app.root)
        self.window.grab_set()
        try:
            self.window.iconbitmap(str(resource_path("chronos.ico")))
        except tk.TclError:
            pass

        wrap, body = rounded_panel(self.window, bg=PANEL, border=CYAN)
        wrap.pack(fill="both", expand=True, padx=1, pady=1)
        body.configure(padx=18, pady=15)
        self._title(body, self.t("NUEVO TEMPORIZADOR"), CYAN, 12).pack(anchor="w", pady=(0, 12))
        self._label(body, self.t("NOMBRE")).pack(anchor="w", pady=(0, 3))
        self.title_var = tk.StringVar(value=self.t("Cocina"))
        self._entry(body, self.title_var).pack(fill="x")

        self._label(body, self.t("TIEMPO")).pack(anchor="w", pady=(12, 4))
        time_row = tk.Frame(body, bg=PANEL)
        time_row.pack(anchor="w")
        self.hours = tk.StringVar(value="0")
        self.minutes = tk.StringVar(value="10")
        self.seconds = tk.StringVar(value="0")
        self._spin(time_row, self.hours, 99, self.t("HORAS"))
        self._spin(time_row, self.minutes, 59, self.t("MINUTOS"))
        self._spin(time_row, self.seconds, 59, self.t("SEGUNDOS"))

        self._label(body, self.t("NOTA / DETALLE")).pack(anchor="w", pady=(12, 4))
        self.note = tk.Text(body, width=42, height=3, wrap="word", bg=PANEL_2, fg=TEXT,
                            insertbackground=CYAN, relief="flat", highlightthickness=1,
                            highlightbackground=BORDER, highlightcolor=CYAN,
                            font=(FONT, 9), padx=8, pady=6)
        self.note.pack(fill="x")
        self.sound_var = tk.BooleanVar(value=True)
        footer = tk.Frame(body, bg=PANEL)
        footer.pack(fill="x", pady=(11, 13))
        tk.Checkbutton(footer, text=self.t("Alarma sonora repetitiva"), variable=self.sound_var,
                       bg=PANEL, fg=TEXT, activebackground=PANEL, activeforeground=CYAN,
                       selectcolor=PANEL_2, font=(FONT, 9), relief="flat",
                       highlightthickness=0).pack(side="left")
        self._button(footer, self.t("PROBAR SONIDO"), app.test_sound, secondary=True).pack(side="right")
        buttons = tk.Frame(body, bg=PANEL)
        buttons.pack(fill="x")
        self._button(buttons, self.t("CANCELAR"), self.cancel, secondary=True).pack(side="right", padx=(8, 0))
        self._button(buttons, self.t("INICIAR  ›"), self.accept).pack(side="right")
        self.window.bind("<Escape>", lambda _e: self.cancel())
        self.window.bind("<Return>", lambda _e: self.accept())
        self.window.update_idletasks()
        x = app.root.winfo_rootx() + (app.root.winfo_width() - self.window.winfo_width()) // 2
        y = app.root.winfo_rooty() + (app.root.winfo_height() - self.window.winfo_height()) // 2
        self.window.geometry(f"+{max(20, x)}+{max(20, y)}")
        self.window.after(100, self.window.focus_force)

    @staticmethod
    def _title(parent, text, color, size):
        return tk.Label(parent, text=text, bg=PANEL, fg=color, font=(FONT, size, "bold"))

    @staticmethod
    def _label(parent, text):
        return tk.Label(parent, text=text, bg=PANEL, fg=MUTED, font=(FONT, 8, "bold"))

    @staticmethod
    def _entry(parent, var):
        return tk.Entry(parent, textvariable=var, bg=PANEL_2, fg=TEXT, insertbackground=CYAN,
                        relief="flat", highlightthickness=1, highlightbackground=BORDER,
                        highlightcolor=CYAN, font=(FONT, 10))

    @staticmethod
    def _spin(parent, var, maximum, label):
        box = tk.Frame(parent, bg=PANEL)
        box.pack(side="left", padx=(0, 12))
        spin = tk.Spinbox(box, from_=0, to=maximum, textvariable=var, width=5,
                          justify="center", bg=PANEL_2, fg=CYAN, buttonbackground=PANEL_2,
                          insertbackground=CYAN, relief="flat", font=(DIGITS, 12, "bold"))
        spin.pack()
        tk.Label(box, text=label, bg=PANEL, fg=MUTED, font=(FONT, 7, "bold")).pack(pady=(3, 0))

    @staticmethod
    def _button(parent, text, command, secondary=False):
        return tk.Button(parent, text=text, command=command, cursor="hand2",
                         bg=PANEL_2 if secondary else CYAN,
                         fg=TEXT if secondary else DARK_TEXT,
                         activebackground=BORDER if secondary else GREEN,
                         activeforeground=TEXT if secondary else DARK_TEXT,
                         relief="flat", bd=0, padx=12, pady=6,
                         font=(FONT, 8, "bold"))

    def accept(self):
        try:
            h, m, s = int(self.hours.get()), int(self.minutes.get()), int(self.seconds.get())
            if not (0 <= h <= 99 and 0 <= m <= 59 and 0 <= s <= 59):
                raise ValueError
        except ValueError:
            messagebox.showerror(APP_NAME, self.t("Ingresá un tiempo válido."), parent=self.window)
            return
        duration = h * 3600 + m * 60 + s
        if duration <= 0:
            messagebox.showwarning(APP_NAME, self.t("El tiempo debe ser mayor que cero."), parent=self.window)
            return
        self.result = {
            "title": self.title_var.get().strip() or self.t("Recordatorio"),
            "note": self.note.get("1.0", "end-1c").strip(),
            "duration": duration,
            "sound": bool(self.sound_var.get()),
        }
        self.window.destroy()

    def cancel(self):
        self.result = None
        self.window.destroy()


class FloatingTimer:
    """Always-on-top timer. Double-click its header to fold/unfold the pill counter."""
    def __init__(self, app: "ChronosApp", timer_id: str):
        self.app = app
        self.timer_id = timer_id
        self.collapsed = False
        self._drag_x = self._drag_y = 0
        self._resize_origin = None
        self._resize_scale_after = None
        self._last_scale_size = (0, 0)
        self._scale = 1.0
        self._logo_source = None
        self._logo_photo = None
        self.window = tk.Toplevel(app.root)
        self.window.title(app.timers[timer_id]["title"])
        # No transient relationship to the visible dashboard: minimizing or
        # withdrawing the dashboard must not hide the floating timers.
        try:
            self.window.transient("")
        except tk.TclError:
            pass
        self.window.overrideredirect(True)
        self.window.attributes("-topmost", True)
        self.window.configure(bg=BORDER)
        try:
            self.window.iconbitmap(str(resource_path("chronos.ico")))
        except tk.TclError:
            pass
        saved_pos = app.timers[timer_id].get("position")
        saved_size = app.timers[timer_id].get("window_size", [350, 280])
        try:
            saved_width = max(130, min(900, int(saved_size[0])))
            saved_height = max(105, min(700, int(saved_size[1])))
        except (TypeError, ValueError, IndexError):
            saved_width, saved_height = 350, 280
        self.expanded_width = saved_width
        self.expanded_height = saved_height
        try:
            self.collapsed_width = max(90, min(900, int(
                app.timers[timer_id].get("collapsed_width", saved_width))))
        except (TypeError, ValueError):
            self.collapsed_width = saved_width
        if saved_pos and isinstance(saved_pos, str) and "+" in saved_pos:
            geo = f"{saved_width}x{saved_height}{saved_pos[saved_pos.find('+'):]}"
        else:
            default_geo = app.next_floating_geometry()
            default_pos = default_geo[default_geo.find("+"):] if "+" in default_geo else "+40+80"
            geo = f"{saved_width}x{saved_height}{default_pos}"
        self.window.geometry(geo)
        self.window.protocol("WM_DELETE_WINDOW", self.hide)

        self.outer = tk.Frame(self.window, bg=CYAN, padx=1, pady=1)
        self.outer.pack(fill="both", expand=True)
        self.panel = tk.Frame(self.outer, bg=PANEL, padx=9, pady=7)
        self.panel.pack(fill="both", expand=True)
        self.bar = tk.Frame(self.panel, bg=PANEL_2, height=46, cursor="hand2")
        self.bar.pack(fill="x")
        self.bar.pack_propagate(False)

        self.logo = self._logo_label(self.bar, 28)
        self.logo.pack(side="left", padx=(7, 7), pady=5)
        self.bar_title = tk.Label(self.bar, text="", bg=PANEL_2, fg=CYAN,
                                  font=(FONT, 10, "bold"), anchor="w", cursor="hand2")
        self.bar_title.pack(side="left", fill="both", expand=True, padx=(0, 8))
        self.bar_time = tk.Label(self.bar, text="", bg=PANEL_2, fg=GREEN,
                                 font=(DIGITS, 20, "bold"), cursor="hand2")
        self.bar_time.pack(side="right", padx=(2, 8))
        self.fold_button = tk.Label(self.bar, text="⌄", bg=PANEL_2, fg=CYAN_BRIGHT,
                                    font=(FONT, 17, "bold"), cursor="hand2", padx=8)
        self.fold_button.pack(side="right")
        self.close_button = tk.Label(self.bar, text="×", bg=PANEL_2, fg=MUTED,
                                     font=(FONT, 15, "bold"), cursor="hand2", padx=6)
        self.close_button.pack(side="right")
        # Reserve fixed-width controls on the right before letting the title
        # expand. This keeps the complete countdown visible even in a narrow pill.
        for widget in (self.logo, self.bar_title, self.bar_time,
                       self.fold_button, self.close_button):
            widget.pack_forget()
        self.close_button.pack(side="right")
        self.fold_button.pack(side="right")
        self.bar_time.pack(side="right", padx=(2, 8))
        self.logo.pack(side="left", padx=(7, 7), pady=5)
        self.bar_title.pack(side="left", fill="both", expand=True, padx=(0, 8))
        self.close_button.bind("<Button-1>", lambda _e: self.hide())
        for widget in (self.bar, self.logo, self.bar_title, self.bar_time):
            widget.bind("<ButtonPress-1>", self._drag_start)
            widget.bind("<B1-Motion>", self._drag_move)
            widget.bind("<Double-Button-1>", lambda _e: self.toggle_collapsed())
        self.fold_button.bind("<Button-1>", lambda _e: self._fold_or_ack())
        for widget in (self.bar, self.logo, self.bar_title, self.bar_time, self.fold_button):
            widget.bind("<Button-3>", self._context_menu)

        self.content = tk.Frame(self.panel, bg=PANEL)
        self.content.pack(fill="both", expand=True, pady=(7, 0))
        self.note_label = tk.Label(self.content, text="", bg=PANEL, fg=MUTED,
                                   font=(FONT, 8), anchor="w")
        self.note_label.pack(fill="x")
        self.time_label = tk.Label(self.content, text="00:00:00", bg=PANEL, fg=GREEN,
                                   font=(DIGITS, 32, "bold"))
        self.time_label.pack(pady=(2, 0))
        self.status_label = tk.Label(self.content, text=app.t("EN MARCHA"), bg=PANEL, fg=CYAN,
                                     font=(FONT, 7, "bold"))
        self.status_label.pack()

        controls = tk.Frame(self.content, bg=PANEL)
        self.controls_frame = controls
        controls.pack(fill="x", pady=(5, 0))
        self.pause_button = self._control(controls, app.t("PAUSAR"), lambda: app.toggle_pause(timer_id))
        self.pause_button.pack(side="left", fill="x", expand=True, padx=(0, 3))
        self.add_minute_button = self._control(controls, "+1 MIN", lambda: app.add_minute(timer_id))
        self.add_minute_button.pack(side="left", fill="x", expand=True, padx=3)
        self.reset_button = self._control(controls, app.t("REINICIAR"), lambda: app.reset_timer(timer_id))
        self.reset_button.pack(side="left", fill="x", expand=True, padx=(3, 0))
        self.control_buttons = [self.pause_button, self.add_minute_button, self.reset_button]

        transparency = tk.Frame(self.content, bg=PANEL)
        self.transparency_frame = transparency
        transparency.pack(fill="x", pady=(6, 0))
        self.transparency_label = tk.Label(transparency, text=app.t("TRANSPARENCIA"), bg=PANEL, fg=MUTED,
                                           font=(FONT, 7, "bold"))
        self.transparency_label.pack(side="left")
        self.transparency_var = tk.IntVar(value=max(0, min(60, int(app.timers[timer_id].get("transparency", 15)))))
        self.transparency_value = tk.Label(transparency, text=f"{self.transparency_var.get()}%", bg=PANEL, fg=CYAN,
                                           font=(DIGITS, 8, "bold"), width=4)
        self.transparency_value.pack(side="right")
        self.transparency_canvas = tk.Canvas(transparency, height=25, width=160, bg=PANEL,
                                             highlightthickness=0, bd=0, cursor="hand2")
        self.transparency_canvas.pack(side="left", fill="x", expand=True, padx=7)
        self.transparency_canvas.bind("<Configure>", self._draw_slider)
        self.transparency_canvas.bind("<Button-1>", self._move_slider)
        self.transparency_canvas.bind("<B1-Motion>", self._move_slider)
        self.transparency_canvas.bind("<ButtonRelease-1>", self._save_slider)

        self.stop_alarm_button = tk.Button(
            self.content, text=app.t("DETENER ALARMA  /  CONFIRMAR"),
            command=lambda: app.acknowledge_alarm(timer_id),
            bg=PINK, fg="#170613", activebackground="#FF97CC", activeforeground="#170613",
            relief="flat", bd=0, padx=8, pady=5, cursor="hand2", font=(FONT, 8, "bold"))

        # A custom corner grip keeps the frameless neon window resizable.
        # It is drawn inside Chronos, so it also works with overrideredirect(True).
        self.resize_grip = tk.Canvas(self.window, width=19, height=19, bg=PANEL,
                                     highlightthickness=0, bd=0, cursor="bottom_right_corner")
        self.resize_grip.place(relx=1.0, rely=1.0, anchor="se")
        for offset in (6, 11, 16):
            self.resize_grip.create_line(19 - offset, 19, 19, 19 - offset,
                                         fill=CYAN, width=1.5)
        self.resize_grip.bind("<ButtonPress-1>", self._begin_resize)
        self.resize_grip.bind("<B1-Motion>", self._resize_move)
        self.resize_grip.bind("<ButtonRelease-1>", self._resize_end)
        self.window.bind("<Configure>", self._on_window_configure, add="+")

        self._apply_alpha(self.transparency_var.get())
        self.update_view()
        self.window.after(80, self._apply_resize_scale)
        # Apply WS_EX_TOOLWINDOW only after Tk/Windows has created the HWND.
        self.window.after(180, self._apply_no_taskbar_button)

    def _apply_no_taskbar_button(self):
        try:
            if self.window.winfo_exists():
                owner_hwnd = getattr(self.app, "timer_owner_hwnd", None)
                if owner_hwnd:
                    apply_no_taskbar_button(self.window, owner_hwnd)
                else:
                    log_runtime("AVISO: no existe propietario nativo independiente; el reloj no se vincula al panel principal.")
                    apply_no_taskbar_button(self.window, None)
        except tk.TclError:
            pass

    def _set_resize_grip_visible(self, visible: bool):
        """The resize handle must never cover the mini pill's OK/fold button."""
        try:
            if visible:
                self.resize_grip.place(relx=1.0, rely=1.0, anchor="se")
                self.resize_grip.lift()
            else:
                self.resize_grip.place_forget()
        except tk.TclError:
            pass

    def _logo_label(self, parent, size):
        if Image is None or ImageTk is None:
            return tk.Label(parent, text="⌛", bg=PANEL_2, fg=GOLD, font=(FONT, 20))
        try:
            self._logo_source = Image.open(resource_path("chronos_icon.png")).convert("RGBA")
            self._logo_photo = ImageTk.PhotoImage(
                self._logo_source.resize((size, size), Image.Resampling.LANCZOS)
            )
            label = tk.Label(parent, image=self._logo_photo, bg=PANEL_2, bd=0)
            label.image = self._logo_photo
            return label
        except Exception:
            return tk.Label(parent, text="⌛", bg=PANEL_2, fg=GOLD, font=(FONT, 20))

    def _begin_resize(self, event):
        self._resize_origin = (event.x_root, event.y_root,
                              self.window.winfo_width(), self.window.winfo_height())
        return "break"

    def _resize_move(self, event):
        if not self._resize_origin:
            return "break"
        sx, sy, sw, sh = self._resize_origin
        x, y = self.window.winfo_x(), self.window.winfo_y()
        if self.collapsed:
            width = max(90, min(900, sw + event.x_root - sx))
            height = self._collapsed_height_for_width(width)
            self.collapsed_width = width
        else:
            width = max(130, min(900, sw + event.x_root - sx))
            height = max(105, min(700, sh + event.y_root - sy))
            self.expanded_width, self.expanded_height = width, height
        self.window.geometry(f"{width}x{height}+{x}+{y}")
        return "break"

    def _resize_end(self, _event=None):
        self._resize_origin = None
        if self.collapsed:
            self.collapsed_width = max(90, self.window.winfo_width())
            self.app.timers[self.timer_id]["collapsed_width"] = self.collapsed_width
        else:
            self.expanded_width = max(130, self.window.winfo_width())
            self.expanded_height = max(105, self.window.winfo_height())
            self.app.timers[self.timer_id]["window_size"] = [
                self.expanded_width, self.expanded_height
            ]
        self.app.timers[self.timer_id]["position"] = (
            f"+{self.window.winfo_x()}+{self.window.winfo_y()}"
        )
        self.app._save()
        return "break"

    def _on_window_configure(self, event=None):
        if event is not None and event.widget is not self.window:
            return
        if not self.window.winfo_exists():
            return
        if self._resize_scale_after is not None:
            try:
                self.window.after_cancel(self._resize_scale_after)
            except tk.TclError:
                pass
        self._resize_scale_after = self.window.after(55, self._apply_resize_scale)

    def _set_logo_size(self, size):
        if self._logo_source is None or ImageTk is None:
            return
        try:
            photo = ImageTk.PhotoImage(
                self._logo_source.resize((size, size), Image.Resampling.LANCZOS)
            )
            self.logo.configure(image=photo)
            self.logo.image = photo
            self._logo_photo = photo
        except (tk.TclError, ValueError):
            pass

    @staticmethod
    def _collapsed_height_for_width(width):
        # Keep the mini pill compact while leaving enough vertical room for
        # the hourglass, abbreviated title and countdown digits.
        return max(25, int(round(50 * max(0.40, min(1.0, width / 350.0)))))

    def _apply_resize_scale(self):
        self._resize_scale_after = None
        if not self.window.winfo_exists():
            return
        width = self.window.winfo_width()
        height = self.window.winfo_height()
        if self.collapsed:
            self._set_resize_grip_visible(False)
            width = max(90, width)
            # The horizontal dimension drives the mini pill's typography.
            scale = max(0.25, min(1.85, width / 350.0))
        else:
            width = max(130, width)
            height = max(105, height)
            # The smaller dimension is the limiting dimension. This makes a
            # side-only resize visibly shrink/grow digits and text as well.
            scale = max(0.32, min(1.85, min(width / 350.0, height / 280.0)))
        if (width, height, self.collapsed) == self._last_scale_size:
            return
        self._last_scale_size = (width, height, self.collapsed)
        self._scale = scale
        font_size = lambda base, minimum=4: max(minimum, int(round(base * scale)))

        # Shared header: title, icon, countdown and window controls.
        if self.collapsed:
            self.panel.configure(padx=font_size(5, 2), pady=font_size(4, 2))
            self.bar.configure(height=self._collapsed_height_for_width(width))
            logo_size = font_size(28, 10)
            if width <= 130:
                # Ultra-compact pill: keep the hourglass and the full countdown
                # visible even at 100 px; the title receives the remaining space.
                self.logo.pack_configure(padx=(2, 2), pady=1)
                self.bar_title.pack_configure(padx=(0, 1))
                self.bar_time.pack_configure(padx=(1, 2))
                self.logo_size = font_size(28, 8)
                self.bar_title.configure(font=(FONT, font_size(10, 4), "bold"))
                self.bar_time.configure(font=(DIGITS, font_size(20, 6), "bold"))
                self.fold_button.configure(font=(FONT, font_size(17, 6), "bold"), padx=2)
            else:
                self.logo.pack_configure(padx=(font_size(7, 3), font_size(7, 3)),
                                         pady=font_size(5, 2))
                self.bar_title.pack_configure(padx=(0, 8))
                self.bar_time.pack_configure(padx=(2, 8))
                self.logo_size = font_size(28, 10)
                self.bar_title.configure(font=(FONT, font_size(10, 5), "bold"))
                self.bar_time.configure(font=(DIGITS, font_size(20, 8), "bold"))
                self.fold_button.configure(font=(FONT, font_size(17, 7), "bold"),
                                           padx=font_size(8, 3))
            self.close_button.configure(font=(FONT, font_size(15, 7), "bold"),
                                        padx=font_size(6, 2))
            # In the narrow pill the close button competes with the digits.
            # Hide it; the right-click menu still offers "Ocultar reloj".
            self.close_button.pack_forget()
            self._set_logo_size(getattr(self, "logo_size", logo_size))
            self.window.update_idletasks()
            self.update_view()
            return

        self._set_resize_grip_visible(True)
        self.panel.configure(padx=font_size(9, 2), pady=font_size(7, 2))
        self.bar.configure(height=font_size(46, 20))
        self.logo.pack_configure(padx=(font_size(7, 3), font_size(7, 3)),
                                 pady=font_size(5, 2))
        self.bar_title.configure(font=(FONT, font_size(10, 5), "bold"))
        self.bar_time.configure(font=(DIGITS, font_size(20, 8), "bold"))
        self.fold_button.configure(font=(FONT, font_size(17, 7), "bold"),
                                   padx=font_size(8, 3))
        self.close_button.configure(font=(FONT, font_size(15, 7), "bold"),
                                    padx=font_size(6, 2))
        if not self.close_button.winfo_manager():
            self.close_button.pack(side="right")
        self.content.pack_configure(pady=(font_size(7, 3), 0))
        self.note_label.configure(font=(FONT, font_size(8, 5), "normal"),
                                  wraplength=max(110, width - font_size(42, 22)))
        self.time_label.configure(font=(DIGITS, font_size(32, 12), "bold"))
        self.time_label.pack_configure(pady=(font_size(2, 1), font_size(4, 2)))
        self.status_label.configure(font=(FONT, font_size(7, 4), "bold"))
        self.status_label.pack_configure(pady=(font_size(3, 1), 0))
        self.controls_frame.pack_configure(pady=(font_size(5, 2), 0))
        self.transparency_frame.pack_configure(pady=(font_size(6, 2), 0))
        self.transparency_label.configure(font=(FONT, font_size(7, 4), "bold"))
        self.transparency_value.configure(font=(DIGITS, font_size(8, 5), "bold"))
        self.transparency_canvas.configure(height=font_size(25, 10))
        for button in self.control_buttons:
            button.configure(font=(FONT, font_size(7, 4), "bold"),
                             padx=font_size(6, 2), pady=font_size(5, 2))
        self.stop_alarm_button.configure(font=(FONT, font_size(8, 5), "bold"),
                                         padx=font_size(8, 3), pady=font_size(5, 2))
        self._set_logo_size(font_size(28, 9))
        grip_size = font_size(19, 10)
        self.resize_grip.configure(width=grip_size, height=grip_size)
        self.resize_grip.delete("all")
        for offset in (max(3, int(grip_size * 0.32)), max(5, int(grip_size * 0.60)), max(7, int(grip_size * 0.84))):
            self.resize_grip.create_line(grip_size - offset, grip_size,
                                         grip_size, grip_size - offset,
                                         fill=CYAN, width=1.0)
        self._draw_slider()

    @staticmethod
    def _control(parent, text, command):
        return tk.Button(parent, text=text, command=command, cursor="hand2", bg=PANEL_2,
                         fg=CYAN_BRIGHT, activebackground=BORDER, activeforeground=TEXT,
                         relief="flat", bd=0, padx=6, pady=5, font=(FONT, 7, "bold"))

    def _drag_start(self, event):
        self._drag_x = event.x_root - self.window.winfo_x()
        self._drag_y = event.y_root - self.window.winfo_y()

    def _drag_move(self, event):
        x = event.x_root - self._drag_x
        y = event.y_root - self._drag_y
        self.window.geometry(f"+{x}+{y}")
        self.app.timers[self.timer_id]["position"] = f"+{x}+{y}"
        self.app._save_debounced()

    def _fold_or_ack(self):
        timer = self.app.timers.get(self.timer_id)
        if timer and timer["state"] == "finished" and not timer.get("alarm_acknowledged", False):
            self.app.acknowledge_alarm(self.timer_id)
        else:
            self.toggle_collapsed()

    def toggle_collapsed(self):
        x, y = self.window.winfo_x(), self.window.winfo_y()
        if not self.collapsed:
            self.expanded_width = max(130, self.window.winfo_width())
            self.expanded_height = max(105, self.window.winfo_height())
            self.collapsed_width = max(90, int(self.app.timers[self.timer_id].get(
                "collapsed_width", self.expanded_width)))
            self.collapsed = True
            self.content.pack_forget()
            self.fold_button.configure(text="⌄")
            mini_height = self._collapsed_height_for_width(self.collapsed_width)
            self.window.geometry(f"{self.collapsed_width}x{mini_height}+{x}+{y}")
            self.resize_grip.configure(cursor="sb_h_double_arrow")
            self._set_resize_grip_visible(False)
        else:
            self.collapsed = False
            self.panel.configure(padx=9, pady=7)
            self.content.pack(fill="both", expand=True, pady=(7, 0))
            self.bar.configure(height=46)
            self.fold_button.configure(text="⌃")
            self.window.geometry(f"{self.expanded_width}x{self.expanded_height}+{x}+{y}")
            self.resize_grip.configure(cursor="bottom_right_corner")
            self._set_resize_grip_visible(True)
        self.window.update_idletasks()
        self._last_scale_size = (0, 0)
        self._apply_resize_scale()
        self.update_view()

    def _apply_alpha(self, value):
        percent = max(0, min(60, int(value)))
        alpha = max(.40, min(1.0, 1.0 - percent / 100.0))
        try:
            self.window.attributes("-alpha", alpha)
        except tk.TclError:
            pass

    def _draw_slider(self, _event=None):
        canvas = getattr(self, "transparency_canvas", None)
        if canvas is None:
            return
        try:
            canvas.delete("all")
            width = max(44, canvas.winfo_width())
            height = max(20, canvas.winfo_height())
            left, right = 8, width - 9
            y = height // 2
            ratio = self.transparency_var.get() / 60.0
            knob = left + (right - left) * ratio
            canvas.create_line(left, y, right, y, fill="#29435A", width=5, capstyle="round")
            canvas.create_line(left, y, knob, y, fill=CYAN, width=5, capstyle="round")
            canvas.create_oval(knob - 6, y - 6, knob + 6, y + 6, fill=CYAN,
                               outline=CYAN_BRIGHT, width=1)
        except tk.TclError:
            pass

    def _move_slider(self, event):
        canvas = self.transparency_canvas
        width = max(44, canvas.winfo_width())
        left, right = 8, width - 9
        ratio = (max(left, min(right, event.x)) - left) / max(1, right - left)
        value = int(round(ratio * 60))
        self.transparency_var.set(value)
        self.transparency_value.configure(text=f"{value}%")
        self._apply_alpha(value)
        self._draw_slider()
        self.app.timers[self.timer_id]["transparency"] = value

    def _save_slider(self, _event=None):
        self.app.timers[self.timer_id]["transparency"] = int(self.transparency_var.get())
        self.app._save()

    def _context_menu(self, event):
        menu = tk.Menu(self.window, tearoff=False, bg=PANEL_2, fg=TEXT,
                       activebackground=CYAN, activeforeground=DARK_TEXT)
        menu.add_command(label=self.app.t("Plegar / desplegar"), command=self.toggle_collapsed)
        menu.add_command(label=self.app.t("Mostrar Chronos"), command=self.app.show_main)
        if self.app.timers[self.timer_id]["state"] == "finished":
            menu.add_command(label=self.app.t("Detener alarma"), command=lambda: self.app.acknowledge_alarm(self.timer_id))
        menu.add_command(label=self.app.t("Ocultar reloj"), command=self.hide)
        menu.add_separator()
        menu.add_command(label=self.app.t("Eliminar temporizador…"), command=lambda: self.app.delete_timer(self.timer_id))
        menu.tk_popup(event.x_root, event.y_root)

    def update_view(self):
        try:
            if not self.window.winfo_exists():
                return
        except tk.TclError:
            return
        timer = self.app.timers.get(self.timer_id)
        if not timer:
            self.destroy()
            return
        remaining = self.app.remaining(timer)
        shown = fmt(remaining)
        self.window.title(timer["title"])
        available = max(1, self.bar_title.winfo_width())
        char_width = max(3.2, 6.2 * self._scale)
        if self.collapsed:
            title_limit = max(1, min(30, int(available / char_width)))
        else:
            title_limit = max(3, min(64, int(available / char_width)))
        self.bar_title.configure(text=truncate(timer["title"], title_limit))
        self.bar_time.configure(text=shown if self.collapsed else "")

        finished = timer["state"] == "finished" and not timer.get("alarm_acknowledged", False)
        if finished:
            blink = self.app.flash_phase
            bg = PINK if blink else PANEL_2
            fg = DARK_TEXT if blink else PINK
            self.outer.configure(bg=PINK if blink else CYAN)
            self.panel.configure(bg=bg)
            self.bar.configure(bg=bg)
            for widget in (self.bar_title, self.bar_time, self.fold_button, self.close_button):
                widget.configure(bg=bg)
            self.bar_title.configure(fg=fg)
            self.bar_time.configure(fg=fg)
            self.content.configure(bg=bg)
            self.note_label.configure(bg=bg, fg=fg)
            self.time_label.configure(bg=bg, fg=fg)
            self.status_label.configure(bg=bg, fg=fg, text=self.app.t("¡TIEMPO CUMPLIDO!"))
            self.stop_alarm_button.pack(fill="x", pady=(max(3, round(5 * self._scale)), 0))
            self.fold_button.configure(text="OK")
        else:
            self.outer.configure(bg=CYAN)
            self.panel.configure(bg=PANEL)
            self.bar.configure(bg=PANEL_2)
            self.bar_title.configure(bg=PANEL_2, fg=CYAN)
            self.bar_time.configure(bg=PANEL_2, fg=GREEN)
            self.fold_button.configure(bg=PANEL_2, fg=CYAN_BRIGHT, text="⌄" if self.collapsed else "⌃")
            self.close_button.configure(bg=PANEL_2, fg=MUTED)
            self.content.configure(bg=PANEL)
            self.note_label.configure(bg=PANEL, fg=MUTED)
            self.time_label.configure(bg=PANEL, fg=GREEN)
            self.status_label.configure(bg=PANEL, fg=CYAN)
            self.stop_alarm_button.pack_forget()

        if not self.collapsed:
            self.note_label.configure(text=truncate(timer.get("note", ""), 74) if timer.get("note") else "")
            self.time_label.configure(text=shown)
            self.pause_button.configure(
                text=self.app.t("REANUDAR") if timer["state"] == "paused" else self.app.t("PAUSAR"),
                state="disabled" if timer["state"] == "finished" else "normal")
            if timer["state"] == "paused":
                self.status_label.configure(text=self.app.t("EN PAUSA"), fg=MUTED)
            elif timer["state"] == "running":
                self.status_label.configure(text=self.app.t("EN MARCHA · SIEMPRE VISIBLE"), fg=CYAN)

    def show(self):
        try:
            # Ensure Tk never reattaches the floating timer to the dashboard.
            try:
                self.window.transient("")
            except tk.TclError:
                pass
            self.window.deiconify()
            self.window.lift()
            self.window.attributes("-topmost", True)
            self.update_view()
            self.window.after_idle(self._apply_no_taskbar_button)
        except tk.TclError:
            pass

    def hide(self):
        try:
            self.window.withdraw()
        except tk.TclError:
            pass

    def destroy(self):
        try:
            self.window.destroy()
        except tk.TclError:
            pass


class ChronosApp:
    def __init__(self, root: tk.Tk, instance_guard: SingleInstanceGuard | None = None):
        self.root = root
        self.instance_guard = instance_guard
        # Independent hidden native owner: dashboard minimize/withdraw has no
        # effect on the timers, while GW_OWNER still keeps them off the taskbar.
        self.timer_owner_hwnd = create_native_timer_owner()
        self.root.title(APP_NAME)
        self.root.configure(bg=BG)
        self.root.overrideredirect(True)
        screen_w, screen_h = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
        start_x = max(8, (screen_w - 470) // 2)
        start_y = max(8, (screen_h - 540) // 2)
        self.root.geometry(f"470x660+{start_x}+{max(8, (screen_h - 660) // 2)}")
        self.root.minsize(430, 590)
        try:
            self.root.iconbitmap(str(resource_path("chronos.ico")))
        except tk.TclError:
            pass

        self.path = data_file()
        self.history_path = history_file()
        self.settings_path = settings_file()
        self.language = self._load_language()
        self.sound_path = create_alarm_wav(alarm_file())
        self.timers: dict[str, dict] = {}
        self.history: list[dict] = []
        self.windows: dict[str, FloatingTimer] = {}
        self.alarm_events: set[str] = set()
        self.flash_phase = False
        self._cascade = 0
        self._last_refresh = 0
        self._save_after_id = None
        self._drag_x = self._drag_y = 0
        self._exiting = False
        self.tray_icon = None
        self.tray_ready = False
        self.tray_queue: queue.Queue[str] = queue.Queue()
        self.logo_photo = None
        self._build_main()
        self._load_history()
        self._load_timers()
        self._backfill_history_for_existing_timers()
        self.refresh_timer_list()
        self.refresh_history_list()
        self._start_tray()
        self.root.bind("<Control-n>", lambda _e: self.new_timer())
        self.root.bind("<Control-N>", lambda _e: self.new_timer())
        self.root.bind("<Control-o>", lambda _e: self.open_options())
        self.root.bind("<Control-O>", lambda _e: self.open_options())
        self.root.bind("<Escape>", lambda _e: self.hide_main_to_tray())
        self.root.bind("<Unmap>", self._on_main_unmap, add="+")
        self.root.protocol("WM_DELETE_WINDOW", self.hide_main_to_tray)
        self.root.after(100, self._poll_tray_queue)
        self.root.after(200, self._poll_activation_event)
        self.root.after(200, self.tick)
        self.root.report_callback_exception = self._report_callback_exception

    def _load_language(self):
        try:
            data = json.loads(self.settings_path.read_text(encoding="utf-8"))
            if not isinstance(data, dict):
                return "es"
            language = str(data.get("language", "es")).lower()
            return language if language in ("es", "en") else "es"
        except (OSError, ValueError, TypeError, json.JSONDecodeError):
            return "es"

    def _save_settings(self):
        try:
            self.settings_path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.settings_path.with_suffix(".tmp")
            temp.write_text(json.dumps({"language": self.language}, ensure_ascii=False, indent=2), encoding="utf-8")
            temp.replace(self.settings_path)
        except OSError as exc:
            log_runtime(f"No se pudo guardar la configuración: {exc!r}")

    def t(self, text):
        """Translate a fixed UI string to the selected language; user data stays untouched."""
        if self.language == "en":
            return TRANSLATIONS["en"].get(text, text)
        return text

    def change_language(self, language):
        language = str(language).lower()
        if language not in ("es", "en") or language == self.language:
            self._save_settings()
            return
        current_tab = getattr(self, "_current_tab", "active")
        layouts = {}
        for timer_id, floating in list(self.windows.items()):
            timer = self.timers.get(timer_id)
            if timer is None:
                continue
            try:
                visible = floating.window.state() != "withdrawn"
                if not floating.collapsed:
                    timer["window_size"] = [max(130, floating.window.winfo_width()),
                                            max(105, floating.window.winfo_height())]
                timer["position"] = f"+{floating.window.winfo_x()}+{floating.window.winfo_y()}"
                timer["collapsed_width"] = max(90, floating.collapsed_width)
                layouts[timer_id] = (floating.collapsed, visible)
                floating.destroy()
            except tk.TclError:
                layouts[timer_id] = (False, True)
        self.windows.clear()
        popup = getattr(self, "tray_context_window", None)
        if popup is not None:
            try:
                popup.destroy()
            except tk.TclError:
                pass
            self.tray_context_window = None
        self.language = language
        self._save_settings()
        # Rebuild only the visible dashboard and floating timer widgets. Timer
        # deadlines, history, alarms, positions, sizes and notes remain intact.
        for child in list(self.root.winfo_children()):
            try:
                child.destroy()
            except tk.TclError:
                pass
        self.logo_photo = None
        self._build_main()
        self.refresh_timer_list()
        self.refresh_history_list()
        self.show_tab(current_tab)
        for timer_id, (was_collapsed, was_visible) in layouts.items():
            if timer_id not in self.timers:
                continue
            self._open_window(timer_id)
            floating = self.windows.get(timer_id)
            if floating and was_collapsed:
                floating.toggle_collapsed()
            if floating and not was_visible:
                floating.hide()
        log_runtime(f"Idioma de interfaz cambiado a: {self.language}.")

    def _on_main_unmap(self, event=None):
        # If a native window-manager minimize happens, translate it to tray mode.
        if event is not None and event.widget is not self.root:
            return
        try:
            if self.root.state() == "iconic" and not self._exiting:
                self.root.after_idle(self.hide_main_to_tray)
        except tk.TclError:
            pass

    def _poll_activation_event(self):
        if self._exiting:
            return
        if self.instance_guard and self.instance_guard.consume_activation():
            self.show_main()
        self.root.after(200, self._poll_activation_event)

    def _report_callback_exception(self, exc, val, tb):
        import traceback
        traceback.print_exception(exc, val, tb)
        try:
            messagebox.showerror(APP_NAME, self.t("Ocurrió un error en Chronos:\n{error}").format(error=val), parent=self.root)
        except Exception:
            pass

    def _load_logo(self, size=42):
        if Image is None or ImageTk is None:
            return None
        try:
            img = Image.open(resource_path("chronos_icon.png")).convert("RGBA")
            img.thumbnail((size, size), Image.Resampling.LANCZOS)
            self.logo_photo = ImageTk.PhotoImage(img)
            return self.logo_photo
        except Exception:
            return None

    def _build_main(self):
        outer = tk.Frame(self.root, bg=CYAN, padx=1, pady=1)
        outer.pack(fill="both", expand=True)
        body = tk.Frame(outer, bg=PANEL, padx=16, pady=12)
        body.pack(fill="both", expand=True)

        header = tk.Frame(body, bg=PANEL, height=65)
        header.pack(fill="x")
        header.pack_propagate(False)
        logo = self._load_logo(48)
        if logo:
            icon = tk.Label(header, image=logo, bg=PANEL)
            icon.image = logo
            icon.pack(side="left", padx=(0, 9), pady=1)
        else:
            tk.Label(header, text="⌛", bg=PANEL, fg=GOLD, font=(FONT, 28)).pack(side="left", padx=(0, 9))
        heading = tk.Frame(header, bg=PANEL)
        heading.pack(side="left", fill="both", expand=True)
        tk.Label(heading, text="Chronos", bg=PANEL, fg=CYAN,
                 font=(FONT, 22, "bold"), anchor="w").pack(anchor="w", pady=(5, 0))
        tk.Label(heading, text=self.t("TU ALIADO PARA NO OLVIDAR NADA…"), bg=PANEL,
                 fg=MUTED, font=(FONT, 7, "bold"), anchor="w").pack(anchor="w")
        top_actions = tk.Frame(header, bg=PANEL)
        top_actions.pack(side="right", anchor="n")
        self._tiny_header_button(top_actions, "—", self.hide_main_to_tray).pack(side="left", padx=2)
        self._tiny_header_button(top_actions, "×", self.hide_main_to_tray).pack(side="left", padx=2)
        for widget in (header, heading):
            widget.bind("<ButtonPress-1>", self._main_drag_start)
            widget.bind("<B1-Motion>", self._main_drag_move)

        tk.Frame(body, bg=BORDER, height=1).pack(fill="x", pady=(4, 9))
        self._section_label(body, self.t("ACCIONES RÁPIDAS")).pack(anchor="w", pady=(0, 4))
        self.new_action = NeonButton(body, "+", self.t("Nuevo temporizador…"), self.new_timer,
                                     "Ctrl+N", accent=GREEN)
        self.new_action.pack(fill="x")
        NeonButton(body, "⚙", self.t("Opciones…"), self.open_options, "Ctrl+O", accent=CYAN).pack(fill="x")
        NeonButton(body, "◉", self.t("Mostrar todos los relojes"), self.show_all_timers,
                   accent=CYAN_BRIGHT).pack(fill="x")
        NeonButton(body, "◌", self.t("Ocultar todos los relojes"), self.hide_all_timers,
                   accent=MUTED).pack(fill="x")
        tk.Frame(body, bg=BORDER, height=1).pack(fill="x", pady=(8, 8))
        NeonButton(body, "ⓘ", self.t("Acerca de…"), self.about, accent=CYAN).pack(fill="x")
        NeonButton(body, "⏻", self.t("Salir"), self.exit_app, accent=PINK, danger=True).pack(fill="x")

        tk.Frame(body, bg=BORDER, height=1).pack(fill="x", pady=(9, 7))
        tabs = tk.Frame(body, bg=PANEL)
        tabs.pack(fill="x", pady=(0, 5))
        self.active_tab_button = tk.Button(
            tabs, text=self.t("TEMPORIZADORES"), command=lambda: self.show_tab("active"),
            bg=PANEL_2, fg=CYAN, activebackground=PANEL_HOVER, activeforeground=CYAN_BRIGHT,
            relief="flat", bd=0, font=(FONT, 8, "bold"), padx=10, pady=7, cursor="hand2")
        self.active_tab_button.pack(side="left", fill="x", expand=True, padx=(0, 3))
        self.history_tab_button = tk.Button(
            tabs, text=self.t("HISTORIAL"), command=lambda: self.show_tab("history"),
            bg=PANEL, fg=MUTED, activebackground=PANEL_HOVER, activeforeground=CYAN_BRIGHT,
            relief="flat", bd=0, font=(FONT, 8, "bold"), padx=10, pady=7, cursor="hand2")
        self.history_tab_button.pack(side="left", fill="x", expand=True, padx=(3, 0))

        self.pages = tk.Frame(body, bg=PANEL)
        self.pages.pack(fill="both", expand=True, pady=(2, 0))
        self.active_page = tk.Frame(self.pages, bg=PANEL)
        self.history_page = tk.Frame(self.pages, bg=PANEL)

        active_header = tk.Frame(self.active_page, bg=PANEL)
        active_header.pack(fill="x")
        self._section_label(active_header, self.t("TEMPORIZADORES ACTIVOS")).pack(side="left")
        self.timer_count = tk.Label(active_header, text="0", bg=PANEL, fg=GREEN,
                                    font=(DIGITS, 8, "bold"))
        self.timer_count.pack(side="right")
        active_box = tk.Frame(self.active_page, bg=PANEL)
        active_box.pack(fill="both", expand=True, pady=(5, 0))
        self.active_canvas = tk.Canvas(active_box, bg=PANEL, highlightthickness=0, bd=0)
        self.active_scrollbar = tk.Scrollbar(
            active_box, orient="vertical", command=self.active_canvas.yview,
            bg=PANEL_2, troughcolor=PANEL, activebackground=CYAN, relief="flat")
        self.active_canvas.configure(yscrollcommand=self.active_scrollbar.set)
        self.active_scrollbar.pack(side="right", fill="y")
        self.active_canvas.pack(side="left", fill="both", expand=True)
        self.timer_list = tk.Frame(self.active_canvas, bg=PANEL)
        self._active_canvas_window = self.active_canvas.create_window(
            (0, 0), window=self.timer_list, anchor="nw")
        self.timer_list.bind("<Configure>", self._on_active_frame_configure)
        self.active_canvas.bind("<Configure>", self._on_active_canvas_configure)
        tk.Label(self.active_page, text=self.t("Doble clic en la barra de un reloj para plegar o desplegar."),
                 bg=PANEL, fg=MUTED, font=(FONT, 7, "italic")).pack(anchor="w", pady=(5, 0))

        history_header = tk.Frame(self.history_page, bg=PANEL)
        history_header.pack(fill="x")
        self._section_label(history_header, self.t("HISTORIAL DE CREACIÓN")).pack(side="left")
        self.history_count = tk.Label(history_header, text="0", bg=PANEL, fg=GREEN,
                                      font=(DIGITS, 8, "bold"))
        self.history_count.pack(side="right")
        history_actions = tk.Frame(self.history_page, bg=PANEL)
        history_actions.pack(fill="x", pady=(4, 5))
        tk.Label(history_actions, text=self.t("Fecha y hora local de creación"), bg=PANEL,
                 fg=MUTED, font=(FONT, 7, "italic")).pack(side="left")
        self.clear_history_button = tk.Button(
            history_actions, text=self.t("BORRAR TODO"), command=self.clear_history,
            bg="#351D2B", fg=PINK, activebackground="#55243A", activeforeground=TEXT,
            relief="flat", bd=0, font=(FONT, 7, "bold"), padx=8, pady=4, cursor="hand2")
        self.clear_history_button.pack(side="right")
        history_box = tk.Frame(self.history_page, bg=PANEL)
        history_box.pack(fill="both", expand=True)
        self.history_canvas = tk.Canvas(history_box, bg=PANEL, highlightthickness=0, bd=0)
        self.history_scrollbar = tk.Scrollbar(
            history_box, orient="vertical", command=self.history_canvas.yview,
            bg=PANEL_2, troughcolor=PANEL, activebackground=CYAN, relief="flat")
        self.history_canvas.configure(yscrollcommand=self.history_scrollbar.set)
        self.history_scrollbar.pack(side="right", fill="y")
        self.history_canvas.pack(side="left", fill="both", expand=True)
        self.history_list = tk.Frame(self.history_canvas, bg=PANEL)
        self._history_canvas_window = self.history_canvas.create_window(
            (0, 0), window=self.history_list, anchor="nw")
        self.history_list.bind("<Configure>", self._on_history_frame_configure)
        self.history_canvas.bind("<Configure>", self._on_history_canvas_configure)
        self.show_tab("active")
        self._bind_main_drag(body, ignore_children=True)

    @staticmethod
    def _section_label(parent, text):
        return tk.Label(parent, text=text, bg=PANEL, fg=CYAN_BRIGHT,
                        font=(FONT, 8, "bold"))

    @staticmethod
    def _tiny_header_button(parent, text, command):
        return tk.Button(parent, text=text, command=command, cursor="hand2",
                         bg=PANEL_2, fg=CYAN, activebackground=BORDER,
                         activeforeground=TEXT, relief="flat", bd=0,
                         width=2, font=(FONT, 11, "bold"))

    def _bind_main_drag(self, widget, ignore_children=False):
        if isinstance(widget, (tk.Button, tk.Entry, tk.Text, tk.Spinbox)):
            return
        widget.bind("<ButtonPress-1>", self._main_drag_start, add="+")
        widget.bind("<B1-Motion>", self._main_drag_move, add="+")
        if ignore_children:
            for child in widget.winfo_children():
                self._bind_main_drag(child, ignore_children=True)

    def _main_drag_start(self, event):
        self._drag_x = event.x_root - self.root.winfo_x()
        self._drag_y = event.y_root - self.root.winfo_y()

    def _main_drag_move(self, event):
        self.root.geometry(f"+{event.x_root - self._drag_x}+{event.y_root - self._drag_y}")

    def _start_tray(self):
        """Start the native Windows notification-area icon via Shell_NotifyIconW."""
        if os.name != "nt":
            self.tray_ready = False
            self._tray_error = "La bandeja nativa solo está disponible en Windows."
            log_runtime(self._tray_error)
            return
        try:
            icon_path = resource_path("chronos.ico")
            if not icon_path.exists():
                raise FileNotFoundError(f"No se encontró el icono: {icon_path}")
            self.tray_icon = NativeWindowsTray(
                icon_path=icon_path,
                on_action=self._queue_tray,
                on_ready=lambda: self._queue_tray("ready"),
                on_error=lambda error: self._queue_tray("tray_error:" + str(error)),
            )
            self.tray_icon.start()
            log_runtime("Inicio del hilo de bandeja nativa solicitado.")
        except Exception as exc:
            self.tray_icon = None
            self.tray_ready = False
            self._tray_error = str(exc)
            log_runtime(f"No se pudo iniciar la bandeja nativa: {exc!r}")

    def _queue_tray(self, action: str):
        # Called by the native Win32 tray thread. Never access Tkinter from here.
        try:
            self.tray_queue.put_nowait(action)
        except Exception:
            pass

    def _poll_tray_queue(self):
        if self._exiting:
            return
        while True:
            try:
                action = self.tray_queue.get_nowait()
            except queue.Empty:
                break
            if action == "ready":
                self.tray_ready = True
                self._tray_error = None
                log_runtime("Chronos confirmó la bandeja del sistema.")
            elif action.startswith("tray_error:"):
                self.tray_ready = False
                self._tray_error = action.split(":", 1)[1]
                log_runtime(f"La bandeja informó un error: {self._tray_error}")
            elif action == "show":
                self.show_main()
            elif action == "new":
                self.new_timer()
            elif action == "show_all":
                self.show_all_timers()
            elif action == "hide_all":
                self.hide_all_timers()
            elif action == "options":
                self.open_options()
            elif action == "about":
                self.about()
            elif action == "exit":
                self.exit_app()
            elif action.startswith("tray_menu:"):
                try:
                    _, x_text, y_text = action.split(":", 2)
                    self.show_tray_context_menu(int(x_text), int(y_text))
                except (TypeError, ValueError):
                    log_runtime(f"Coordenadas inválidas para menú de bandeja: {action!r}")
        self.root.after(100, self._poll_tray_queue)

    def hide_main_to_tray(self):
        if self._exiting:
            return
        if not self.tray_ready:
            error = getattr(self, "_tray_error", self.t("El icono de Chronos todavía no confirmó su inicio."))
            messagebox.showwarning(
                APP_NAME,
                self.t("No voy a ocultar la ventana porque Windows todavía no confirmó que el icono de bandeja esté activo.\n\nDetalle: {error}\n\nLa ventana queda abierta para que no tengas que finalizar el proceso.").format(error=error),
                parent=self.root,
            )
            self.show_main()
            return
        try:
            # Only hide the dashboard while the native Shell_NotifyIcon entry is active.
            if not self.tray_icon or not self.tray_icon.ensure_visible():
                raise RuntimeError("Windows no confirma que el icono de Chronos siga registrado.")
        except Exception as exc:
            self.tray_ready = False
            self._tray_error = str(exc)
            log_runtime(f"No se pudo confirmar visibilidad de bandeja: {exc!r}")
            self.show_main()
            messagebox.showwarning(APP_NAME, self.t("No se pudo activar el icono de bandeja.\n\n{error}").format(error=exc), parent=self.root)
            return
        self.root.withdraw()

    def show_main(self):
        if self._exiting:
            return
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def next_floating_geometry(self):
        self._cascade = (self._cascade + 1) % 9
        # Place floating clocks to the left of the dashboard, like the reference layout.
        x = max(8, self.root.winfo_rootx() - 375 + (self._cascade % 4) * 18)
        y = max(8, self.root.winfo_rooty() + 75 + (self._cascade // 4) * 18)
        return f"350x280+{x}+{y}"

    def _load_history(self):
        self.history = []
        if not self.history_path.exists():
            return
        try:
            raw = json.loads(self.history_path.read_text(encoding="utf-8"))
            if not isinstance(raw, list):
                return
            for item in raw:
                if not isinstance(item, dict) or not item.get("id"):
                    continue
                self.history.append({
                    "id": str(item["id"]),
                    "title": str(item.get("title") or "Recordatorio"),
                    "created_at": item.get("created_at"),
                    "note": str(item.get("note") or ""),
                    "duration": max(1, int(item.get("duration", 1))),
                    "created_at": item.get("created_at"),
                    "status": str(item.get("status") or "Creado"),
                    "finished_at": item.get("finished_at"),
                    "deleted_at": item.get("deleted_at"),
                })
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            log_runtime(f"No se pudo cargar el historial: {exc!r}")
            messagebox.showwarning(APP_NAME, self.t("No se pudo cargar el historial:\n{error}").format(error=exc), parent=self.root)

    def _save_history(self):
        try:
            self.history_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = self.history_path.with_suffix(".tmp")
            temp_path.write_text(json.dumps(self.history, ensure_ascii=False, indent=2), encoding="utf-8")
            temp_path.replace(self.history_path)
        except OSError as exc:
            log_runtime(f"No se pudo guardar el historial: {exc!r}")
            messagebox.showerror(APP_NAME, self.t("No se pudo guardar el historial:\n{error}").format(error=exc), parent=self.root)

    def _history_record_created(self, timer):
        self.history.insert(0, {
            "id": timer["id"],
            "title": timer["title"],
            "note": timer.get("note", ""),
            "duration": int(timer.get("duration", 1)),
            "created_at": timer.get("created_at", time.time()),
            "status": "En curso",
            "finished_at": None,
            "deleted_at": None,
        })
        self._save_history()

    def _update_history_record(self, timer_id, status=None, finished_at=None, deleted_at=None):
        for entry in self.history:
            if entry.get("id") == timer_id:
                if status is not None:
                    entry["status"] = status
                if finished_at is not None:
                    entry["finished_at"] = finished_at
                if deleted_at is not None:
                    entry["deleted_at"] = deleted_at
                self._save_history()
                self.refresh_history_list()
                return

    def _backfill_history_for_existing_timers(self):
        known = {entry.get("id") for entry in self.history}
        added = False
        for timer_id, timer in self.timers.items():
            if timer_id in known:
                continue
            state = timer.get("state", "paused")
            status = {"running": "En curso", "paused": "En pausa", "finished": "Finalizado"}.get(state, "Creado")
            self.history.insert(0, {
                "id": timer_id,
                "title": timer.get("title", "Recordatorio"),
                "note": timer.get("note", ""),
                "duration": int(timer.get("duration", 1)),
                "created_at": timer.get("created_at"),
                "status": status,
                "finished_at": None,
                "deleted_at": None,
            })
            added = True
        if added:
            self._save_history()

    def _on_active_frame_configure(self, _event=None):
        try:
            self.active_canvas.configure(scrollregion=self.active_canvas.bbox("all"))
        except tk.TclError:
            pass

    def _on_active_canvas_configure(self, event):
        try:
            self.active_canvas.itemconfigure(self._active_canvas_window, width=event.width)
        except tk.TclError:
            pass

    def _on_history_frame_configure(self, _event=None):
        try:
            self.history_canvas.configure(scrollregion=self.history_canvas.bbox("all"))
        except tk.TclError:
            pass

    def _on_history_canvas_configure(self, event):
        try:
            self.history_canvas.itemconfigure(self._history_canvas_window, width=event.width)
        except tk.TclError:
            pass

    def show_tab(self, tab):
        self._current_tab = "history" if tab == "history" else "active"
        if tab == "history":
            self.active_page.pack_forget()
            self.history_page.pack(fill="both", expand=True)
            self.history_tab_button.configure(bg=PANEL_2, fg=CYAN)
            self.active_tab_button.configure(bg=PANEL, fg=MUTED)
            self.refresh_history_list()
        else:
            self.history_page.pack_forget()
            self.active_page.pack(fill="both", expand=True)
            self.active_tab_button.configure(bg=PANEL_2, fg=CYAN)
            self.history_tab_button.configure(bg=PANEL, fg=MUTED)
            self.refresh_timer_list()

    def delete_history_entry(self, entry_id):
        entry = next((x for x in self.history if x.get("id") == entry_id), None)
        if not entry:
            return
        if not messagebox.askyesno(APP_NAME, self.t("¿Eliminar del historial '{title}'?").format(title=entry.get("title", self.t("Recordatorio"))), parent=self.root):
            return
        self.history = [x for x in self.history if x.get("id") != entry_id]
        self._save_history()
        self.refresh_history_list()

    def clear_history(self):
        if not self.history:
            return
        if not messagebox.askyesno(APP_NAME, self.t("¿Eliminar todos los registros del historial?\n\nEsta acción no elimina los temporizadores activos."), parent=self.root):
            return
        self.history.clear()
        self._save_history()
        self.refresh_history_list()

    def refresh_history_list(self):
        if not hasattr(self, "history_list"):
            return
        for child in self.history_list.winfo_children():
            child.destroy()
        self.history_count.configure(text=str(len(self.history)))
        self.clear_history_button.configure(state="normal" if self.history else "disabled")
        if not self.history:
            tk.Label(self.history_list, text=self.t("Todavía no hay registros.\nLos temporizadores nuevos aparecerán aquí."),
                     bg=PANEL, fg=MUTED, font=(FONT, 9), justify="center").pack(fill="x", pady=14)
            self.history_canvas.yview_moveto(0)
            return
        for entry in self.history:
            row = tk.Frame(self.history_list, bg=PANEL_2, padx=7, pady=5)
            row.pack(fill="x", pady=2)
            details = tk.Frame(row, bg=PANEL_2)
            details.pack(side="left", fill="x", expand=True)
            tk.Label(details, text=truncate(entry.get("title", self.t("Recordatorio")), 28),
                     bg=PANEL_2, fg=TEXT, font=(FONT, 8, "bold"), anchor="w").pack(fill="x")
            created = self.t(format_local_datetime(entry.get("created_at")))
            status = self.t(entry.get("status", "Creado"))
            status_color = PINK if status in ("Eliminado", "Finalizado") else GREEN
            tk.Label(details, text=f"{created}  ·  {status}", bg=PANEL_2, fg=status_color,
                     font=(FONT, 7), anchor="w").pack(fill="x", pady=(2, 0))
            delete = tk.Label(row, text="×", bg=PANEL_2, fg=PINK, cursor="hand2",
                              font=(FONT, 15, "bold"), padx=7)
            delete.pack(side="right")
            delete.bind("<Button-1>", lambda _e, eid=entry["id"]: self.delete_history_entry(eid))

    def show_tray_context_menu(self, screen_x, screen_y):
        """Display a fully themed Tk popup instead of the stock Windows menu."""
        if self._exiting:
            return
        existing = getattr(self, "tray_context_window", None)
        if existing is not None:
            try:
                existing.destroy()
            except tk.TclError:
                pass
        popup = tk.Toplevel(self.root)
        self.tray_context_window = popup
        popup.overrideredirect(True)
        popup.attributes("-topmost", True)
        popup.configure(bg=CYAN)
        outer = tk.Frame(popup, bg=CYAN, padx=1, pady=1, width=272, height=366)
        outer.pack(fill="both", expand=True)
        outer.pack_propagate(False)
        panel = tk.Frame(outer, bg=PANEL, padx=7, pady=7, width=270, height=364)
        panel.pack(fill="both", expand=True)
        panel.pack_propagate(False)
        head = tk.Frame(panel, bg=PANEL_2, height=48, width=254)
        head.pack(fill="x", pady=(0, 5))
        head.pack_propagate(False)
        try:
            if Image is not None and ImageTk is not None:
                source = Image.open(resource_path("chronos_icon.png")).convert("RGBA")
                source.thumbnail((34, 34), Image.Resampling.LANCZOS)
                popup._chronos_logo = ImageTk.PhotoImage(source)
                tk.Label(head, image=popup._chronos_logo, bg=PANEL_2).pack(side="left", padx=(6, 8), pady=4)
        except Exception as exc:
            log_runtime(f"No se pudo cargar el icono del menú de bandeja: {exc!r}")
        title_box = tk.Frame(head, bg=PANEL_2)
        title_box.pack(side="left", fill="both", expand=True)
        tk.Label(title_box, text="CHRONOS", bg=PANEL_2, fg=CYAN,
                 font=(FONT, 10, "bold"), anchor="w").pack(anchor="w", pady=(7, 0))
        tk.Label(title_box, text=self.t("WDS657  ·  CONTROL"), bg=PANEL_2, fg=MUTED,
                 font=(FONT, 7, "bold"), anchor="w").pack(anchor="w")

        entries = [
            ("⌂", self.t("Abrir Chronos"), "show", CYAN),
            ("+", self.t("Nuevo temporizador…"), "new", GREEN),
            (None, None, None, None),
            ("◉", self.t("Mostrar todos los relojes"), "show_all", CYAN_BRIGHT),
            ("◌", self.t("Ocultar todos los relojes"), "hide_all", MUTED),
            (None, None, None, None),
            ("⚙", self.t("Opciones…"), "options", CYAN),
            ("ⓘ", self.t("Acerca de Chronos"), "about", CYAN),
            (None, None, None, None),
            ("⏻", self.t("Salir"), "exit", PINK),
        ]
        def close_popup():
            try:
                if popup.winfo_exists():
                    popup.destroy()
            except tk.TclError:
                pass
            self.tray_context_window = None

        for glyph, label, action, accent in entries:
            if glyph is None:
                tk.Frame(panel, bg=BORDER, height=1).pack(fill="x", pady=4)
                continue
            row = tk.Frame(panel, bg=PANEL, height=36, width=254, cursor="hand2")
            row.pack(fill="x")
            row.pack_propagate(False)
            icon_label = tk.Label(row, text=glyph, bg=PANEL, fg=accent,
                                  width=3, font=(FONT, 13, "bold"))
            icon_label.pack(side="left", fill="y", padx=(3, 6))
            text_label = tk.Label(row, text=label, bg=PANEL, fg=TEXT,
                                  font=(FONT, 9), anchor="w")
            text_label.pack(side="left", fill="both", expand=True, padx=(0, 7))
            def enter(_event, widgets=(row, icon_label, text_label), label_widget=text_label):
                for widget in widgets:
                    widget.configure(bg=PANEL_HOVER)
                label_widget.configure(fg=CYAN_BRIGHT)
            def leave(_event, widgets=(row, icon_label, text_label), label_widget=text_label):
                for widget in widgets:
                    widget.configure(bg=PANEL)
                label_widget.configure(fg=TEXT)
            def invoke(_event=None, selected=action):
                close_popup()
                self.root.after(40, lambda: self._dispatch_tray_action(selected))
            for widget in (row, icon_label, text_label):
                widget.bind("<Enter>", enter)
                widget.bind("<Leave>", leave)
                widget.bind("<Button-1>", invoke)
        popup.bind("<Escape>", lambda _e: close_popup())
        popup.bind("<FocusOut>", lambda _e: popup.after(120, close_popup) if popup.winfo_exists() else None)
        popup.update_idletasks()
        width = max(272, popup.winfo_reqwidth())
        height = max(366, popup.winfo_reqheight())
        sw, sh = popup.winfo_screenwidth(), popup.winfo_screenheight()
        x = max(4, min(int(screen_x) - width + 16, sw - width - 4))
        y = int(screen_y) - height - 8
        if y < 4:
            y = min(sh - height - 4, int(screen_y) + 8)
        popup.geometry(f"{width}x{height}+{x}+{max(4, y)}")
        popup.focus_force()

    def _dispatch_tray_action(self, action):
        mapping = {
            "show": self.show_main,
            "new": self.new_timer,
            "show_all": self.show_all_timers,
            "hide_all": self.hide_all_timers,
            "options": self.open_options,
            "about": self.about,
            "exit": self.exit_app,
        }
        callback = mapping.get(action)
        if callback:
            callback()

    def _load_timers(self):
        if not self.path.exists():
            return
        try:
            raw = json.loads(self.path.read_text(encoding="utf-8"))
            if not isinstance(raw, list):
                return
            for item in raw:
                if not isinstance(item, dict) or not item.get("id"):
                    continue
                timer = {
                    "id": str(item["id"]),
                    "title": str(item.get("title") or "Recordatorio"),
                    "note": str(item.get("note") or ""),
                    "duration": max(1, int(item.get("duration", 300))),
                    "deadline": float(item.get("deadline", 0)),
                    "remaining": max(0.0, float(item.get("remaining", 0))),
                    "state": item.get("state") if item.get("state") in {"running", "paused", "finished"} else "paused",
                    "sound": bool(item.get("sound", True)),
                    "transparency": max(0, min(60, int(item.get("transparency", 15)))),
                    "alarm_acknowledged": bool(item.get("alarm_acknowledged", True)),
                    "position": item.get("position"),
                    "window_size": item.get("window_size", [350, 280]),
                    "collapsed_width": max(90, min(900, int(item.get("collapsed_width", 220)))),
                }
                self.timers[timer["id"]] = timer
        except (OSError, ValueError, TypeError, json.JSONDecodeError) as exc:
            messagebox.showwarning(APP_NAME, self.t("No se pudieron recuperar los temporizadores guardados:\n{error}").format(error=exc), parent=self.root)
            return
        for timer_id in list(self.timers):
            self._open_window(timer_id)

    def _save(self):
        try:
            self.path.write_text(json.dumps(list(self.timers.values()), ensure_ascii=False, indent=2), encoding="utf-8")
        except OSError as exc:
            messagebox.showerror(APP_NAME, self.t("No se pudieron guardar los temporizadores:\n{error}").format(error=exc), parent=self.root)

    def _save_debounced(self):
        if self._save_after_id:
            try:
                self.root.after_cancel(self._save_after_id)
            except tk.TclError:
                pass
        self._save_after_id = self.root.after(600, self._save)

    def new_timer(self):
        self.show_main()
        dialog = NewTimerDialog(self)
        self.root.wait_window(dialog.window)
        if not dialog.result:
            return
        data = dialog.result
        timer_id = uuid.uuid4().hex[:12]
        created_at = time.time()
        self.timers[timer_id] = {
            "id": timer_id,
            "title": data["title"],
            "created_at": created_at,
            "note": data["note"],
            "duration": data["duration"],
            "deadline": time.time() + data["duration"],
            "remaining": float(data["duration"]),
            "state": "running",
            "sound": data["sound"],
            "transparency": 15,
            "alarm_acknowledged": True,
            "position": None,
            "window_size": [350, 280],
            "collapsed_width": 220,
        }
        self._history_record_created(self.timers[timer_id])
        self._open_window(timer_id)
        self._save()
        self.refresh_timer_list()

    def test_sound(self):
        try:
            play_wav(self.sound_path, loop=False)
        except (OSError, RuntimeError) as exc:
            try:
                if winsound:
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                else:
                    self.root.bell()
            except Exception:
                pass
            messagebox.showerror(APP_NAME, self.t("No se pudo reproducir el sonido de prueba:\n{error}").format(error=exc), parent=self.root)

    def _open_window(self, timer_id):
        if timer_id not in self.timers:
            return
        existing = self.windows.get(timer_id)
        if existing:
            existing.show()
        else:
            self.windows[timer_id] = FloatingTimer(self, timer_id)
        timer = self.timers[timer_id]
        if timer["state"] == "finished" and timer["sound"] and not timer["alarm_acknowledged"]:
            self._start_alarm(timer_id)

    def remaining(self, timer):
        if timer["state"] == "running":
            return max(0.0, timer["deadline"] - time.time())
        if timer["state"] == "paused":
            return max(0.0, timer["remaining"])
        return 0.0

    def tick(self):
        now = time.time()
        self.flash_phase = not self.flash_phase
        changed = False
        for timer_id, timer in list(self.timers.items()):
            if timer["state"] == "running" and now >= timer["deadline"]:
                timer["state"] = "finished"
                timer["remaining"] = 0.0
                timer["alarm_acknowledged"] = False
                changed = True
                self._update_history_record(timer_id, status="Finalizado", finished_at=now)
                self._open_window(timer_id)  # Reappears even if hidden with its X.
                if timer["sound"]:
                    self._start_alarm(timer_id)
            if timer["state"] == "finished" and timer["sound"] and not timer["alarm_acknowledged"]:
                self._start_alarm(timer_id)
            window = self.windows.get(timer_id)
            if window:
                try:
                    window.update_view()
                except tk.TclError:
                    pass
        if changed:
            self._save()
        if int(now) != self._last_refresh:
            self.refresh_timer_list()
            self._last_refresh = int(now)
        if not self._exiting:
            self.root.after(250, self.tick)

    def _start_alarm(self, timer_id):
        before = bool(self.alarm_events)
        self.alarm_events.add(timer_id)
        if before:
            return
        try:
            play_wav(self.sound_path, loop=True)
        except (OSError, RuntimeError) as exc:
            try:
                if winsound:
                    winsound.MessageBeep(winsound.MB_ICONEXCLAMATION)
                else:
                    self.root.bell()
            except Exception:
                pass
            # Keep visual flashing. The user can see the reason in the dashboard.
            self._last_alarm_error = str(exc)

    def _stop_alarm(self, timer_id):
        self.alarm_events.discard(timer_id)
        if not self.alarm_events:
            stop_wav()

    def acknowledge_alarm(self, timer_id):
        timer = self.timers.get(timer_id)
        if not timer:
            return
        self._stop_alarm(timer_id)
        timer["alarm_acknowledged"] = True
        self._update_history_record(timer_id, status="Finalizado")
        self._save()
        if timer_id in self.windows:
            self.windows[timer_id].update_view()
        self.refresh_timer_list()

    def toggle_pause(self, timer_id):
        timer = self.timers.get(timer_id)
        if not timer or timer["state"] == "finished":
            return
        if timer["state"] == "running":
            timer["remaining"] = max(0.0, timer["deadline"] - time.time())
            timer["state"] = "paused"
        else:
            timer["deadline"] = time.time() + timer["remaining"]
            timer["state"] = "running"
        self._update_history_record(timer_id, status="En pausa" if timer["state"] == "paused" else "En curso")
        self._save()
        self.refresh_timer_list()

    def add_minute(self, timer_id):
        timer = self.timers.get(timer_id)
        if not timer:
            return
        if timer["state"] == "running":
            timer["deadline"] += 60
        elif timer["state"] == "paused":
            timer["remaining"] += 60
        else:
            self._stop_alarm(timer_id)
            timer["state"] = "running"
            timer["deadline"] = time.time() + 60
            timer["remaining"] = 60
            timer["alarm_acknowledged"] = True
        self._update_history_record(
            timer_id, status="En pausa" if timer["state"] == "paused" else "En curso")
        self._save()
        self.refresh_timer_list()

    def reset_timer(self, timer_id):
        timer = self.timers.get(timer_id)
        if not timer:
            return
        self._stop_alarm(timer_id)
        timer["state"] = "running"
        timer["remaining"] = float(timer["duration"])
        timer["deadline"] = time.time() + timer["duration"]
        timer["alarm_acknowledged"] = True
        self._update_history_record(timer_id, status="En curso")
        self._save()
        self.refresh_timer_list()

    def show_all_timers(self):
        for timer_id in list(self.timers):
            self._open_window(timer_id)

    def hide_all_timers(self):
        for window in self.windows.values():
            window.hide()

    def show_timer(self, timer_id):
        self._open_window(timer_id)

    def delete_timer(self, timer_id):
        timer = self.timers.get(timer_id)
        if not timer:
            return
        self.show_main()
        if not messagebox.askyesno(APP_NAME, self.t("¿Eliminar el temporizador '{title}'?").format(title=timer['title']), parent=self.root):
            return
        self._stop_alarm(timer_id)
        self._update_history_record(timer_id, status="Eliminado", deleted_at=time.time())
        window = self.windows.pop(timer_id, None)
        if window:
            window.destroy()
        self.timers.pop(timer_id, None)
        self._save()
        self.refresh_timer_list()

    def refresh_timer_list(self):
        if not hasattr(self, "timer_list"):
            return
        for child in self.timer_list.winfo_children():
            child.destroy()
        self.timer_count.configure(text=str(len(self.timers)))
        if not self.timers:
            tk.Label(self.timer_list, text=self.t("Todavía no hay temporizadores.\nCreá uno con Ctrl+N."),
                     bg=PANEL, fg=MUTED, font=(FONT, 9), justify="center").pack(fill="x", pady=9)
            return
        for timer_id, timer in list(self.timers.items()):
            row = tk.Frame(self.timer_list, bg=PANEL_2, padx=8, pady=5)
            row.pack(fill="x", pady=2)
            tk.Label(row, text=truncate(timer["title"], 21), bg=PANEL_2, fg=TEXT,
                     font=(FONT, 9, "bold"), anchor="w").pack(side="left", fill="x", expand=True)
            color = PINK if timer["state"] == "finished" and not timer["alarm_acknowledged"] else GREEN
            tk.Label(row, text=fmt(self.remaining(timer)), bg=PANEL_2, fg=color,
                     font=(DIGITS, 10, "bold")).pack(side="left", padx=8)
            delete = tk.Label(row, text="×", bg=PANEL_2, fg=PINK, cursor="hand2",
                              font=(FONT, 15, "bold"), padx=5)
            delete.pack(side="right")
            delete.bind("<Button-1>", lambda _e, tid=timer_id: self.delete_timer(tid))
            btn = tk.Label(row, text=self.t("ABRIR"), bg=PANEL_2, fg=CYAN, cursor="hand2",
                           font=(FONT, 7, "bold"))
            btn.pack(side="right", padx=(7, 0))
            btn.bind("<Button-1>", lambda _e, tid=timer_id: self.show_timer(tid))
            row.bind("<Double-Button-1>", lambda _e, tid=timer_id: self.show_timer(tid))
        try:
            self.active_canvas.configure(scrollregion=self.active_canvas.bbox("all"))
            self.active_canvas.yview_moveto(0)
        except tk.TclError:
            pass

    def open_options(self):
        self.show_main()
        dialog = tk.Toplevel(self.root)
        dialog.title(self.t("Opciones — Chronos"))
        dialog.configure(bg=BG)
        dialog.resizable(False, False)
        dialog.transient(self.root)
        try:
            dialog.iconbitmap(str(resource_path("chronos.ico")))
        except tk.TclError:
            pass
        wrap, body = rounded_panel(dialog, bg=PANEL, border=CYAN)
        wrap.pack(fill="both", expand=True, padx=1, pady=1)
        body.configure(padx=18, pady=16)
        tk.Label(body, text=self.t("OPCIONES"), bg=PANEL, fg=CYAN,
                 font=(FONT, 13, "bold")).pack(anchor="w")
        tk.Label(body, text=self.t("La alarma se repite hasta que la confirmes."), bg=PANEL,
                 fg=MUTED, font=(FONT, 9)).pack(anchor="w", pady=(5, 12))
        self._dialog_button(body, self.t("PROBAR SONIDO"), self.test_sound).pack(fill="x")
        tk.Label(body, text=self.t("El control de transparencia se ajusta individualmente en cada reloj."),
                 bg=PANEL, fg=MUTED, font=(FONT, 8), wraplength=290, justify="left").pack(anchor="w", pady=(11, 12))

        tk.Frame(body, bg=BORDER, height=1).pack(fill="x", pady=(3, 10))
        tk.Label(body, text=self.t("IDIOMA"), bg=PANEL, fg=CYAN_BRIGHT,
                 font=(FONT, 9, "bold")).pack(anchor="w", pady=(0, 7))
        language_var = tk.StringVar(value=self.language)
        choices = tk.Frame(body, bg=PANEL)
        choices.pack(fill="x")
        buttons = {}
        def select_language(code):
            language_var.set(code)
            for key, button in buttons.items():
                selected = key == code
                button.configure(bg=CYAN if selected else PANEL_2,
                                 fg=DARK_TEXT if selected else TEXT,
                                 highlightbackground=CYAN if selected else BORDER)
        for code, label in (("es", self.t("ESPAÑOL")), ("en", self.t("INGLÉS"))):
            button = tk.Button(choices, text=label, command=lambda c=code: select_language(c),
                               cursor="hand2", relief="flat", bd=0, padx=12, pady=8,
                               bg=PANEL_2, fg=TEXT, activebackground=CYAN,
                               activeforeground=DARK_TEXT, font=(FONT, 8, "bold"),
                               highlightthickness=1, highlightbackground=BORDER)
            button.pack(side="left", fill="x", expand=True, padx=(0, 5) if code == "es" else (5, 0))
            buttons[code] = button
        select_language(self.language)
        tk.Label(body, text=("El cambio se aplica al instante y se guarda para el próximo inicio." if self.language == "es"
                             else "The change applies immediately and is saved for the next launch."),
                 bg=PANEL, fg=MUTED, font=(FONT, 7), wraplength=290, justify="left").pack(anchor="w", pady=(7, 12))
        footer = tk.Frame(body, bg=PANEL)
        footer.pack(fill="x")
        self._dialog_button(footer, self.t("CERRAR"), dialog.destroy, secondary=True).pack(side="right")
        def apply_selected_language():
            selected = language_var.get()
            dialog.destroy()
            self.change_language(selected)
        self._dialog_button(footer, self.t("APLICAR IDIOMA"), apply_selected_language).pack(side="right", padx=(0, 7))
        dialog.update_idletasks()
        x = self.root.winfo_rootx() + (self.root.winfo_width() - dialog.winfo_width()) // 2
        y = self.root.winfo_rooty() + (self.root.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{max(20, x)}+{max(20, y)}")

    @staticmethod
    def _dialog_button(parent, text, command, secondary=False):
        return tk.Button(parent, text=text, command=command, cursor="hand2",
                         bg=PANEL_2 if secondary else CYAN, fg=TEXT if secondary else DARK_TEXT,
                         activebackground=BORDER if secondary else GREEN,
                         activeforeground=TEXT if secondary else DARK_TEXT,
                         relief="flat", bd=0, padx=12, pady=7, font=(FONT, 8, "bold"))

    def about(self):
        messagebox.showinfo(
            self.t("Acerca de Chronos"),
            f"Chronos {VERSION}\n\n{self.t('Temporizadores flotantes y recordatorios para Windows.')}\n\n"
            f"{self.t('Interfaz neón · Relojes redimensionables · Alarmas sonoras')}\n"
            f"{self.t('Los temporizadores se guardan localmente.')}\n\n"
            "WDS657",
            parent=self.root,
        )

    def exit_app(self):
        if self._exiting:
            return
        self.show_main()
        if not messagebox.askyesno(
            APP_NAME,
            self.t("¿Salir completamente de Chronos?\n\nLos temporizadores no podrán sonar mientras la aplicación esté cerrada.\nLos datos quedan guardados y se recuperan al volver a abrirla."),
            parent=self.root,
        ):
            return
        self._exiting = True
        self._save()
        for timer_id in list(self.alarm_events):
            self._stop_alarm(timer_id)
        for window in list(self.windows.values()):
            window.destroy()
        destroy_native_timer_owner(getattr(self, "timer_owner_hwnd", None))
        self.timer_owner_hwnd = None
        if self.tray_icon is not None:
            try:
                self.tray_icon.stop()
            except Exception:
                pass
        try:
            self.root.destroy()
        except tk.TclError:
            pass


def main():
    guard = SingleInstanceGuard()
    try:
        primary = guard.acquire()
    except Exception as exc:
        log_runtime(f"No se pudo comprobar instancia única: {exc!r}")
        primary = True  # Fail open rather than preventing the user from launching.
    if not primary:
        activated = guard.activate_existing()
        log_runtime(f"Se detectó una segunda instancia; señal de activación enviada={activated}.")
        return

    try:
        root = tk.Tk()
        app = ChronosApp(root, guard)
        root.mainloop()
    finally:
        guard.close()


if __name__ == "__main__":
    main()
