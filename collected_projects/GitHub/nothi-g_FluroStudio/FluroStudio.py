#!/usr/bin/env python3
"""FluroStudio - a self-contained beat-making studio in one Python file.

Features
    - 16-step drum sequencer with synthesized KICK, SNARE, HI-HAT, OPEN HAT,
      CLAP and PERC, with per-step velocity
    - Piano roll (C3..C6) with SOFT, PLUCK, BASS, 808, KEYS and TOM
      instruments and variable note lengths
    - Four pattern banks (A-D) and a song mode arrangement of up to 64 bars
    - Audio file import (drag & drop), waveform display and microphone recording
    - Mixer with volume, pan, mute, solo per track plus a master fader
    - Swing, metronome, tap tempo, undo/redo, autosave, project save/load
    - One-click WAV export of the loop or the whole song
    - Dark and light themes, resizable window, all graphics drawn in code

Keyboard shortcuts
    SPACE            play / pause            S          stop
    LEFT / RIGHT     bpm -5 / +5             UP / DOWN  bpm -1 / +1
    SHIFT+LEFT/RIGHT swing -5 / +5           T          tap tempo
    M                metronome on/off        1..5       switch view
    CTRL+1..4        select bank A..D        CTRL+Z     undo
    CTRL+Y           redo                    CTRL+S     save project
    CTRL+O           load project            CTRL+E     export WAV
    R                restore autosave        SHIFT+drag velocity (drums) / note length (piano)

Run
    python FluroStudio.py                start the app
    python FluroStudio.py --selftest     run the built-in headless checks
    python FluroStudio.py --screenshot DIR   render each view to PNG files
    python FluroStudio.py --project FILE open a saved project
"""

import argparse
import base64
import json
import math
import os
import random
import sys
import threading
import time
import traceback
import wave
import zlib
from copy import deepcopy

import numpy as np
import pygame

IS_WEB = sys.platform in ('emscripten', 'wasm')

try:
    import tkinter as tk
    from tkinter import filedialog
    TK_AVAILABLE = True
except Exception:
    TK_AVAILABLE = False

try:
    import sounddevice as sd
    SOUNDDEVICE_AVAILABLE = True
except Exception:
    sd = None
    SOUNDDEVICE_AVAILABLE = False

VERSION = '2.1'
PROJECT_EXTENSION = '.fluro'
PROJECT_VERSION = 5

SAMPLE_RATE = 44100
LOGICAL_W = 1080
LOGICAL_H = 720

NUM_STEPS = 16
NUM_BANKS = 4
MIN_BPM = 40
MAX_BPM = 240
MAX_UNDO = 80
MAX_MIXER_STRIPS = 10
MAX_AUDIO_TRACKS = 5
SONG_MIN_BARS = 4
SONG_MAX_BARS = 64
AUTOSAVE_SECONDS = 180

DRUM_TRACKS = ['KICK', 'SNARE', 'HI-HAT', 'OPEN HAT', 'CLAP', 'PERC']
INSTRUMENTS = ['SOFT', 'PLUCK', 'BASS', '808', 'KEYS', 'TOM']
SUPPORTED_AUDIO_EXTENSIONS = ('.wav', '.mp3', '.ogg', '.flac')

NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# ---------------------------------------------------------------------------
# Themes
# ---------------------------------------------------------------------------

THEMES = {
    'dark': {
        'bg': (18, 18, 21),
        'panel': (26, 26, 30),
        'panel_alt': (22, 22, 26),
        'text': (232, 232, 235),
        'text_dim': (140, 140, 148),
        'text_faint': (102, 102, 110),
        'line': (48, 48, 55),
        'line_soft': (37, 37, 43),
        'accent': (100, 149, 237),
        'accent_dim': (70, 115, 190),
        'playhead': (120, 170, 250),
        'green': (62, 178, 102),
        'green_hover': (88, 205, 130),
        'red': (226, 86, 86),
        'purple': (100, 149, 237),
        'orange': (226, 148, 72),
        'clip': (66, 56, 40),
        'step_bg': (33, 33, 39),
        'step_hover': (48, 48, 56),
        'white_key': (215, 215, 220),
        'white_key_dim': (198, 198, 205),
        'black_key': (28, 28, 33),
        'button': (34, 34, 40),
        'button_hover': (46, 46, 54),
        'cell_light': (32, 32, 38),
        'cell_dark': (29, 29, 35),
    },
    'light': {
        'bg': (246, 246, 244),
        'panel': (252, 252, 250),
        'panel_alt': (240, 240, 237),
        'text': (40, 40, 44),
        'text_dim': (120, 120, 126),
        'text_faint': (158, 158, 164),
        'line': (82, 82, 88),
        'line_soft': (212, 212, 208),
        'accent': (45, 100, 200),
        'accent_dim': (70, 125, 215),
        'playhead': (60, 120, 210),
        'green': (52, 150, 84),
        'green_hover': (70, 175, 105),
        'red': (205, 70, 70),
        'purple': (45, 100, 200),
        'orange': (210, 135, 60),
        'clip': (242, 226, 202),
        'step_bg': (253, 253, 251),
        'step_hover': (228, 228, 224),
        'white_key': (249, 249, 246),
        'white_key_dim': (238, 238, 234),
        'black_key': (44, 44, 48),
        'button': (252, 252, 250),
        'button_hover': (232, 232, 228),
        'cell_light': (250, 250, 247),
        'cell_dark': (236, 236, 232),
    },
}

# Desaturated instrument hues: distinguishable at a glance without turning the
# piano roll into a rainbow.
INSTRUMENT_COLORS = {
    'SOFT': (126, 114, 178),
    'PLUCK': (84, 152, 116),
    'BASS': (192, 140, 92),
    '808': (182, 112, 128),
    'KEYS': (98, 134, 186),
    'TOM': (92, 152, 152),
}


def theme_colors(name):
    return THEMES.get(name, THEMES['dark'])


# ---------------------------------------------------------------------------
# Layout (logical 1080x720 canvas, scaled to the real window)
# ---------------------------------------------------------------------------

HEADER_H = 64
TRANSPORT_TOP = 64
TABS_TOP = 144
CONTENT_TOP = 204
FOOTER_TOP = LOGICAL_H - 60

PLAY_RECT = pygame.Rect(28, 86, 62, 40)
STOP_RECT = pygame.Rect(96, 86, 62, 40)
BPM_MINUS_RECT = pygame.Rect(178, 86, 28, 40)
BPM_RECT = pygame.Rect(210, 86, 60, 40)
BPM_PLUS_RECT = pygame.Rect(274, 86, 28, 40)
TAP_RECT = pygame.Rect(356, 86, 52, 40)
SWING_TRACK_RECT = pygame.Rect(432, 100, 116, 8)
METRO_RECT = pygame.Rect(610, 86, 72, 40)
BANK_RECTS = [pygame.Rect(700 + i * 40, 86, 34, 40) for i in range(NUM_BANKS)]
UNDO_RECT = pygame.Rect(872, 86, 58, 40)
REDO_RECT = pygame.Rect(940, 86, 58, 40)

THEME_RECT = pygame.Rect(660, 15, 64, 34)
EXPORT_RECT = pygame.Rect(732, 15, 74, 34)
SAVE_RECT = pygame.Rect(814, 15, 68, 34)
LOAD_RECT = pygame.Rect(890, 15, 68, 34)
CODE_RECT = pygame.Rect(966, 15, 76, 34)

SEQ_TAB_RECT = pygame.Rect(28, 154, 124, 36)
PIANO_TAB_RECT = pygame.Rect(160, 154, 128, 36)
AUDIO_TAB_RECT = pygame.Rect(296, 154, 84, 36)
SONG_TAB_RECT = pygame.Rect(388, 154, 84, 36)
MIXER_TAB_RECT = pygame.Rect(480, 154, 88, 36)
COPY_RECT = pygame.Rect(600, 154, 60, 36)
DEMO_RECT = pygame.Rect(668, 154, 60, 36)
CLEAR_RECT = pygame.Rect(736, 154, 60, 36)
KB_RECT = pygame.Rect(804, 154, 60, 36)
CAPTURE_RECT = pygame.Rect(872, 154, 60, 36)
OCT_RECT = pygame.Rect(940, 154, 58, 36)
EUCLID_RECT = pygame.Rect(804, 154, 64, 36)
VAR_RECT = pygame.Rect(876, 154, 56, 36)
RND_RECT = pygame.Rect(668, 622, 60, 30)
CHORD_RECT = pygame.Rect(20, 622, 100, 30)

# Beat-code modal
CODE_MODAL_RECT = pygame.Rect(240, 240, 600, 340)
CODE_CLOSE_RECT = pygame.Rect(800, 254, 26, 26)
CODE_COPY_RECT = pygame.Rect(724, 262, 68, 30)
CODE_TEXT_RECT = pygame.Rect(262, 306, 556, 118)
CODE_INPUT_RECT = pygame.Rect(262, 448, 456, 36)
CODE_LOAD_RECT = pygame.Rect(726, 448, 94, 36)

# Euclidean generator modal
EUCLID_MODAL_RECT = pygame.Rect(330, 240, 420, 340)
EUCLID_TRACK_RECTS = [pygame.Rect(352 + i * 64, 302, 60, 30) for i in range(len(DRUM_TRACKS))]
EUCLID_MINUS_P = pygame.Rect(400, 358, 34, 30)
EUCLID_VAL_P = pygame.Rect(440, 358, 70, 30)
EUCLID_PLUS_P = pygame.Rect(516, 358, 34, 30)
EUCLID_MINUS_R = pygame.Rect(400, 406, 34, 30)
EUCLID_VAL_R = pygame.Rect(440, 406, 70, 30)
EUCLID_PLUS_R = pygame.Rect(516, 406, 34, 30)
EUCLID_APPLY_RECT = pygame.Rect(352, 478, 160, 36)
EUCLID_CLOSE_RECT = pygame.Rect(532, 478, 160, 36)

# Sequencer view
SEQ_STEP_SIZE = 40
SEQ_STEP_GAP = 12
SEQ_START_X = 224
SEQ_TRACK_TOP = 228
SEQ_ROW_HEIGHT = 70

# Piano roll view
PIANO_KEY_X = 20
PIANO_KEY_W = 104
PIANO_GRID_X = 130
PIANO_STEP_W = 56
PIANO_GRID_TOP = 224
PIANO_ROW_H = 30
PIANO_VISIBLE_ROWS = 13
INSTRUMENT_BUTTON_Y = 622

# Audio view
MIC_PREV_RECT = pygame.Rect(28, 214, 32, 32)
MIC_DEVICE_RECT = pygame.Rect(66, 214, 430, 32)
MIC_NEXT_RECT = pygame.Rect(502, 214, 32, 32)
IMPORT_AUDIO_RECT = pygame.Rect(560, 214, 96, 32)
RECORD_AUDIO_RECT = pygame.Rect(676, 214, 112, 32)
AUDIO_TIMELINE_X = 214
AUDIO_TIMELINE_W = 842
AUDIO_TRACK_TOP = 276
AUDIO_TRACK_HEIGHT = 74

# Song view
SONG_TOGGLE_RECT = pygame.Rect(28, 212, 122, 30)
SONG_MINUS_RECT = pygame.Rect(196, 212, 30, 30)
SONG_LENGTH_RECT = pygame.Rect(230, 212, 56, 30)
SONG_PLUS_RECT = pygame.Rect(290, 212, 30, 30)
SONG_GRID_X = 88
SONG_GRID_RIGHT = 1040
SONG_GRID_TOP = 276
SONG_BAR_H = 46

# Mixer view
MIXER_STRIP_W = 104
MIXER_X0 = 20
MIXER_TOP = 214
MIXER_STRIP_H = 428


def mixer_strip_geometry(index):
    x = MIXER_X0 + index * MIXER_STRIP_W
    return {
        'strip': pygame.Rect(x, MIXER_TOP, MIXER_STRIP_W - 8, MIXER_STRIP_H),
        'mute': pygame.Rect(x + 8, MIXER_TOP + 30, 38, 26),
        'solo': pygame.Rect(x + 54, MIXER_TOP + 30, 38, 26),
        'knobs': [pygame.Rect(x + 8, MIXER_TOP + 62, 26, 26),
                  pygame.Rect(x + 35, MIXER_TOP + 62, 26, 26),
                  pygame.Rect(x + 62, MIXER_TOP + 62, 26, 26)],
        'fader': pygame.Rect(x + 45, MIXER_TOP + 140, 14, 190),
        'pan': pygame.Rect(x + 14, MIXER_TOP + 356, 76, 8),
    }


# Keyboard-piano mapping: two FL-studio style rows covering two octaves.
KB_KEY_OFFSETS = {
    pygame.K_z: 0, pygame.K_s: 1, pygame.K_x: 2, pygame.K_d: 3, pygame.K_c: 4,
    pygame.K_v: 5, pygame.K_g: 6, pygame.K_b: 7, pygame.K_h: 8, pygame.K_n: 9,
    pygame.K_j: 10, pygame.K_m: 11, pygame.K_COMMA: 12, pygame.K_l: 13,
    pygame.K_PERIOD: 14, pygame.K_SEMICOLON: 15, pygame.K_SLASH: 16,
    pygame.K_q: 12, pygame.K_2: 13, pygame.K_w: 14, pygame.K_3: 15, pygame.K_e: 16,
    pygame.K_r: 17, pygame.K_5: 18, pygame.K_t: 19, pygame.K_6: 20, pygame.K_y: 21,
    pygame.K_7: 22, pygame.K_u: 23, pygame.K_i: 24, pygame.K_9: 25, pygame.K_o: 26,
    pygame.K_0: 27, pygame.K_p: 28,
}
KB_KEY_LABELS = {
    pygame.K_z: 'Z', pygame.K_s: 'S', pygame.K_x: 'X', pygame.K_d: 'D', pygame.K_c: 'C',
    pygame.K_v: 'V', pygame.K_g: 'G', pygame.K_b: 'B', pygame.K_h: 'H', pygame.K_n: 'N',
    pygame.K_j: 'J', pygame.K_m: 'M', pygame.K_COMMA: ',', pygame.K_l: 'L',
    pygame.K_PERIOD: '.', pygame.K_SEMICOLON: ';', pygame.K_SLASH: '/',
    pygame.K_q: 'Q', pygame.K_2: '2', pygame.K_w: 'W', pygame.K_3: '3', pygame.K_e: 'E',
    pygame.K_r: 'R', pygame.K_5: '5', pygame.K_t: 'T', pygame.K_6: '6', pygame.K_y: 'Y',
    pygame.K_7: '7', pygame.K_u: 'U', pygame.K_i: 'I', pygame.K_9: '9', pygame.K_o: 'O',
    pygame.K_0: '0', pygame.K_p: 'P',
}


# ---------------------------------------------------------------------------
# Music helpers
# ---------------------------------------------------------------------------

def note_to_midi(note):
    if '#' in note:
        name, octave = note[:2], int(note[2:])
    else:
        name, octave = note[0], int(note[1:])
    return 12 * (octave + 1) + NOTE_NAMES.index(name)


def note_frequency(note):
    return 440.0 * 2 ** ((note_to_midi(note) - 69) / 12)


def build_piano_notes(low='C3', high='C6'):
    notes = []
    for midi in range(note_to_midi(low), note_to_midi(high) + 1):
        notes.append(f'{NOTE_NAMES[midi % 12]}{midi // 12 - 1}')
    notes.reverse()
    return notes


PIANO_NOTES = build_piano_notes()
PIANO_NOTE_ROW = {note: index for index, note in enumerate(PIANO_NOTES)}


def clamp(value, low, high):
    return max(low, min(high, value))


def pan_to_lr(volume, pan):
    """Equal-ish pan law: pan -1..1 maps to left/right gain multipliers."""
    pan = clamp(float(pan), -1.0, 1.0)
    volume = clamp(float(volume), 0.0, 1.0)
    if pan < 0:
        return volume, volume * (1.0 + pan)
    return volume * (1.0 - pan), volume


def swing_gap_multiplier(step, swing_pct):
    """Time multiplier applied to the gap AFTER `step`.

    Odd 16ths are delayed by up to half a step, so a full bar keeps its length:
    8 * (1 + a) + 8 * (1 - a) == 16 for any swing amount a.
    """
    amount = clamp(float(swing_pct), 0.0, 100.0) / 100.0 * 0.5
    return 1.0 + amount if step % 2 == 0 else 1.0 - amount


def step_offsets(swing_pct, bpm=120.0):
    """Offset in seconds of each step inside one bar; bar length is invariant."""
    interval = 60.0 / bpm / 4
    offsets = []
    elapsed = 0.0
    for step in range(NUM_STEPS):
        offsets.append(elapsed)
        elapsed += interval * swing_gap_multiplier(step, swing_pct)
    return offsets


def track_is_audible(track, solo_active):
    if track.get('muted', False):
        return False
    if solo_active:
        return bool(track.get('solo', False))
    return True


def any_track_soloed(drum_mixer, melody_mixer, audio_tracks):
    if any(track.get('solo', False) for track in drum_mixer):
        return True
    if melody_mixer.get('solo', False):
        return True
    return any(track.get('solo', False) for track in audio_tracks)


# ---------------------------------------------------------------------------
# Beat codes: a whole project as one shareable text string
# ---------------------------------------------------------------------------

BEAT_CODE_PREFIX = 'FLRO-'
MINOR_PENTATONIC = (0, 3, 5, 7, 10)


def encode_beat_code(project):
    payload = json.dumps(project, separators=(',', ':')).encode('utf-8')
    return BEAT_CODE_PREFIX + base64.b85encode(zlib.compress(payload, 9)).decode('ascii')


def decode_beat_code(code):
    """Decode a beat code back into a project dict, or None if invalid."""
    if not isinstance(code, str):
        return None
    code = code.strip()
    if code.startswith(BEAT_CODE_PREFIX):
        code = code[len(BEAT_CODE_PREFIX):]
    code = ''.join(code.split())
    if not code:
        return None
    try:
        payload = zlib.decompress(base64.b85decode(code))
        project = json.loads(payload.decode('utf-8'))
    except Exception:
        return None
    return project if isinstance(project, dict) else None


# ---------------------------------------------------------------------------
# Generative tools
# ---------------------------------------------------------------------------

def euclidean_pattern(pulses, steps, rotate=0):
    """Bjorklund rhythm: evenly spread `pulses` across `steps`, rotated.

    Uses the modular form - a step hits when (step * pulses) % steps < pulses -
    which yields the canonical phase starting with a hit on step 0.
    """
    steps = max(1, int(steps))
    pulses = clamp(int(pulses), 0, steps)
    pattern = [((step * pulses) % steps) < pulses for step in range(steps)]
    shift = rotate % steps if steps else 0
    if shift:
        pattern = pattern[-shift:] + pattern[:-shift]
    return pattern


def scale_note_rows(root_midi=57):
    """Row indices of the piano roll that belong to a minor-pentatonic scale."""
    rows = []
    for row, note in enumerate(PIANO_NOTES):
        midi = note_to_midi(note)
        if (midi - root_midi) % 12 in MINOR_PENTATONIC:
            rows.append(row)
    return rows


def randomize_melody_bank(bank, rng, instrument, root_midi=57):
    """Fill a bank with a fresh scale-locked melody in place."""
    allowed = scale_note_rows(root_midi)
    if not allowed:
        return
    for row in bank:
        for step in range(NUM_STEPS):
            row[step] = None
    for step in range(NUM_STEPS):
        density = 0.6 if step % 4 == 0 else (0.45 if step % 2 == 0 else 0.22)
        if rng.random() > density:
            continue
        row = rng.choice(allowed)
        length = 2 if rng.random() < 0.25 else 1
        bank[row][step] = (instrument, min(length, NUM_STEPS - step))


def vary_drum_bank(bank, velocities, rng):
    """Nudge a groove: sparse extra hats/perc, occasional ghost removal."""
    for track in (2, 3, 5):  # hats, open hat, perc
        for step in range(NUM_STEPS):
            if not bank[track][step] and rng.random() < 0.10:
                bank[track][step] = True
                velocities[track][step] = round(0.45 + rng.random() * 0.3, 2)
    for track in (0, 1):  # kick / snare barely touched
        for step in range(NUM_STEPS):
            if bank[track][step] and rng.random() < 0.05:
                bank[track][step] = False


def chord_intervals(kind):
    return {'min': (0, 3, 7), 'maj': (0, 4, 7)}.get(kind, ())


def place_chord(bank, row, step, kind, instrument):
    """Stack a triad upward from `row`; returns the rows that were set."""
    placed = []
    for interval in chord_intervals(kind):
        target = row - interval
        if 0 <= target < len(bank):
            bank[target][step] = (instrument, 1)
            placed.append(target)
    if not placed and 0 <= row < len(bank):
        bank[row][step] = (instrument, 1)
        placed.append(row)
    return placed


# ---------------------------------------------------------------------------
# Pattern model
# ---------------------------------------------------------------------------

def make_empty_drum_pattern():
    return [[False] * NUM_STEPS for _ in DRUM_TRACKS]


def make_default_velocities():
    return [[1.0] * NUM_STEPS for _ in DRUM_TRACKS]


def make_empty_melody_pattern():
    return [[None] * NUM_STEPS for _ in PIANO_NOTES]


def make_empty_banks():
    return [make_empty_drum_pattern() for _ in range(NUM_BANKS)]


def make_default_velocity_banks():
    return [make_default_velocities() for _ in range(NUM_BANKS)]


def make_empty_melody_banks():
    return [make_empty_melody_pattern() for _ in range(NUM_BANKS)]


def bank_is_empty(drum_bank, melody_bank):
    return not any(any(row) for row in drum_bank) and not any(any(row) for row in melody_bank)


def default_mixer_track(volume):
    return {'volume': volume, 'muted': False, 'solo': False, 'pan': 0.0,
            'fx_space': 0.0, 'fx_echo': 0.0, 'fx_tone': 1.0}


def default_master_fx():
    return {'space': 0.0, 'echo': 0.0, 'tone': 1.0}


def default_drum_mixer():
    volumes = [0.9, 0.8, 0.7, 0.65, 0.8, 0.6]
    return [default_mixer_track(volume) for volume in volumes]


def default_song_state():
    return {'enabled': False, 'length': 8, 'arrangement': [None] * 8}


def demo_pattern_data():
    """A ready-made groove so the app makes noise the moment it opens."""
    drums = [make_empty_drum_pattern() for _ in range(NUM_BANKS)]
    velocities = [make_default_velocities() for _ in range(NUM_BANKS)]
    for step in (0, 8, 10):
        drums[0][0][step] = True
    for step in (4, 12):
        drums[0][1][step] = True
        drums[0][4][step] = True
    for step in range(0, NUM_STEPS, 2):
        drums[0][2][step] = True
        velocities[0][2][step] = 0.9 if step % 4 == 0 else 0.6
    for step in (2, 10):
        drums[0][3][step] = True
        velocities[0][3][step] = 0.7
    drums[0][2][15] = True
    drums[0][5][7] = True
    for step in range(NUM_STEPS):
        drums[1][2][step] = True
        velocities[1][2][step] = 0.8 if step % 4 == 0 else 0.5
    for step in (0, 8, 10, 14):
        drums[1][0][step] = True
    for step in (4, 12):
        drums[1][1][step] = True
        drums[1][4][step] = True
    for step in (7, 15):
        drums[1][5][step] = True

    melody = make_empty_melody_banks()
    pluck_line = [(0, 'E4', 1), (2, 'C4', 1), (4, 'A3', 1), (6, 'C4', 1),
                  (8, 'F3', 1), (10, 'A3', 1), (12, 'C4', 1), (14, 'B3', 1)]
    key_chords = [(0, 'A3', 2), (0, 'C4', 2), (8, 'A3', 2), (8, 'C4', 2)]
    bass_line = [(6, 'A3', 1), (14, 'G3', 1)]
    for bank in (0, 1):
        for step, note, length in pluck_line:
            melody[bank][PIANO_NOTE_ROW[note]][step] = ('PLUCK', length)
        for step, note, length in key_chords:
            melody[bank][PIANO_NOTE_ROW[note]][step] = ('KEYS', length)
        for step, note, length in bass_line:
            melody[bank][PIANO_NOTE_ROW[note]][step] = ('BASS', length)
    return drums, velocities, melody


# ---------------------------------------------------------------------------
# Serialization helpers (pure, unit-testable)
# ---------------------------------------------------------------------------

def sanitize_drum_banks(raw):
    """Return a valid NUM_BANKS x len(DRUM_TRACKS) x NUM_STEPS bool grid or None."""
    if not isinstance(raw, list) or len(raw) != NUM_BANKS:
        return None
    banks = []
    for bank in raw:
        if not isinstance(bank, list) or len(bank) != len(DRUM_TRACKS):
            return None
        rows = []
        for row in bank:
            if not isinstance(row, list) or len(row) != NUM_STEPS:
                return None
            rows.append([bool(cell) for cell in row])
        banks.append(rows)
    return banks


def sanitize_velocity_banks(raw):
    """Return a valid velocity bank grid (floats 0.05..1.0) or None."""
    if not isinstance(raw, list) or len(raw) != NUM_BANKS:
        return None
    banks = []
    for bank in raw:
        if not isinstance(bank, list) or len(bank) != len(DRUM_TRACKS):
            return None
        rows = []
        for row in bank:
            if not isinstance(row, list) or len(row) != NUM_STEPS:
                return None
            clean = []
            for cell in row:
                try:
                    clean.append(clamp(float(cell), 0.05, 1.0))
                except (TypeError, ValueError):
                    clean.append(1.0)
            rows.append(clean)
        banks.append(rows)
    return banks


def convert_melody_cell(cell, fallback_instrument):
    """Normalize any supported melody cell encoding to None or (instrument, length).

    Accepted inputs: None, instrument name, legacy True, and [name, length].
    """
    if cell in INSTRUMENTS:
        return (cell, 1)
    if cell is True and fallback_instrument in INSTRUMENTS:
        return (fallback_instrument, 1)
    if isinstance(cell, (list, tuple)) and len(cell) == 2:
        instrument, length = cell
        if instrument in INSTRUMENTS:
            try:
                return (instrument, clamp(int(length), 1, NUM_STEPS))
            except (TypeError, ValueError):
                return None
    return None


def sanitize_melody_banks(raw, fallback_instrument):
    """Return a valid melody bank grid with (instrument, length) cells, or None."""
    if not isinstance(raw, list) or len(raw) != NUM_BANKS:
        return None
    banks = []
    for bank in raw:
        if not isinstance(bank, list) or len(bank) != len(PIANO_NOTES):
            return None
        rows = []
        for row in bank:
            if not isinstance(row, list) or len(row) != NUM_STEPS:
                return None
            rows.append([convert_melody_cell(cell, fallback_instrument) for cell in row])
        banks.append(rows)
    return banks


def sanitize_song(raw):
    """Return (enabled, length, arrangement) or None for invalid data."""
    if not isinstance(raw, dict):
        return None
    try:
        length = clamp(int(raw.get('length', 8)), SONG_MIN_BARS, SONG_MAX_BARS)
    except (TypeError, ValueError):
        length = 8
    arrangement = [None] * length
    raw_arrangement = raw.get('arrangement')
    if isinstance(raw_arrangement, list):
        for index, value in enumerate(raw_arrangement[:length]):
            if isinstance(value, int) and not isinstance(value, bool) and 0 <= value < NUM_BANKS:
                arrangement[index] = value
    return bool(raw.get('enabled', False)), length, arrangement


def sanitize_mixer_track(raw, default_volume=0.8):
    track = default_mixer_track(default_volume)
    if isinstance(raw, dict):
        try:
            track['volume'] = clamp(float(raw.get('volume', default_volume)), 0.0, 1.0)
        except (TypeError, ValueError):
            pass
        try:
            track['pan'] = clamp(float(raw.get('pan', 0.0)), -1.0, 1.0)
        except (TypeError, ValueError):
            pass
        for key in ('fx_space', 'fx_echo'):
            try:
                track[key] = clamp(float(raw.get(key, 0.0)), 0.0, 1.0)
            except (TypeError, ValueError):
                track[key] = 0.0
        try:
            track['fx_tone'] = clamp(float(raw.get('fx_tone', 1.0)), 0.0, 1.0)
        except (TypeError, ValueError):
            track['fx_tone'] = 1.0
        track['muted'] = bool(raw.get('muted', False))
        track['solo'] = bool(raw.get('solo', False))
    return track


def sanitize_fx_params(raw, defaults=None):
    """Normalize a master-style FX dict to {'space', 'echo', 'tone'}."""
    result = default_master_fx()
    if defaults is not None:
        result.update(defaults)
    if isinstance(raw, dict):
        for key in ('space', 'echo'):
            try:
                result[key] = clamp(float(raw.get(key, result[key])), 0.0, 1.0)
            except (TypeError, ValueError):
                pass
        try:
            result['tone'] = clamp(float(raw.get('tone', result['tone'])), 0.0, 1.0)
        except (TypeError, ValueError):
            pass
    return result


def sanitize_audio_track_meta(raw):
    return {
        'name': str(raw.get('name', 'Audio'))[:64],
        'path': str(raw.get('path', '')),
        'start_step': clamp(int(raw.get('start_step', 0)), 0, NUM_STEPS - 1),
        'muted': bool(raw.get('muted', False)),
        'solo': bool(raw.get('solo', False)),
        'pan': clamp(float(raw.get('pan', 0.0)), -1.0, 1.0),
        'volume': clamp(float(raw.get('volume', 0.8)), 0.0, 1.0),
    }


def resolve_audio_path(path, base_dir):
    """Find a saved audio file: absolute first, then relative to the project."""
    if not path:
        return None
    candidates = [path]
    if base_dir and not os.path.isabs(path):
        candidates.append(os.path.join(base_dir, path))
        candidates.append(os.path.join(base_dir, os.path.basename(path)))
    for candidate in candidates:
        if candidate and os.path.exists(candidate):
            return candidate
    return None


# ---------------------------------------------------------------------------
# Offline WAV rendering
# ---------------------------------------------------------------------------

def mix_into_buffer(buffer, start_sample, wave, gain_left, gain_right):
    """Mix a mono (n,) or stereo (n, 2) float wave into a stereo buffer."""
    if wave is None or len(wave) == 0:
        return
    start = max(0, int(start_sample))
    end = min(len(buffer), start + len(wave))
    if end <= start:
        return
    section = wave[:end - start]
    if section.ndim == 2:
        buffer[start:end, 0] += section[:, 0] * gain_left
        buffer[start:end, 1] += section[:, 1] * gain_right
    else:
        buffer[start:end, 0] += section * gain_left
        buffer[start:end, 1] += section * gain_right


def finalize_buffer(buffer):
    """Guard against clipping, then convert to interleaved int16 bytes."""
    peak = float(np.max(np.abs(buffer))) if len(buffer) else 0.0
    if peak > 1.0:
        buffer = buffer / peak
    pcm = np.clip(buffer * 32767.0, -32768, 32767).astype(np.int16)
    return pcm.tobytes(), peak


def write_wav(path, pcm_bytes, sample_rate=SAMPLE_RATE):
    with wave.open(path, 'wb') as wav_file:
        wav_file.setnchannels(2)
        wav_file.setsampwidth(2)
        wav_file.setframerate(sample_rate)
        wav_file.writeframes(pcm_bytes)


# ---------------------------------------------------------------------------
# Synthesis
# ---------------------------------------------------------------------------

def noise_burst(count, seed):
    return np.random.default_rng(seed).uniform(-1, 1, count)


def eq_noise(noise, low_cut=0, high_cut=None, peak_freq=None, peak_gain=0.0):
    spectrum = np.fft.rfft(noise)
    frequencies = np.fft.rfftfreq(len(noise), 1 / SAMPLE_RATE)
    shape = np.ones_like(frequencies)
    if low_cut > 0:
        shape *= np.clip(frequencies / low_cut, 0.0, 1.0)
    if high_cut is not None:
        shape *= np.clip(high_cut / np.maximum(frequencies, 1), 0.0, 1.0)
    if peak_freq is not None and peak_gain != 0:
        width = max(1.0, peak_freq * 0.55)
        bell = np.exp(-0.5 * ((frequencies - peak_freq) / width) ** 2)
        shape *= 1.0 + bell * peak_gain
    spectrum *= shape
    filtered = np.fft.irfft(spectrum, n=len(noise))
    peak = np.max(np.abs(filtered))
    if peak > 0:
        filtered /= peak
    return filtered


def build_kick_wave():
    duration = 0.5
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    frequency = 50 + 210 * np.exp(-35 * t)
    phase = 2 * np.pi * np.cumsum(frequency) / SAMPLE_RATE
    wave = np.sin(phase)
    wave += 0.18 * np.sin(2 * phase)
    wave *= np.exp(-7 * t)
    click = noise_burst(len(t), 101)
    click *= np.exp(-100 * t)
    wave += click * 0.12
    return wave * 0.85


def build_snare_wave():
    duration = 0.32
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise = eq_noise(noise_burst(len(t), 202), low_cut=550, high_cut=9500, peak_freq=2400, peak_gain=1.2)
    body = np.sin(2 * np.pi * 185 * t) + 0.35 * np.sin(2 * np.pi * 330 * t)
    attack = eq_noise(noise_burst(len(t), 203), low_cut=1800, high_cut=12000, peak_freq=4500, peak_gain=0.8)
    attack *= np.exp(-90 * t)
    wave = noise * np.exp(-13 * t) * 0.72 + body * np.exp(-18 * t) * 0.38 + attack * 0.2
    return wave * 0.75


def _hat_body(duration, decay, brightness, seed=303):
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise = eq_noise(noise_burst(len(t), seed), low_cut=5500, high_cut=18000, peak_freq=10500, peak_gain=1.5)
    wave = noise * np.exp(-decay * t) * brightness
    for metallic_frequency in (6400, 7900, 10100, 12400):
        wave += np.sin(2 * np.pi * metallic_frequency * t) * np.exp(-(decay + 7) * t) * 0.025
    return wave


def build_hihat_wave():
    return _hat_body(0.1, 48, 0.48, seed=303)


def build_openhat_wave():
    return _hat_body(0.45, 9, 0.4, seed=304)


def build_clap_wave():
    duration = 0.42
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise = eq_noise(noise_burst(len(t), 404), low_cut=900, high_cut=12500, peak_freq=3200, peak_gain=1.5)
    first_burst = np.where(t >= 0.0, np.exp(-t / 0.008), 0) * (t < 0.025)
    second_burst = np.where(t >= 0.022, np.exp(-(t - 0.022) / 0.01), 0) * (t < 0.052)
    tail = np.where(t >= 0.045, np.exp(-(t - 0.045) / 0.105), 0)
    envelope = first_burst * 1.0 + second_burst * 0.95 + tail * 0.55
    wave = noise * envelope
    body = np.sin(2 * np.pi * 1150 * t) + 0.5 * np.sin(2 * np.pi * 1750 * t)
    body *= np.where(t >= 0.045, np.exp(-(t - 0.045) / 0.055), 0)
    wave += body * 0.08
    texture = eq_noise(noise_burst(len(t), 405), low_cut=1200, high_cut=11000, peak_freq=4000, peak_gain=1.0)
    wave += texture * second_burst * 0.22
    return wave * 0.72


def build_perc_wave():
    duration = 0.12
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    noise = noise_burst(len(t), 505)
    return noise * np.exp(-28 * t) * 0.35


def build_metronome_wave(accent):
    duration = 0.06
    t = np.linspace(0, duration, int(SAMPLE_RATE * duration), endpoint=False)
    frequency = 1500 if accent else 900
    wave = np.sin(2 * np.pi * frequency * t) * np.exp(-60 * t)
    wave += noise_burst(len(t), 606 if accent else 607) * np.exp(-180 * t) * 0.2
    return wave * (0.55 if accent else 0.38)


# Instrument base durations; longer notes stretch the decay proportionally.
_BASE_NOTE_DURATIONS = {'SOFT': 0.4, 'PLUCK': 0.25, 'BASS': 0.45, '808': 0.6, 'KEYS': 0.5, 'TOM': 0.35}


def build_synth_wave(note, instrument, length_steps=1):
    """Build a note waveform. length_steps > 1 stretches the decay so the note
    sustains roughly that many 16ths (at a 120 BPM reference)."""
    if instrument not in _BASE_NOTE_DURATIONS:
        instrument = 'SOFT'
    base_duration = _BASE_NOTE_DURATIONS[instrument]
    freq = note_frequency(note)
    duration = base_duration
    if length_steps > 1:
        duration = 0.125 * length_steps + 0.15
    stretch = duration / base_duration
    count = int(SAMPLE_RATE * duration)
    t = np.linspace(0, duration, count, endpoint=False)

    if instrument == 'SOFT':
        wave = np.sin(2 * np.pi * freq * t) * 0.75
        wave += np.sin(2 * np.pi * freq * 2 * t) * 0.15
        fade = np.exp(-5 * t / stretch)
    elif instrument == 'PLUCK':
        wave = np.sin(2 * np.pi * freq * t) * 0.65
        wave += np.sin(2 * np.pi * freq * 2 * t) * 0.25
        fade = np.exp(-14 * t / stretch)
    elif instrument == 'BASS':
        wave = np.sin(2 * np.pi * freq * t) * 0.8
        wave += np.sin(2 * np.pi * freq * 2 * t) * 0.12
        fade = np.exp(-6 * t / stretch)
    elif instrument == '808':
        glide = freq * (1.0 + 0.6 * np.exp(-25 * t))
        phase = 2 * np.pi * np.cumsum(glide) / SAMPLE_RATE
        wave = np.tanh(1.8 * np.sin(phase)) * 0.75
        fade = np.exp(-3.2 * t / stretch)
    elif instrument == 'KEYS':
        wave = np.sin(2 * np.pi * freq * t) * 0.55
        wave += np.sin(2 * np.pi * freq * 2 * t) * 0.22
        wave += np.sin(2 * np.pi * freq * 3 * t) * 0.1
        fade = np.exp(-4 * t / stretch)
    else:  # TOM
        glide = freq * (1.0 + 0.25 * np.exp(-18 * t))
        phase = 2 * np.pi * np.cumsum(glide) / SAMPLE_RATE
        wave = np.sin(phase) * 0.85
        wave += noise_burst(len(t), 707) * np.exp(-120 * t) * 0.15
        fade = np.exp(-11 * t / stretch)

    attack = np.minimum(1, t / 0.01)
    return wave * fade * attack * 0.65


# ---------------------------------------------------------------------------
# Offline FX (baked into one-shots at play time and into exports)
# ---------------------------------------------------------------------------

_REVERB_IR = None


def _reverb_ir():
    """Synthetic concert-hall impulse: decaying shaped noise, 1.1 s."""
    global _REVERB_IR
    if _REVERB_IR is None:
        length = 1.1
        count = int(SAMPLE_RATE * length)
        t = np.linspace(0, length, count, endpoint=False)
        ir = noise_burst(count, 909) * np.exp(-4.0 * t)
        ir *= np.minimum(1.0, t / 0.012)
        ir = eq_noise(ir, low_cut=180, high_cut=9000)
        ir /= np.max(np.abs(ir))
        _REVERB_IR = ir.astype(np.float64)
    return _REVERB_IR


def _fft_convolve(signal, impulse):
    total = len(signal) + len(impulse) - 1
    size = 1
    while size < total:
        size *= 2
    result = np.fft.irfft(np.fft.rfft(signal, size) * np.fft.rfft(impulse, size), size)
    return result[:len(signal) + len(impulse)]


def _one_pole_lowpass(wave, tone):
    """tone 0..1 where 1 is fully open; below that it darkens the sound."""
    if tone >= 0.995:
        return wave
    alpha = 0.015 + 0.985 * (clamp(tone, 0.0, 1.0) ** 1.6)
    out = np.empty_like(wave)
    acc = 0.0
    for i in range(len(wave)):
        acc += alpha * (wave[i] - acc)
        out[i] = acc
    return out


def apply_track_fx(wave, space=0.0, echo=0.0, tone=1.0, bpm=120.0):
    """Apply TONE (low-pass) -> ECHO (dotted-eighth feedback) -> SPACE (reverb).

    Used both to bake FX into one-shots for the pygame-mixer fallback path and
    to render FX into exported WAVs.
    """
    out = np.array(wave, dtype=np.float64)
    out = _one_pole_lowpass(out, tone)
    if echo > 0.005:
        dry = out.copy()
        tap = max(1, int(0.75 * 60.0 / bpm * SAMPLE_RATE))
        amp = echo
        position = tap
        while position < len(out) and amp > 0.01:
            out[position:] += dry[:len(out) - position] * amp
            amp *= 0.55
            position += tap
    if space > 0.005:
        wet = _fft_convolve(out, _reverb_ir())
        out += wet[:len(out)] * (space * 0.9)
    return out


def apply_master_fx(buffer, space=0.0, echo=0.0, tone=1.0, bpm=120.0):
    """Apply the master FX chain to a stereo (n, 2) buffer, in a copy."""
    if space <= 0.005 and echo <= 0.005 and tone >= 0.995:
        return buffer
    out = np.empty_like(buffer)
    for channel in range(2):
        out[:, channel] = apply_track_fx(buffer[:, channel], space=space, echo=echo, tone=tone, bpm=bpm)
    return out


# ---------------------------------------------------------------------------
# Real-time audio engine
#
# A callback-driven software mixer: voices render into per-track buffers, each
# track runs TONE -> ECHO -> SPACE with live parameter reads (knob turns are
# instant), and the master bus applies its own FX chain plus a safety limiter.
# Falls back to baking FX into pygame mixer sounds when no output device exists.
# ---------------------------------------------------------------------------

RT_BLOCK_SIZE = 512
METRO_CHANNEL = 12
RT_CHANNEL_COUNT = 13  # 0-5 drums, 6 melody, 7-11 audio clips, 12 metronome


class RTTone:
    """State-variable one-pole low-pass; tone 0..1 with 1 fully open."""

    def __init__(self):
        self.acc = 0.0

    def process(self, block, tone):
        alpha = 0.015 + 0.985 * (clamp(tone, 0.0, 1.0) ** 1.6)
        out = np.empty_like(block)
        acc = self.acc
        for i in range(len(block)):
            acc += alpha * (block[i] - acc)
            out[i] = acc
        self.acc = acc
        return out


class RTDelay:
    """Feedback delay synced to a dotted eighth; buffer holds up to 1.5 s."""

    def __init__(self, max_seconds=1.5):
        self.buffer = np.zeros(int(SAMPLE_RATE * max_seconds))
        self.position = 0

    def process(self, block, mix, bpm):
        tap = max(1, int(0.75 * 60.0 / max(bpm, 1.0) * SAMPLE_RATE))
        size = len(self.buffer)
        out = np.empty_like(block)
        position = self.position
        for i in range(len(block)):
            delayed = self.buffer[(position - tap) % size]
            self.buffer[position] = block[i] + delayed * 0.55
            out[i] = block[i] + delayed * mix
            position = (position + 1) % size
        self.position = position
        return out


class RTReverb:
    """Schroeder reverb: 4 parallel combs into 2 series allpasses."""

    COMB_LENGTHS = (1557, 1617, 1769, 1917)
    ALLPASS_LENGTHS = (225, 347)

    def __init__(self):
        self.comb_buffers = [np.zeros(length) for length in self.COMB_LENGTHS]
        self.comb_positions = [0] * len(self.COMB_LENGTHS)
        self.ap_buffers = [np.zeros(length) for length in self.ALLPASS_LENGTHS]
        self.ap_positions = [0] * len(self.ALLPASS_LENGTHS)

    def process(self, block):
        wet = np.zeros_like(block)
        for c in range(len(self.COMB_LENGTHS)):
            buf = self.comb_buffers[c]
            index = self.comb_positions[c]
            size = len(buf)
            for i in range(len(block)):
                delayed = buf[index]
                buf[index] = block[i] + delayed * 0.78
                wet[i] += delayed
                index = (index + 1) % size
            self.comb_positions[c] = index
        wet /= len(self.COMB_LENGTHS)
        for a in range(len(self.ALLPASS_LENGTHS)):
            buf = self.ap_buffers[a]
            index = self.ap_positions[a]
            size = len(buf)
            for i in range(len(wet)):
                delayed = buf[index]
                wet[i] = delayed - 0.5 * wet[i]
                buf[index] = wet[i] + 0.5 * delayed
                index = (index + 1) % size
            self.ap_positions[a] = index
        return wet


class AudioEngine:
    """Real-time mixer. Lives on its own PortAudio callback thread."""

    def __init__(self, app):
        self.app = app
        self.ok = False
        self.stream = None
        self.voices = []
        self.queue = []
        self.tone = [RTTone() for _ in range(RT_CHANNEL_COUNT)]
        self.delay = [RTDelay() for _ in range(RT_CHANNEL_COUNT)]
        self.reverb = [RTReverb() for _ in range(RT_CHANNEL_COUNT)]
        self.master_tone = RTTone()
        self.master_delay = RTDelay()
        self.master_reverb = RTReverb()
        try:
            self.stream = sd.OutputStream(
                samplerate=SAMPLE_RATE, channels=2, dtype='float32',
                blocksize=RT_BLOCK_SIZE, callback=self._callback)
            self.stream.start()
            self.ok = True
        except Exception:
            self.stream = None

    def trigger(self, channel, wave, velocity=1.0):
        if wave is None or len(wave) == 0:
            return
        if len(self.queue) < 256:
            self.queue.append((channel, wave, float(velocity)))

    def stop_all(self):
        self.queue.clear()
        self.voices.clear()

    def close(self):
        if self.stream is not None:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None
        self.ok = False

    def _callback(self, outdata, frames, time_info):
        try:
            self._render(outdata, frames)
        except Exception:
            outdata[:] = 0

    def _render(self, outdata, frames):
        app = self.app
        if self.queue:
            queued, self.queue = self.queue, []
            for channel, wave, velocity in queued:
                if len(self.voices) < 200:
                    self.voices.append([channel, wave, 0, velocity])
        dry = [np.zeros(frames) for _ in range(RT_CHANNEL_COUNT)]
        keep = []
        for voice in self.voices:
            channel, wave, position, velocity = voice
            count = min(frames, len(wave) - position)
            segment = np.asarray(wave[position:position + count], dtype=np.float64)
            if segment.ndim == 2:
                segment = segment.mean(axis=1)
            dry[channel][:count] += segment * velocity
            if position + count < len(wave):
                voice[2] = position + count
                keep.append(voice)
        self.voices = keep

        with app.audio_lock:
            solo = any_track_soloed(app.drum_mixer, app.melody_mixer, app.audio_tracks)
            tracks = list(app.audio_tracks)
        master = np.zeros((frames, 2))
        for channel in range(RT_CHANNEL_COUNT):
            if channel == METRO_CHANNEL:
                master[:, 0] += dry[channel]
                master[:, 1] += dry[channel]
                continue
            if channel <= 5:
                params = app.drum_mixer[channel]
            elif channel == 6:
                params = app.melody_mixer
            else:
                index = channel - 7
                params = tracks[index] if index < len(tracks) else None
            if params is None or not np.any(dry[channel]):
                continue
            if not track_is_audible(params, solo):
                continue
            signal = self._channel_fx(channel, dry[channel], params)
            left, right = pan_to_lr(params.get('volume', 1.0), params.get('pan', 0.0))
            master[:, 0] += signal * left
            master[:, 1] += signal * right

        fx = app.master_fx
        if fx['tone'] < 0.995:
            master[:, 0] = self.master_tone.process(master[:, 0], fx['tone'])
            master[:, 1] = self.master_tone.process(master[:, 1], fx['tone'])
        if fx['echo'] > 0.005:
            master[:, 0] = self.master_delay.process(master[:, 0], fx['echo'], app.bpm)
            master[:, 1] = self.master_delay.process(master[:, 1], fx['echo'], app.bpm)
        if fx['space'] > 0.005:
            wet_left = self.master_reverb.process(master[:, 0])
            wet_right = self.master_reverb.process(master[:, 1])
            master[:, 0] += wet_left * fx['space'] * 0.9
            master[:, 1] += wet_right * fx['space'] * 0.9
        master *= app.master_volume
        peak = float(np.max(np.abs(master))) if len(master) else 0.0
        if peak > 0.98:
            master *= 0.98 / peak
        outdata[:] = master.astype(np.float32)

    def _channel_fx(self, channel, block, params):
        tone = params.get('fx_tone', 1.0)
        if tone < 0.995:
            block = self.tone[channel].process(block, tone)
        echo = params.get('fx_echo', 0.0)
        if echo > 0.005:
            block = self.delay[channel].process(block, echo, self.app.bpm)
        space = params.get('fx_space', 0.0)
        if space > 0.005:
            block = block + self.reverb[channel].process(block) * space * 0.9
        return block


# ---------------------------------------------------------------------------
# Text/UI helpers
# ---------------------------------------------------------------------------

def blend(color_a, color_b, ratio):
    ratio = clamp(ratio, 0.0, 1.0)
    return tuple(int(a + (b - a) * ratio) for a, b in zip(color_a[:3], color_b[:3]))


def ellipsize(font, text, max_width):
    if font.size(text)[0] <= max_width:
        return text
    while text and font.size(text + '...')[0] > max_width:
        text = text[:-1]
    return text + '...'


_FONT_CACHE = {}


def load_font(size, bold=False):
    """Prefer a real system UI font; fall back to pygame's built-in."""
    key = (size, bold)
    if key not in _FONT_CACHE:
        font = None
        for name in ('segoeui', 'roboto', 'helvetica', 'dejavusans', 'liberationsans', 'arial', 'freesansbold'):
            path = pygame.font.match_font(name, bold=bold)
            if path:
                font = pygame.font.Font(path, size)
                break
        if font is None:
            font = pygame.font.Font(None, size)
            if bold:
                font.set_bold(True)
        _FONT_CACHE[key] = font
    return _FONT_CACHE[key]


def load_font_mono(size):
    """Monospaced face for numeric readouts (BPM, percentages, values)."""
    key = ('mono', size)
    if key not in _FONT_CACHE:
        font = None
        for name in ('consolas', 'menlo', 'dejavusansmono', 'liberationmono', 'couriernew'):
            path = pygame.font.match_font(name, bold=True)
            if path:
                font = pygame.font.Font(path, size)
                break
        if font is None:
            font = pygame.font.Font(None, size)
            font.set_bold(True)
        _FONT_CACHE[key] = font
    return _FONT_CACHE[key]


def draw_export_glyph(surface, color, center):
    x, y = center
    pygame.draw.line(surface, color, (x, y - 6), (x, y + 1), 2)
    pygame.draw.polygon(surface, color, [(x - 4, y - 1), (x + 4, y - 1), (x, y + 4)])
    pygame.draw.line(surface, color, (x - 6, y + 6), (x + 6, y + 6), 2)


def draw_save_glyph(surface, color, center):
    x, y = center
    pygame.draw.rect(surface, color, (x - 6, y - 6, 12, 12), 2, border_radius=2)
    pygame.draw.rect(surface, color, (x - 3, y - 6, 6, 4))
    pygame.draw.rect(surface, color, (x - 4, y + 1, 8, 5))


def draw_load_glyph(surface, color, center):
    x, y = center
    pygame.draw.rect(surface, color, (x - 6, y - 3, 12, 9), 2, border_radius=2)
    pygame.draw.line(surface, color, (x - 6, y - 3), (x - 4, y - 6), 2)
    pygame.draw.line(surface, color, (x - 4, y - 6), (x + 1, y - 6), 2)


def draw_theme_glyph(surface, color, center):
    x, y = center
    pygame.draw.circle(surface, color, (x, y), 6, 2)
    points = [(x, y - 6)]
    for i in range(1, 7):
        angle = -math.pi / 2 + math.pi * i / 6
        points.append((x + 6 * math.cos(angle), y + 6 * math.sin(angle)))
    points.append((x, y + 6))
    pygame.draw.polygon(surface, color, points)


def create_app_icon(size=32):
    """Gradient play-button logo used for the window icon."""
    surface = pygame.Surface((size, size), pygame.SRCALPHA)
    for y in range(size):
        pygame.draw.line(surface, blend((88, 145, 255), (90, 200, 255), y / size), (0, y), (size, y))
    for corner in ((0, 0), (size, 0), (0, size), (size, size)):
        pygame.draw.circle(surface, (0, 0, 0, 0), corner, size // 4)
    pygame.draw.polygon(surface, (255, 255, 255), [
        (size * 0.36, size * 0.26), (size * 0.36, size * 0.74), (size * 0.76, size * 0.5)])
    return surface


def file_dialog(mode, title, filetypes):
    """Small wrapper around the tkinter dialog; returns None when unavailable."""
    if not TK_AVAILABLE:
        return None
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    try:
        if mode == 'save':
            path = filedialog.asksaveasfilename(title=title, defaultextension=PROJECT_EXTENSION, filetypes=filetypes)
        else:
            path = filedialog.askopenfilename(title=title, filetypes=filetypes)
    finally:
        root.destroy()
    return path or None


def recordings_dir():
    """Best writable location for recordings/autosave; falls back gracefully."""
    if IS_WEB:
        return '/data'
    home = os.path.expanduser('~')
    candidates = [os.path.join(home, 'Music'), home, os.path.dirname(os.path.abspath(__file__))]
    for base in candidates:
        try:
            path = os.path.join(base, 'FluroStudio')
            os.makedirs(path, exist_ok=True)
            return path
        except Exception:
            continue
    return '.'


def clipboard_put(text):
    try:
        import pygame.scrap
        pygame.scrap.init()
        pygame.scrap.put_text(text)
        return True
    except Exception:
        return False


def clipboard_get():
    try:
        import pygame.scrap
        pygame.scrap.init()
        return pygame.scrap.get_text() or ''
    except Exception:
        return ''


def list_input_devices():
    if not SOUNDDEVICE_AVAILABLE:
        return []
    try:
        return [(index, device['name']) for index, device in enumerate(sd.query_devices()) if device['max_input_channels'] > 0]
    except Exception:
        return []


# ---------------------------------------------------------------------------
# Icons (drawn in code so the app ships without assets)
# ---------------------------------------------------------------------------

def make_icon_surface(size=(48, 48)):
    return pygame.Surface(size, pygame.SRCALPHA)


def create_kick_icon(main_color, detail_color):
    surface = make_icon_surface()
    pygame.draw.circle(surface, main_color, (24, 22), 16, 3)
    pygame.draw.circle(surface, detail_color, (24, 22), 5, 2)
    pygame.draw.line(surface, main_color, (12, 35), (8, 44), 3)
    pygame.draw.line(surface, main_color, (36, 35), (40, 44), 3)
    return surface


def create_snare_icon(main_color, detail_color):
    surface = make_icon_surface()
    pygame.draw.ellipse(surface, main_color, (7, 8, 34, 11), 2)
    pygame.draw.rect(surface, main_color, (7, 13, 34, 20), 2)
    pygame.draw.ellipse(surface, main_color, (7, 27, 34, 11), 2)
    pygame.draw.line(surface, detail_color, (10, 18), (38, 29), 2)
    pygame.draw.line(surface, detail_color, (10, 29), (38, 18), 2)
    return surface


def create_hihat_icon(main_color, detail_color, open_hat=False):
    surface = make_icon_surface()
    pygame.draw.line(surface, main_color, (24, 10), (24, 42), 3)
    if open_hat:
        pygame.draw.line(surface, main_color, (10, 13), (38, 13), 3)
        pygame.draw.line(surface, detail_color, (13, 26), (35, 26), 2)
    else:
        pygame.draw.line(surface, main_color, (10, 17), (38, 17), 3)
        pygame.draw.line(surface, detail_color, (13, 21), (35, 21), 2)
    pygame.draw.line(surface, main_color, (17, 42), (31, 42), 3)
    return surface


def create_clap_icon(main_color, detail_color):
    surface = make_icon_surface()
    pygame.draw.polygon(surface, main_color, [(8, 28), (14, 15), (18, 17), (16, 27), (22, 13), (26, 15), (22, 30), (29, 18), (33, 21), (27, 35), (17, 39)], 2)
    pygame.draw.polygon(surface, detail_color, [(40, 26), (35, 14), (31, 17), (33, 27), (27, 13), (24, 16), (29, 31), (22, 20), (19, 23), (25, 37), (35, 39)], 2)
    return surface


def create_perc_icon(main_color, detail_color):
    surface = make_icon_surface()
    pygame.draw.ellipse(surface, main_color, (9, 5, 24, 28), 3)
    pygame.draw.line(surface, main_color, (27, 29), (39, 44), 5)
    pygame.draw.circle(surface, detail_color, (19, 16), 3)
    pygame.draw.circle(surface, detail_color, (25, 22), 3)
    return surface


def create_microphone_icon(main_color):
    surface = pygame.Surface((24, 24), pygame.SRCALPHA)
    pygame.draw.rect(surface, main_color, (8, 2, 8, 13), border_radius=4)
    pygame.draw.arc(surface, main_color, (5, 7, 14, 11), 3.14159, 6.28318, 2)
    pygame.draw.line(surface, main_color, (12, 17), (12, 22), 2)
    pygame.draw.line(surface, main_color, (8, 22), (16, 22), 2)
    return surface


# ---------------------------------------------------------------------------
# Sequencer clock (audio runs on its own thread for tight timing)
# ---------------------------------------------------------------------------

class SequencerClock(threading.Thread):
    """Wakes up every millisecond and fires steps exactly when they are due."""

    def __init__(self, app):
        super().__init__(daemon=True)
        self.app = app
        self.stop_event = threading.Event()

    def run(self):
        while not self.stop_event.wait(0.001):
            self.app.service_clock()


# ---------------------------------------------------------------------------
# The app
# ---------------------------------------------------------------------------

class FluroStudioApp:
    def __init__(self, theme='dark'):
        self.theme_name = theme if theme in THEMES else 'dark'
        self.theme = theme_colors(self.theme_name)

        pygame.mixer.pre_init(SAMPLE_RATE, -16, 2, 512)
        pygame.init()
        try:
            pygame.mixer.init(frequency=SAMPLE_RATE, size=-16, channels=2)
            pygame.mixer.set_num_channels(64)
            self.mixer_ok = True
        except pygame.error:
            self.mixer_ok = False

        self.window = pygame.display.set_mode((LOGICAL_W, LOGICAL_H), pygame.RESIZABLE)
        pygame.display.set_caption(f'FluroStudio {VERSION}')
        pygame.display.set_icon(create_app_icon())
        self.screen = pygame.Surface((LOGICAL_W, LOGICAL_H))
        self.view_transform = (1.0, 0, 0)
        self.frame_mouse = (0, 0)
        self.clock = pygame.time.Clock()
        self.fonts = {
            'title': load_font(34, bold=True),
            'section': load_font(24, bold=True),
            'track': load_font(22),
            'small': load_font(19),
            'tiny': load_font(16),
            'step': load_font(16),
            'micro': load_font(13, bold=True),
            'mono': load_font_mono(16),
        }

        self.drum_sounds = []
        self.drum_waves = []
        self.metro_waves = []
        self.metronome_sounds = []
        self.melody_wave_cache = {}
        self.melody_sound_cache = {}
        self.drum_mixer = default_drum_mixer()
        self.melody_mixer = default_mixer_track(0.75)
        self.master_fx = default_master_fx()
        self.master_volume = 0.9
        self.bpm = 120
        self.swing = 0

        self.drum_icons = []
        self.microphone_icon = None
        self.build_icons()

        drum_banks, velocity_banks, melody_banks = demo_pattern_data()
        self.drum_banks = drum_banks
        self.drum_velocities = velocity_banks
        self.melody_banks = melody_banks
        self.active_bank = 0

        self.song_enabled = False
        self.song_length = 8
        self.arrangement = [None] * self.song_length
        self.song_bar = 0

        self.audio_tracks = []
        self.audio_lock = threading.RLock()

        self.bpm = 120
        self.swing = 0
        self.metronome = False
        self.playing = False
        self.current_step = 0
        self.next_step_time = 0.0
        self.last_step_at = 0.0
        self.step_duration = 0.0

        self.current_view = 'SEQUENCER'
        self.melody_instrument = 'SOFT'
        self.piano_scroll = initial_piano_scroll(melody_banks)

        self.undo_stack = []
        self.redo_stack = []
        self.paint_active = False
        self.paint_value = None
        self.drag = None

        self.kb_enabled = True
        self.kb_base_octave = 3
        self.kb_held = {}
        self.capture_armed = False
        self.capture_count = 0
        self.kb_label_map = {}
        self.rebuild_kb_label_map()

        self.modal = None
        self.chord_mode = None
        self.drum_samples = [None] * len(DRUM_TRACKS)

        self.microphone_devices = list_input_devices()
        self.selected_microphone = 0
        self.recording = False
        self.recording_chunks = []
        self.recording_stream = None
        self.recording_samplerate = SAMPLE_RATE
        self.recording_started_at = 0.0
        if self.microphone_devices:
            try:
                default_input = sd.default.device[0]
                for position, (device_index, _) in enumerate(self.microphone_devices):
                    if device_index == default_input:
                        self.selected_microphone = position
                        break
            except Exception:
                pass

        self.dirty = False
        self.next_autosave = time.time() + AUTOSAVE_SECONDS

        # Prefer the real-time engine; fall back to baking FX into pygame
        # mixer sounds when no output device is available (CI, headless).
        self.engine = AudioEngine(self)
        self.engine_mode = 'rt' if self.engine.ok else 'baked'
        self.audio_ok = self.engine.ok or self.mixer_ok
        self.build_sounds()

        if self.audio_ok:
            self.status_message = ('Real-time audio engine ready - press SPACE to play'
                                   if self.engine_mode == 'rt'
                                   else 'Demo beat loaded - press SPACE to play')
        else:
            self.status_message = 'No audio device found - the app runs, but playback is muted'
        self.status_until = time.time() + 8.0

        self.clock_thread = SequencerClock(self)
        self.clock_thread.start()

    # -- setup ---------------------------------------------------------------

    def build_sounds(self):
        builders = [build_kick_wave, build_snare_wave, build_hihat_wave, build_openhat_wave, build_clap_wave, build_perc_wave]
        self.drum_waves = [builder() for builder in builders]
        self.metro_waves = [build_metronome_wave(False), build_metronome_wave(True)]
        if self.engine_mode != 'baked' or not self.mixer_ok:
            return
        self.drum_sounds = [self.make_sound(wave) for wave in self.drum_waves]
        self.metronome_sounds = [self.make_sound(wave) for wave in self.metro_waves]
        for instrument in INSTRUMENTS:
            for note in PIANO_NOTES:
                self.get_melody_sound(note, instrument, 1)

    def track_fx_kwargs(self, track):
        return {'space': track.get('fx_space', 0.0),
                'echo': track.get('fx_echo', 0.0),
                'tone': track.get('fx_tone', 1.0),
                'bpm': self.bpm}

    def rebuild_baked_sounds(self):
        """Re-bake drum sounds with the current FX (pygame-mixer fallback path)."""
        if self.engine_mode != 'baked' or not self.mixer_ok:
            return
        self.drum_sounds = [self.make_sound(apply_track_fx(self.effective_drum_wave(index), **self.track_fx_kwargs(track)))
                            for index, track in enumerate(self.drum_mixer)]

    def effective_drum_wave(self, index):
        custom = self.drum_samples[index]
        return custom['wave'] if custom else self.drum_waves[index]

    def assign_drum_sample(self, index, path):
        """Replace a synthesized drum track with the user's own sample."""
        if not self.mixer_ok:
            self.set_status('Audio decoding unavailable - cannot load samples')
            return
        try:
            sound = pygame.mixer.Sound(path)
            array = pygame.sndarray.array(sound)
            wave_form = np.mean(array, axis=1) if len(array.shape) == 2 else array
            wave_form = wave_form.astype(np.float32)
            peak = np.max(np.abs(wave_form))
            if peak > 0:
                wave_form /= peak
            self.drum_samples[index] = {'name': os.path.basename(path), 'path': os.path.abspath(path), 'wave': wave_form}
            self.rebuild_baked_sounds()
            self.preview_drum(index)
            self.dirty = True
            self.set_status(f'{DRUM_TRACKS[index]} now uses: {os.path.basename(path)}')
        except Exception as error:
            self.set_status(f"Couldn't load sample ({error})")

    def clear_drum_sample(self, index):
        if self.drum_samples[index] is not None:
            self.drum_samples[index] = None
            self.rebuild_baked_sounds()
            self.dirty = True
            self.set_status(f'{DRUM_TRACKS[index]} back to the built-in synth')

    def make_sound(self, wave_form):
        wave_form = np.clip(wave_form, -1, 1)
        audio = (wave_form * 32767).astype(np.int16)
        stereo = np.ascontiguousarray(np.column_stack((audio, audio)))
        return pygame.sndarray.make_sound(stereo)

    def get_melody_wave(self, note, instrument, length_steps=1):
        key = (note, instrument, int(length_steps))
        if key not in self.melody_wave_cache:
            self.melody_wave_cache[key] = build_synth_wave(note, instrument, key[2])
        return self.melody_wave_cache[key]

    def get_melody_sound(self, note, instrument, length_steps=1):
        if not self.audio_ok or self.engine_mode != 'baked':
            return None
        fx = self.track_fx_kwargs(self.melody_mixer)
        key = (note, instrument, int(length_steps),
               round(fx['space'], 2), round(fx['echo'], 2), round(fx['tone'], 2), round(self.bpm, 1))
        if key not in self.melody_sound_cache:
            if len(self.melody_sound_cache) > 600:
                self.melody_sound_cache.clear()
            wave = self.get_melody_wave(note, instrument, key[2])
            if fx['space'] > 0.005 or fx['echo'] > 0.005 or fx['tone'] < 0.995:
                wave = apply_track_fx(wave, **fx)
            self.melody_sound_cache[key] = self.make_sound(wave)
        return self.melody_sound_cache[key]

    def build_icons(self):
        main = self.theme['text']
        detail = self.theme['text_dim']
        self.drum_icons = [
            create_kick_icon(main, detail),
            create_snare_icon(main, detail),
            create_hihat_icon(main, detail, open_hat=False),
            create_hihat_icon(main, detail, open_hat=True),
            create_clap_icon(main, detail),
            create_perc_icon(main, detail),
        ]
        self.microphone_icon = create_microphone_icon(main)

    # -- status --------------------------------------------------------------

    def set_status(self, message, seconds=6.0):
        self.status_message = message
        self.status_until = time.time() + seconds

    # -- playback ------------------------------------------------------------

    def service_clock(self):
        """Called from the clock thread; fires every step that is due."""
        if not self.playing:
            return
        now = time.perf_counter()
        guard = 0
        while self.next_step_time <= now and guard < 32:
            self.trigger_step(self.current_step)
            interval = 60.0 / self.bpm / 4
            self.last_step_at = time.perf_counter()
            self.step_duration = interval * swing_gap_multiplier(self.current_step, self.swing)
            self.next_step_time += interval * swing_gap_multiplier(self.current_step, self.swing)
            self.current_step = (self.current_step + 1) % NUM_STEPS
            if self.current_step == 0:
                self.on_bar_end()
            guard += 1

    def on_bar_end(self):
        """Move to the next bar: song mode walks the arrangement, otherwise loop."""
        if self.song_enabled and any(value is not None for value in self.arrangement):
            self.song_bar = (self.song_bar + 1) % self.song_length
            bank = self.arrangement[self.song_bar]
            if bank is not None:
                self.active_bank = bank
        else:
            self.song_bar = 0

    def trigger_step(self, step):
        if not self.audio_ok:
            return
        drum_bank = self.drum_banks[self.active_bank]
        velocity_bank = self.drum_velocities[self.active_bank]
        melody_bank = self.melody_banks[self.active_bank]
        solo = any_track_soloed(self.drum_mixer, self.melody_mixer, self.audio_tracks)
        if self.engine_mode == 'rt':
            for index in range(len(self.drum_waves)):
                if drum_bank[index][step]:
                    self.engine.trigger(index, self.effective_drum_wave(index), velocity_bank[index][step])
            for row, note in enumerate(PIANO_NOTES):
                cell = melody_bank[row][step]
                if cell is not None:
                    instrument, length = cell
                    self.engine.trigger(6, self.get_melody_wave(note, instrument, length))
            with self.audio_lock:
                tracks = list(self.audio_tracks)
            for index, track in enumerate(tracks):
                if track['start_step'] == step:
                    self.engine.trigger(7 + index, track['pcm'])
            if self.metronome:
                self.engine.trigger(METRO_CHANNEL, self.metro_waves[1 if step % 4 == 0 else 0])
            return
        for index, sound in enumerate(self.drum_sounds):
            if drum_bank[index][step]:
                self.play_sound(sound, self.drum_mixer[index], solo, velocity_bank[index][step])
        for row, note in enumerate(PIANO_NOTES):
            cell = melody_bank[row][step]
            if cell is not None:
                instrument, length = cell
                self.play_sound(self.get_melody_sound(note, instrument, length), self.melody_mixer, solo)
        with self.audio_lock:
            tracks = list(self.audio_tracks)
        for track in tracks:
            if track['start_step'] == step:
                self.play_sound(track['sound'], track, solo)
        if self.metronome:
            self.play_metronome(step)

    def play_sound(self, sound, track, solo, velocity=1.0):
        if sound is None or not self.audio_ok:
            return
        if not track_is_audible(track, solo):
            return
        left, right = pan_to_lr(track.get('volume', 1.0), track.get('pan', 0.0))
        channel = sound.play()
        if channel is not None:
            channel.set_volume(left * velocity * self.master_volume, right * velocity * self.master_volume)

    def play_metronome(self, step):
        if not self.audio_ok:
            return
        sound = self.metronome_sounds[1 if step % 4 == 0 else 0]
        channel = sound.play()
        if channel is not None:
            channel.set_volume(self.master_volume, self.master_volume)

    def toggle_playback(self):
        if self.playing:
            self.pause_playback()
        else:
            self.start_playback()

    def start_playback(self):
        if self.playing:
            return
        self.playing = True
        self.next_step_time = time.perf_counter() + 0.06
        self.set_status('Playing' if self.current_step else 'Playing from step 1')

    def pause_playback(self):
        self.playing = False
        if self.engine_mode == 'rt':
            self.engine.stop_all()
        elif self.mixer_ok:
            pygame.mixer.stop()
        self.set_status('Paused')

    def stop_playback(self):
        self.playing = False
        self.current_step = 0
        self.song_bar = 0
        for key in list(self.kb_held):
            self.kb_note_off(key)
        if self.engine_mode == 'rt':
            self.engine.stop_all()
        elif self.mixer_ok:
            pygame.mixer.stop()
        self.set_status('Stopped')

    def tap_tempo(self):
        now = time.time()
        taps = getattr(self, '_tap_times', [])
        taps = [t for t in taps if now - t < 2.5] + [now]
        self._tap_times = taps[-5:]
        if len(self._tap_times) >= 2:
            gaps = [b - a for a, b in zip(self._tap_times, self._tap_times[1:])]
            average = sum(gaps) / len(gaps)
            if average > 0:
                self.bpm = int(clamp(round(60.0 / average), MIN_BPM, MAX_BPM))
                self.set_status(f'Tap tempo: {self.bpm} BPM')

    # -- editing -------------------------------------------------------------

    def snapshot(self):
        return (
            deepcopy(self.drum_banks),
            deepcopy(self.drum_velocities),
            deepcopy(self.melody_banks),
            self.melody_instrument,
            self.active_bank,
            list(self.arrangement),
            self.song_length,
        )

    def apply_snapshot(self, snapshot):
        (self.drum_banks, self.drum_velocities, self.melody_banks,
         self.melody_instrument, self.active_bank, arrangement, length) = snapshot
        self.arrangement = list(arrangement)
        self.song_length = length
        self.song_bar = min(self.song_bar, length - 1)

    def push_undo(self):
        self.undo_stack.append(self.snapshot())
        if len(self.undo_stack) > MAX_UNDO:
            self.undo_stack.pop(0)
        self.redo_stack.clear()
        self.dirty = True

    def undo(self):
        if not self.undo_stack:
            self.set_status('Nothing to undo')
            return
        self.redo_stack.append(self.snapshot())
        self.apply_snapshot(self.undo_stack.pop())
        self.set_status('Undo')

    def redo(self):
        if not self.redo_stack:
            self.set_status('Nothing to redo')
            return
        self.undo_stack.append(self.snapshot())
        self.apply_snapshot(self.redo_stack.pop())
        self.set_status('Redo')

    def clear_bank(self):
        self.push_undo()
        self.drum_banks[self.active_bank] = make_empty_drum_pattern()
        self.drum_velocities[self.active_bank] = make_default_velocities()
        self.melody_banks[self.active_bank] = make_empty_melody_pattern()
        self.set_status(f'Bank {"ABCD"[self.active_bank]} cleared')

    def load_demo_into_bank(self):
        self.push_undo()
        drums, velocities, melody = demo_pattern_data()
        self.drum_banks[self.active_bank] = drums[0]
        self.drum_velocities[self.active_bank] = velocities[0]
        self.melody_banks[self.active_bank] = melody[0]
        self.set_status(f'Demo groove loaded into bank {"ABCD"[self.active_bank]}')

    def copy_bank_forward(self):
        target = (self.active_bank + 1) % NUM_BANKS
        self.push_undo()
        self.drum_banks[target] = deepcopy(self.drum_banks[self.active_bank])
        self.drum_velocities[target] = deepcopy(self.drum_velocities[self.active_bank])
        self.melody_banks[target] = deepcopy(self.melody_banks[self.active_bank])
        self.set_status(f'Bank {"ABCD"[self.active_bank]} copied to bank {"ABCD"[target]}')

    # -- beat codes -------------------------------------------------------------

    def load_beat_code(self, code):
        project = decode_beat_code(code)
        if project is None:
            self.set_status('Invalid beat code - check it and try again')
            return False
        missing = self.import_project(project, base_dir='')
        note = f' ({len(missing)} audio file(s) not included in codes)' if missing else ''
        self.set_status(f'Beat code loaded{note}', 8.0)
        return True

    def open_code_modal(self):
        self.modal = {'kind': 'code', 'code': encode_beat_code(self.export_project()), 'field': ''}

    def open_euclid_modal(self):
        self.modal = {'kind': 'euclid', 'track': 2, 'pulses': 7, 'rotate': 0}

    def apply_euclid(self, track, pulses, rotate):
        self.push_undo()
        pattern = euclidean_pattern(pulses, NUM_STEPS, rotate)
        for step, on in enumerate(pattern):
            if on and not self.drum_banks[self.active_bank][track][step]:
                self.drum_velocities[self.active_bank][track][step] = 0.8
            self.drum_banks[self.active_bank][track][step] = on
        self.modal = None
        self.set_status(f'Euclidean rhythm {pulses}/16 (rot {rotate}) on {DRUM_TRACKS[track]}')

    def randomize_melody(self):
        self.push_undo()
        randomize_melody_bank(self.melody_banks[self.active_bank], random.Random(), self.melody_instrument)
        self.set_status(f'New {self.melody_instrument} melody in A minor pentatonic')

    def apply_variation(self):
        self.push_undo()
        vary_drum_bank(self.drum_banks[self.active_bank],
                       self.drum_velocities[self.active_bank], random.Random())
        self.set_status('Groove variation applied')

    def cycle_chord_mode(self):
        order = (None, 'min', 'maj')
        self.chord_mode = order[(order.index(self.chord_mode) + 1) % len(order)]
        name = {'min': 'MINOR TRIADS', 'maj': 'MAJOR TRIADS'}.get(self.chord_mode, 'off')
        self.set_status(f'Chord stamps: {name}')

    def preview_note(self, note):
        if not self.audio_ok:
            return
        if self.engine_mode == 'rt':
            self.engine.trigger(6, self.get_melody_wave(note, self.melody_instrument, 1), 0.9)
        else:
            self.play_sound(self.get_melody_sound(note, self.melody_instrument, 1), self.melody_mixer, False)

    def preview_drum(self, index):
        if not self.audio_ok:
            return
        if self.engine_mode == 'rt':
            self.engine.trigger(index, self.effective_drum_wave(index))
        else:
            self.play_sound(self.drum_sounds[index], self.drum_mixer[index], False)

    # -- keyboard piano --------------------------------------------------------

    def rebuild_kb_label_map(self):
        mapping = {}
        for key, offset in KB_KEY_OFFSETS.items():
            midi = 48 + (self.kb_base_octave - 3) * 12 + offset
            name = f'{NOTE_NAMES[midi % 12]}{midi // 12 - 1}'
            if name in PIANO_NOTE_ROW and midi not in mapping:
                mapping[midi] = KB_KEY_LABELS[key]
        self.kb_label_map = mapping

    def set_kb_octave(self, delta):
        self.kb_base_octave = clamp(self.kb_base_octave + delta, 1, 4)
        self.rebuild_kb_label_map()
        self.set_status(f'Keyboard octave: C{self.kb_base_octave}')

    def kb_note_on(self, key):
        if key in self.kb_held:
            return
        offset = KB_KEY_OFFSETS[key]
        midi = 48 + (self.kb_base_octave - 3) * 12 + offset
        name = f'{NOTE_NAMES[midi % 12]}{midi // 12 - 1}'
        if name not in PIANO_NOTE_ROW:
            return
        row = PIANO_NOTE_ROW[name]
        self.preview_note(name)
        placed_step = None
        if self.capture_armed and self.playing:
            position = self.current_step + self.playhead_fraction()
            placed_step = int(round(position)) % NUM_STEPS
            self.set_melody_cell(row, placed_step, (self.melody_instrument, 1))
            self.capture_count += 1
        self.kb_held[key] = (row, placed_step, time.perf_counter(), name)

    def kb_note_off(self, key):
        info = self.kb_held.pop(key, None)
        if info is None or info[1] is None:
            return
        row, step, start_time, name = info
        elapsed_steps = (time.perf_counter() - start_time) / max(self.step_duration, 1e-4)
        length = clamp(int(round(elapsed_steps)), 1, NUM_STEPS - step)
        cell = self.melody_banks[self.active_bank][row][step]
        if cell is not None and cell[0] == self.melody_instrument:
            self.melody_banks[self.active_bank][row][step] = (cell[0], max(1, length))

    def toggle_capture(self):
        self.capture_armed = not self.capture_armed
        if self.capture_armed:
            self.push_undo()
            self.capture_count = 0
            self.set_status('Capture armed - play the keyboard while playback runs')
        else:
            self.set_status(f'Capture off - {self.capture_count} note(s) placed')

    # -- WAV export ------------------------------------------------------------

    def bars_to_export(self):
        if self.song_enabled and any(value is not None for value in self.arrangement):
            return self.song_length
        return 1

    def render_export(self, stem=None):
        """Offline-render the loop/song to a float stereo buffer.

        stem=None renders the full mix (master FX + master volume applied);
        stem=('drum', i) | ('melody', 0) | ('clip', i) renders that track only,
        dry of master processing — used for stems export.
        """
        bars = self.bars_to_export()
        interval = 60.0 / self.bpm / 4
        bar_samples = int(round(16 * interval * SAMPLE_RATE))
        total = max(1, bars * bar_samples)
        buffer = np.zeros((total, 2), dtype=np.float64)
        offsets = step_offsets(self.swing, self.bpm)
        solo = any_track_soloed(self.drum_mixer, self.melody_mixer, self.audio_tracks)
        master_gain = self.master_volume if stem is None else 1.0

        def wanted(kind, index):
            return stem is None or stem == (kind, index)

        with self.audio_lock:
            tracks = list(self.audio_tracks)

        drum_fx_waves = [apply_track_fx(self.effective_drum_wave(index), **self.track_fx_kwargs(track))
                         for index, track in enumerate(self.drum_mixer)]
        melody_fx = self.track_fx_kwargs(self.melody_mixer)
        melody_fx_cache = {}

        def fx_melody_wave(note, instrument, length):
            key = (note, instrument, length)
            if key not in melody_fx_cache:
                melody_fx_cache[key] = apply_track_fx(self.get_melody_wave(note, instrument, length), **melody_fx)
            return melody_fx_cache[key]

        clip_fx_cache = {}

        def fx_clip_wave(track):
            key = id(track)
            if key not in clip_fx_cache:
                fx = self.track_fx_kwargs(track)
                pcm = track['pcm'].astype(np.float64) / 32767.0
                if fx['space'] > 0.005 or fx['echo'] > 0.005 or fx['tone'] < 0.995:
                    left_channel = apply_track_fx(pcm[:, 0], **fx)
                    right_channel = apply_track_fx(pcm[:, 1], **fx)
                    clip_fx_cache[key] = np.column_stack((left_channel, right_channel)).astype(np.float32)
                else:
                    clip_fx_cache[key] = pcm.astype(np.float32)
            return clip_fx_cache[key]

        for bar in range(bars):
            if self.song_enabled:
                bank = self.arrangement[bar % len(self.arrangement)]
                if bank is None:
                    continue
            else:
                bank = self.active_bank
            drum_bank = self.drum_banks[bank]
            velocity_bank = self.drum_velocities[bank]
            melody_bank = self.melody_banks[bank]
            bar_start = bar * bar_samples
            for step in range(NUM_STEPS):
                position = bar_start + int(offsets[step] * SAMPLE_RATE)
                for index, wave in enumerate(drum_fx_waves):
                    if drum_bank[index][step] and wanted('drum', index):
                        track = self.drum_mixer[index]
                        if track_is_audible(track, solo):
                            left, right = pan_to_lr(track['volume'], track['pan'])
                            gain_l = left * velocity_bank[index][step] * master_gain
                            gain_r = right * velocity_bank[index][step] * master_gain
                            mix_into_buffer(buffer, position, wave, gain_l, gain_r)
                if wanted('melody', 0):
                    for row, note in enumerate(PIANO_NOTES):
                        cell = melody_bank[row][step]
                        if cell is not None:
                            instrument, length = cell
                            if track_is_audible(self.melody_mixer, solo):
                                left, right = pan_to_lr(self.melody_mixer['volume'], self.melody_mixer['pan'])
                                wave = fx_melody_wave(note, instrument, length)
                                mix_into_buffer(buffer, position, wave,
                                                left * master_gain, right * master_gain)
                for index, track in enumerate(tracks):
                    if track['start_step'] == step and wanted('clip', index) and track_is_audible(track, solo):
                        left, right = pan_to_lr(track['volume'], track['pan'])
                        mix_into_buffer(buffer, position, fx_clip_wave(track),
                                        left * master_gain, right * master_gain)

        if stem is None:
            buffer = apply_master_fx(buffer, space=self.master_fx['space'], echo=self.master_fx['echo'],
                                     tone=self.master_fx['tone'], bpm=self.bpm)
        return finalize_buffer(buffer)

    def export_wav(self, stems=False):
        if not self.audio_ok:
            self.set_status('No audio device - export unavailable')
            return
        path = file_dialog('save', 'Export WAV', [('WAV Audio', '*.wav'), ('All Files', '*.*')])
        if not path:
            return
        base = path[:-4] if path.lower().endswith('.wav') else path
        try:
            if not stems:
                pcm_bytes, _peak = self.render_export()
                write_wav(base + '.wav', pcm_bytes)
                seconds = self.bars_to_export() * 16 * 60.0 / self.bpm / 4
                what = 'song' if self.song_enabled else 'loop'
                self.set_status(f'Exported {what}: {base}.wav ({seconds:.1f}s)', 10.0)
                return
            with self.audio_lock:
                clip_jobs = [(f'CLIP {track["name"]}', ('clip', index)) for index, track in enumerate(self.audio_tracks)]
            jobs = [('MIX', None)]
            jobs += [(f'DRUM {name}', ('drum', index)) for index, name in enumerate(DRUM_TRACKS)]
            jobs += [('MELODY', ('melody', 0))]
            jobs += clip_jobs
            for label, stem in jobs:
                pcm_bytes, _peak = self.render_export(stem=stem)
                safe_label = ''.join(ch if ch.isalnum() or ch in ' -_' else '_' for ch in label)
                write_wav(f'{base} - {safe_label}.wav', pcm_bytes)
            self.set_status(f'Exported {len(jobs)} stems starting with: {base} - *.wav', 10.0)
        except Exception as error:
            self.set_status(f"Couldn't export WAV ({error})")

    # -- audio import / microphone --------------------------------------------

    def import_audio_file(self, path):
        extension = os.path.splitext(path)[1].lower()
        if extension not in SUPPORTED_AUDIO_EXTENSIONS:
            self.set_status(f'Unsupported audio file: {os.path.basename(path)}')
            return
        if not self.audio_ok:
            self.set_status('No audio device - cannot import audio')
            return
        with self.audio_lock:
            if len(self.audio_tracks) >= MAX_AUDIO_TRACKS:
                self.set_status('Audio view is full (5 clips) - delete one first')
                return
        try:
            sound = pygame.mixer.Sound(path)
            array = pygame.sndarray.array(sound)
            if len(array.shape) == 2:
                waveform = np.mean(array, axis=1)
                pcm = array.astype(np.float32) / 32767.0
            else:
                waveform = array
                pcm = np.column_stack((array, array)).astype(np.float32) / 32767.0
            waveform = waveform.astype(np.float32)
            peak = np.max(np.abs(waveform))
            if peak > 0:
                waveform /= peak
            track = {
                'name': os.path.basename(path),
                'path': os.path.abspath(path),
                'sound': sound,
                'waveform': waveform,
                'pcm': pcm,
                'length': sound.get_length(),
                'start_step': 0,
                'muted': False,
                'solo': False,
                'pan': 0.0,
                'volume': 0.8,
            }
            with self.audio_lock:
                self.audio_tracks.append(track)
            self.dirty = True
            self.set_status(f'Imported: {track["name"]}')
        except Exception as error:
            self.set_status(f"Couldn't import: {os.path.basename(path)} ({error})")

    def delete_audio_track(self, index):
        with self.audio_lock:
            if 0 <= index < len(self.audio_tracks):
                del self.audio_tracks[index]
                self.dirty = True

    def start_recording(self):
        if not SOUNDDEVICE_AVAILABLE:
            self.set_status('Microphone support unavailable (sounddevice not installed)')
            return
        if not self.microphone_devices:
            self.set_status('No microphone input device found')
            return
        device_index, device_name = self.microphone_devices[self.selected_microphone]
        try:
            info = sd.query_devices(device_index)
            samplerate = int(info['default_samplerate'])
            channels = min(1, info['max_input_channels'])
            self.recording_chunks = []
            self.recording_samplerate = samplerate
            self.recording_stream = sd.InputStream(
                device=device_index, samplerate=samplerate, channels=channels,
                dtype='float32', callback=self.microphone_callback)
            self.recording_stream.start()
            self.recording = True
            self.recording_started_at = time.time()
            self.set_status(f'Recording from: {device_name}')
        except Exception as error:
            self.recording_stream = None
            self.recording = False
            self.set_status(f"Couldn't start microphone ({error})")

    def microphone_callback(self, indata, frames, time_info, status):
        if self.recording:
            self.recording_chunks.append(indata.copy())

    def stop_recording(self):
        self.recording = False
        if self.recording_stream is not None:
            try:
                self.recording_stream.stop()
                self.recording_stream.close()
            except Exception:
                pass
            self.recording_stream = None
        if not self.recording_chunks:
            self.set_status('No microphone audio recorded')
            return
        recording = np.clip(np.concatenate(self.recording_chunks, axis=0), -1, 1)
        filename = time.strftime('FluroStudio_recording_%Y%m%d_%H%M%S.wav')
        path = os.path.join(recordings_dir(), filename)
        try:
            with wave.open(path, 'wb') as wav_file:
                wav_file.setnchannels(1)
                wav_file.setsampwidth(2)
                wav_file.setframerate(self.recording_samplerate)
                wav_file.writeframes((recording * 32767).astype(np.int16).tobytes())
        except Exception as error:
            self.set_status(f"Couldn't save recording ({error})")
            return
        self.import_audio_file(path)
        self.set_status(f'Recording saved: {path}', 10.0)

    # -- project save/load -----------------------------------------------------

    def export_project(self):
        with self.audio_lock:
            audio_meta = []
            for track in self.audio_tracks:
                audio_meta.append({
                    'name': track.get('name', 'Audio'),
                    'path': track.get('path', ''),
                    'start_step': track.get('start_step', 0),
                    'muted': track.get('muted', False),
                    'solo': track.get('solo', False),
                    'pan': track.get('pan', 0.0),
                    'volume': track.get('volume', 0.8),
                })
        project = {
            'version': PROJECT_VERSION,
            'app': 'FluroStudio',
            'bpm': self.bpm,
            'swing': self.swing,
            'metronome': self.metronome,
            'master_volume': self.master_volume,
            'active_bank': self.active_bank,
            'theme': self.theme_name,
            'melody_instrument': self.melody_instrument,
            'piano_scroll': self.piano_scroll,
            'current_view': self.current_view,
            'drum_banks': deepcopy(self.drum_banks),
            'drum_velocities': deepcopy(self.drum_velocities),
            'melody_banks': deepcopy(self.melody_banks),
            'drum_mixer': deepcopy(self.drum_mixer),
            'melody_mixer': deepcopy(self.melody_mixer),
            'master_fx': dict(self.master_fx),
            'drum_samples': [{'name': s['name'], 'path': s['path']} if s else None for s in self.drum_samples],
            'song': {'enabled': self.song_enabled, 'length': self.song_length, 'arrangement': list(self.arrangement)},
            'audio_tracks': audio_meta,
        }
        self.dirty = False
        return project

    def import_project(self, project, base_dir=''):
        """Apply a project dict (v1/v2/v3/v4). Returns a list of missing audio paths."""
        missing = []
        self.playing = False
        self.drag = None
        self.stop_sounds()

        bpm = project.get('bpm', self.bpm)
        try:
            self.bpm = int(clamp(int(bpm), MIN_BPM, MAX_BPM))
        except (TypeError, ValueError):
            pass
        try:
            self.swing = int(clamp(int(project.get('swing', self.swing)), 0, 100))
        except (TypeError, ValueError):
            pass
        self.metronome = bool(project.get('metronome', self.metronome))
        try:
            self.master_volume = clamp(float(project.get('master_volume', self.master_volume)), 0.0, 1.0)
        except (TypeError, ValueError):
            pass

        fallback_instrument = project.get('melody_instrument', self.melody_instrument)
        if fallback_instrument not in INSTRUMENTS:
            fallback_instrument = self.melody_instrument
        self.melody_instrument = fallback_instrument

        drum_banks = sanitize_drum_banks(project.get('drum_banks'))
        if drum_banks is None:
            legacy = project.get('pattern')
            if isinstance(legacy, list) and len(legacy) == len(DRUM_TRACKS):
                legacy_banks = [legacy] + [make_empty_drum_pattern() for _ in range(NUM_BANKS - 1)]
                drum_banks = sanitize_drum_banks(legacy_banks)
        if drum_banks is not None:
            self.drum_banks = drum_banks

        velocity_banks = sanitize_velocity_banks(project.get('drum_velocities'))
        if velocity_banks is None:
            velocity_banks = make_default_velocity_banks()
        self.drum_velocities = velocity_banks

        melody_banks = sanitize_melody_banks(project.get('melody_banks'), fallback_instrument)
        if melody_banks is None:
            legacy = project.get('melody_pattern')
            if isinstance(legacy, list) and len(legacy) == len(PIANO_NOTES):
                melody_banks = sanitize_melody_banks(
                    [legacy] + [make_empty_melody_pattern() for _ in range(NUM_BANKS - 1)], fallback_instrument)
        if melody_banks is not None:
            self.melody_banks = melody_banks

        try:
            self.active_bank = int(clamp(int(project.get('active_bank', 0)), 0, NUM_BANKS - 1))
        except (TypeError, ValueError):
            self.active_bank = 0

        song = sanitize_song(project.get('song'))
        if song is None:
            # Legacy chain mode becomes an arrangement of the filled banks.
            if project.get('chain_mode'):
                filled = [bank for bank in range(NUM_BANKS)
                          if not bank_is_empty(self.drum_banks[bank], self.melody_banks[bank])]
                song = (True, max(SONG_MIN_BARS, len(filled)), (filled + [None] * SONG_MIN_BARS)[:max(SONG_MIN_BARS, len(filled))])
            else:
                song = default_song_state()
                song['arrangement'] = list(song['arrangement'])
        self.song_enabled = song[0]
        self.song_length = song[1]
        self.arrangement = list(song[2])
        self.song_bar = 0

        drum_mixer = project.get('drum_mixer')
        if isinstance(drum_mixer, list) and len(drum_mixer) == len(DRUM_TRACKS):
            self.drum_mixer = [sanitize_mixer_track(item, 0.8) for item in drum_mixer]
        melody_mixer = project.get('melody_mixer')
        if isinstance(melody_mixer, dict):
            self.melody_mixer = sanitize_mixer_track(melody_mixer, 0.75)
        self.master_fx = sanitize_fx_params(project.get('master_fx'))

        saved_samples = project.get('drum_samples')
        self.drum_samples = [None] * len(DRUM_TRACKS)
        if isinstance(saved_samples, list):
            for index, raw in enumerate(saved_samples[:len(DRUM_TRACKS)]):
                if not isinstance(raw, dict):
                    continue
                resolved = resolve_audio_path(str(raw.get('path', '')), base_dir)
                if resolved is None:
                    missing.append(str(raw.get('path', '')))
                    continue
                try:
                    sound = pygame.mixer.Sound(resolved)
                    array = pygame.sndarray.array(sound)
                    wave_form = np.mean(array, axis=1) if len(array.shape) == 2 else array
                    wave_form = wave_form.astype(np.float32)
                    peak = np.max(np.abs(wave_form))
                    if peak > 0:
                        wave_form /= peak
                    self.drum_samples[index] = {'name': str(raw.get('name', 'sample')), 'path': resolved, 'wave': wave_form}
                except Exception:
                    missing.append(str(raw.get('path', '')))

        try:
            self.piano_scroll = int(clamp(int(project.get('piano_scroll', self.piano_scroll)), 0, len(PIANO_NOTES) - PIANO_VISIBLE_ROWS))
        except (TypeError, ValueError):
            pass

        view = project.get('current_view', self.current_view)
        if view in ('SEQUENCER', 'PIANO', 'AUDIO', 'SONG', 'MIXER'):
            self.current_view = view
        theme = project.get('theme')
        if theme in THEMES and theme != self.theme_name:
            self.set_theme(theme)

        with self.audio_lock:
            self.audio_tracks = []
            for raw in project.get('audio_tracks', []):
                if not isinstance(raw, dict):
                    continue
                meta = sanitize_audio_track_meta(raw)
                resolved = resolve_audio_path(meta['path'], base_dir)
                if resolved is None:
                    missing.append(meta['path'])
                    continue
                before = len(self.audio_tracks)
                self.import_audio_file(resolved)
                if len(self.audio_tracks) > before:
                    loaded = self.audio_tracks[-1]
                    loaded['start_step'] = meta['start_step']
                    loaded['muted'] = meta['muted']
                    loaded['solo'] = meta['solo']
                    loaded['pan'] = meta['pan']
                    loaded['volume'] = meta['volume']
        self.undo_stack.clear()
        self.redo_stack.clear()
        self.dirty = False
        return missing

    def save_project(self, path=None):
        if self.recording:
            self.set_status('Stop the microphone recording before saving')
            return False
        if path is None:
            path = file_dialog('save', 'Save FluroStudio Project', [
                ('FluroStudio Project', '*.fluro'), ('JSON', '*.json'), ('All Files', '*.*')])
        if not path:
            return False
        try:
            with open(path, 'w', encoding='utf-8') as project_file:
                json.dump(self.export_project(), project_file, indent=2)
        except Exception as error:
            self.set_status(f"Couldn't save project ({error})")
            return False
        self.set_status(f'Project saved: {path}', 8.0)
        return True

    def load_project(self, path=None):
        if self.recording:
            self.set_status('Stop the microphone recording before loading a project')
            return False
        if path is None:
            path = file_dialog('open', 'Load FluroStudio Project', [
                ('FluroStudio Project', '*.fluro'), ('JRYBeats Project', '*.jry'), ('JSON', '*.json'), ('All Files', '*.*')])
        if not path:
            return False
        try:
            with open(path, 'r', encoding='utf-8') as project_file:
                project = json.load(project_file)
        except Exception as error:
            self.set_status(f"Couldn't load project ({error})")
            return False
        missing = self.import_project(project, base_dir=os.path.dirname(os.path.abspath(path)))
        if missing:
            self.set_status(f'Project loaded ({len(missing)} audio file(s) missing): {path}', 10.0)
        else:
            self.set_status(f'Project loaded: {path}', 8.0)
        return True

    def load_project_file(self, path):
        return self.load_project(path)

    def autosave(self):
        if not self.dirty:
            return
        path = os.path.join(recordings_dir(), 'autosave.fluro')
        try:
            with open(path, 'w', encoding='utf-8') as project_file:
                json.dump(self.export_project(), project_file)
        except Exception:
            return
        self.dirty = True  # an autosave does not clear the dirty flag like a real save
        self.set_status(f'Autosaved to {path}', 4.0)

    def recover_autosave(self):
        path = os.path.join(recordings_dir(), 'autosave.fluro')
        if not os.path.exists(path):
            self.set_status('No autosave found')
            return
        self.load_project(path)

    # -- theme -----------------------------------------------------------------

    def set_theme(self, name):
        if name not in THEMES:
            return
        self.theme_name = name
        self.theme = theme_colors(name)
        self.build_icons()

    # -- coordinate mapping (logical canvas <-> window) --------------------------

    def to_logical(self, position):
        scale, ox, oy = self.view_transform
        return (int((position[0] - ox) / scale), int((position[1] - oy) / scale))

    # -- input handling ----------------------------------------------------------

    def handle_event(self, event):
        if event.type == pygame.QUIT:
            return False
        if self.modal is not None:
            if event.type in (pygame.KEYDOWN, pygame.MOUSEBUTTONDOWN, pygame.MOUSEWHEEL):
                self.handle_modal_event(event)
            return True
        if event.type == pygame.VIDEORESIZE:
            width = max(720, event.w)
            height = max(480, event.h)
            self.window = pygame.display.set_mode((width, height), pygame.RESIZABLE)
            return True
        if event.type == pygame.DROPFILE:
            sample_row = self.sequencer_row_at(self.to_logical(event.pos)) if self.current_view == 'SEQUENCER' else None
            if sample_row is not None:
                self.assign_drum_sample(sample_row, event.file)
            else:
                self.import_audio_file(event.file)
                self.current_view = 'AUDIO'
        elif event.type == pygame.MOUSEWHEEL:
            if self.current_view == 'PIANO':
                self.piano_scroll = clamp(self.piano_scroll - event.y, 0, len(PIANO_NOTES) - PIANO_VISIBLE_ROWS)
        elif event.type == pygame.KEYDOWN:
            self.handle_keydown(event)
        elif event.type == pygame.KEYUP:
            if event.key in self.kb_held:
                self.kb_note_off(event.key)
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button in (1, 3):
            self.handle_mouse_down(self.to_logical(event.pos), event.button)
        elif event.type == pygame.MOUSEBUTTONUP and event.button in (1, 3):
            was_knob = self.drag is not None and self.drag[0] == 'knob'
            self.paint_active = False
            self.paint_value = None
            self.drag = None
            if was_knob:
                self.rebuild_baked_sounds()
        elif event.type == pygame.MOUSEMOTION:
            self.handle_mouse_motion(self.to_logical(event.pos))
        return True

    def handle_keydown(self, event):
        ctrl = event.mod & pygame.KMOD_CTRL
        shift = event.mod & pygame.KMOD_SHIFT
        if ctrl and event.key == pygame.K_z:
            if shift:
                self.redo()
            else:
                self.undo()
        elif ctrl and event.key == pygame.K_y:
            self.redo()
        elif ctrl and event.key == pygame.K_s:
            self.save_project()
        elif ctrl and event.key == pygame.K_o:
            self.load_project()
        elif ctrl and event.key == pygame.K_e:
            self.export_wav(stems=bool(shift))
        elif ctrl and pygame.K_1 <= event.key <= pygame.K_4:
            self.active_bank = event.key - pygame.K_1
        elif (self.current_view == 'PIANO' and self.kb_enabled and not ctrl
              and not shift and event.key in KB_KEY_OFFSETS):
            self.kb_note_on(event.key)
        elif self.current_view == 'PIANO' and event.key == pygame.K_F1:
            self.set_kb_octave(-1)
        elif self.current_view == 'PIANO' and event.key == pygame.K_F2:
            self.set_kb_octave(1)
        elif event.key == pygame.K_SPACE:
            self.toggle_playback()
        elif event.key == pygame.K_s and not ctrl:
            self.stop_playback()
        elif event.key == pygame.K_m:
            self.metronome = not self.metronome
        elif event.key == pygame.K_t:
            self.tap_tempo()
        elif event.key == pygame.K_r and not ctrl:
            self.recover_autosave()
        elif event.key == pygame.K_LEFT:
            if shift:
                self.swing = clamp(self.swing - 5, 0, 100)
            else:
                self.bpm = max(MIN_BPM, self.bpm - 5)
        elif event.key == pygame.K_RIGHT:
            if shift:
                self.swing = clamp(self.swing + 5, 0, 100)
            else:
                self.bpm = min(MAX_BPM, self.bpm + 5)
        elif event.key == pygame.K_UP:
            self.bpm = min(MAX_BPM, self.bpm + 1)
        elif event.key == pygame.K_DOWN:
            self.bpm = max(MIN_BPM, self.bpm - 1)
        elif pygame.K_1 <= event.key <= pygame.K_5:
            self.current_view = ('SEQUENCER', 'PIANO', 'AUDIO', 'SONG', 'MIXER')[event.key - pygame.K_1]

    def handle_modal_event(self, event):
        modal = self.modal
        if event.type == pygame.KEYDOWN:
            if event.key == pygame.K_ESCAPE:
                self.modal = None
                return
            if modal['kind'] != 'code':
                return
            if event.key in (pygame.K_RETURN, pygame.K_KP_ENTER):
                if self.load_beat_code(modal['field']):
                    self.modal = None
                return
            if event.key == pygame.K_BACKSPACE:
                modal['field'] = modal['field'][:-1]
                return
            if event.key == pygame.K_v and (event.mod & pygame.KMOD_CTRL):
                pasted = clipboard_get().strip()
                if pasted:
                    modal['field'] = pasted[:4000]
                    self.set_status('Pasted from clipboard')
                return
            char = event.unicode
            if char and char.isprintable() and len(modal['field']) < 4000:
                modal['field'] += char
        elif event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            position = self.to_logical(event.pos)
            if modal['kind'] == 'code':
                if CODE_CLOSE_RECT.collidepoint(position):
                    self.modal = None
                elif CODE_COPY_RECT.collidepoint(position):
                    if clipboard_put(modal['code']):
                        self.set_status('Beat code copied - paste it anywhere to share')
                    else:
                        self.set_status('Clipboard blocked - select and copy the code manually')
                elif CODE_LOAD_RECT.collidepoint(position):
                    if self.load_beat_code(modal['field']):
                        self.modal = None
            else:
                if EUCLID_CLOSE_RECT.collidepoint(position):
                    self.modal = None
                    return
                if EUCLID_APPLY_RECT.collidepoint(position):
                    self.apply_euclid(modal['track'], modal['pulses'], modal['rotate'])
                    return
                for index, rect in enumerate(EUCLID_TRACK_RECTS):
                    if rect.collidepoint(position):
                        modal['track'] = index
                        return
                if EUCLID_MINUS_P.collidepoint(position):
                    modal['pulses'] = clamp(modal['pulses'] - 1, 0, NUM_STEPS)
                elif EUCLID_PLUS_P.collidepoint(position):
                    modal['pulses'] = clamp(modal['pulses'] + 1, 0, NUM_STEPS)
                elif EUCLID_MINUS_R.collidepoint(position):
                    modal['rotate'] = clamp(modal['rotate'] - 1, -8, 8)
                elif EUCLID_PLUS_R.collidepoint(position):
                    modal['rotate'] = clamp(modal['rotate'] + 1, -8, 8)

    def draw_modal(self):
        theme = self.theme
        modal = self.modal
        self.draw_tint(pygame.Rect(0, 0, LOGICAL_W, LOGICAL_H), (0, 0, 0), 150)
        card = CODE_MODAL_RECT if modal['kind'] == 'code' else EUCLID_MODAL_RECT
        self.draw_card(card)
        if modal['kind'] == 'code':
            self.draw_text('BEAT CODE', (card.left + 20, card.top + 18), self.fonts['section'], theme['text'])
            self.draw_text('Your project as one shareable string - paste it into a comment and anyone can load it:',
                           (card.left + 20, card.top + 56), self.fonts['tiny'], theme['text_dim'])
            self.draw_button(CODE_COPY_RECT, 'COPY', active=False)
            code = modal['code']
            shown = code if len(code) <= 90 else code[:66] + ' … ' + code[-20:]
            self.draw_text(shown, (card.left + 20, card.top + 104), self.fonts['tiny'], theme['accent'])
            self.draw_text('(full code sits in the copy button - or select below)', (card.left + 20, card.top + 128),
                           self.fonts['tiny'], theme['text_faint'])
            pygame.draw.rect(self.screen, theme['bg'], CODE_TEXT_RECT, border_radius=6)
            pygame.draw.rect(self.screen, theme['line'], CODE_TEXT_RECT, 1, border_radius=6)
            wrapped = '\n'.join(code[i:i + 62] for i in range(0, len(code), 62))[:1100]
            lines = wrapped.split('\n')
            for index, line in enumerate(lines[:6]):
                self.draw_text(line, (CODE_TEXT_RECT.left + 10, CODE_TEXT_RECT.top + 8 + index * 18),
                               self.fonts['tiny'], theme['text_dim'])
            self.draw_text('LOAD A CODE:', (card.left + 20, CODE_INPUT_RECT.top - 22), self.fonts['micro'], theme['text_faint'])
            pygame.draw.rect(self.screen, theme['bg'], CODE_INPUT_RECT, border_radius=6)
            pygame.draw.rect(self.screen, theme['accent'], CODE_INPUT_RECT, 1, border_radius=6)
            field = modal['field']
            tail = field[-46:] if len(field) > 46 else field
            cursor = '|' if int(time.time() * 2) % 2 == 0 else ''
            self.draw_text(tail + cursor, (CODE_INPUT_RECT.left + 10, CODE_INPUT_RECT.centery),
                           self.fonts['tiny'], theme['text'], align='midleft')
            self.draw_button(CODE_LOAD_RECT, 'LOAD', active=True)
            self.draw_button(CODE_CLOSE_RECT, 'X', danger=True)
        else:
            self.draw_text('EUCLIDEAN RHYTHM', (card.left + 20, card.top + 18), self.fonts['section'], theme['text'])
            self.draw_text('TRACK', (card.left + 20, EUCLID_TRACK_RECTS[0].top + 6), self.fonts['micro'], theme['text_faint'])
            for index, rect in enumerate(EUCLID_TRACK_RECTS):
                self.draw_button(rect, DRUM_TRACKS[index][:5], active=modal['track'] == index)
            self.draw_text('PULSES', (card.left + 20, EUCLID_VAL_P.centery), self.fonts['small'], theme['text_dim'], align='midleft')
            self.draw_button(EUCLID_MINUS_P, '-', self.fonts['small'])
            self.draw_button(EUCLID_VAL_P, str(modal['pulses']), self.fonts['mono'])
            self.draw_button(EUCLID_PLUS_P, '+', self.fonts['small'])
            self.draw_text('ROTATE', (card.left + 20, EUCLID_VAL_R.centery), self.fonts['small'], theme['text_dim'], align='midleft')
            self.draw_button(EUCLID_MINUS_R, '-', self.fonts['small'])
            self.draw_button(EUCLID_VAL_R, str(modal['rotate']), self.fonts['mono'])
            self.draw_button(EUCLID_PLUS_R, '+', self.fonts['small'])
            self.draw_text('Evenly spreads the pulses across the bar - try 7/16 on HI-HAT, rotated.',
                           (card.left + 20, card.bottom - 44), self.fonts['tiny'], theme['text_faint'])
            self.draw_button(EUCLID_APPLY_RECT, 'APPLY TO BANK', active=True)
            self.draw_button(EUCLID_CLOSE_RECT, 'CLOSE')

    def sequencer_cell_at(self, position):
        for track in range(len(DRUM_TRACKS)):
            y = SEQ_TRACK_TOP + track * SEQ_ROW_HEIGHT
            for step in range(NUM_STEPS):
                x = SEQ_START_X + step * (SEQ_STEP_SIZE + SEQ_STEP_GAP)
                if pygame.Rect(x, y + 14, SEQ_STEP_SIZE, SEQ_STEP_SIZE).collidepoint(position):
                    return track, step
        return None

    def sequencer_row_at(self, position):
        for track in range(len(DRUM_TRACKS)):
            y = SEQ_TRACK_TOP + track * SEQ_ROW_HEIGHT
            if pygame.Rect(20, y, 190, SEQ_ROW_HEIGHT).collidepoint(position):
                return track
        return None

    def piano_cell_at(self, position):
        if position[0] < PIANO_GRID_X:
            return None
        row = (position[1] - PIANO_GRID_TOP) // PIANO_ROW_H
        col = (position[0] - PIANO_GRID_X) // PIANO_STEP_W
        if 0 <= row < PIANO_VISIBLE_ROWS and 0 <= col < NUM_STEPS:
            note_index = self.piano_scroll + row
            if note_index < len(PIANO_NOTES):
                return note_index, int(col)
        return None

    def song_cell_at(self, position):
        bar_w = (SONG_GRID_RIGHT - SONG_GRID_X) / self.song_length
        col = int((position[0] - SONG_GRID_X) // bar_w)
        row = (position[1] - SONG_GRID_TOP) // SONG_BAR_H
        if 0 <= col < self.song_length and 0 <= row < NUM_BANKS:
            return int(row), col
        return None

    def handle_mouse_down(self, position, button):
        if PLAY_RECT.collidepoint(position):
            self.toggle_playback()
            return
        if STOP_RECT.collidepoint(position):
            self.stop_playback()
            return
        if BPM_MINUS_RECT.collidepoint(position):
            self.bpm = max(MIN_BPM, self.bpm - 5)
            return
        if BPM_PLUS_RECT.collidepoint(position):
            self.bpm = min(MAX_BPM, self.bpm + 5)
            return
        if TAP_RECT.collidepoint(position):
            self.tap_tempo()
            return
        if SWING_TRACK_RECT.inflate(0, 24).collidepoint(position):
            self.drag = ('swing',)
            self.apply_swing_drag(position)
            return
        if METRO_RECT.collidepoint(position):
            self.metronome = not self.metronome
            return
        for index, rect in enumerate(BANK_RECTS):
            if rect.collidepoint(position):
                self.active_bank = index
                return
        if UNDO_RECT.collidepoint(position):
            self.undo()
            return
        if REDO_RECT.collidepoint(position):
            self.redo()
            return
        if THEME_RECT.collidepoint(position):
            self.set_theme('light' if self.theme_name == 'dark' else 'dark')
            return
        if EXPORT_RECT.collidepoint(position):
            self.export_wav(stems=bool(pygame.key.get_mods() & pygame.KMOD_SHIFT))
            return
        if SAVE_RECT.collidepoint(position):
            self.save_project()
            return
        if LOAD_RECT.collidepoint(position):
            self.stop_playback()
            self.load_project()
            return
        if CODE_RECT.collidepoint(position):
            self.open_code_modal()
            return
        if SEQ_TAB_RECT.collidepoint(position):
            self.current_view = 'SEQUENCER'
            return
        if PIANO_TAB_RECT.collidepoint(position):
            self.current_view = 'PIANO'
            return
        if AUDIO_TAB_RECT.collidepoint(position):
            self.current_view = 'AUDIO'
            return
        if SONG_TAB_RECT.collidepoint(position):
            self.current_view = 'SONG'
            return
        if MIXER_TAB_RECT.collidepoint(position):
            self.current_view = 'MIXER'
            return
        if self.current_view in ('SEQUENCER', 'PIANO'):
            if COPY_RECT.collidepoint(position):
                self.copy_bank_forward()
                return
            if DEMO_RECT.collidepoint(position):
                self.load_demo_into_bank()
                return
            if CLEAR_RECT.collidepoint(position):
                self.clear_bank()
                return
        if self.current_view == 'PIANO':
            if KB_RECT.collidepoint(position):
                self.kb_enabled = not self.kb_enabled
                state = 'on - play with your keyboard (F1/F2 shift octave)' if self.kb_enabled else 'off'
                self.set_status(f'Keyboard piano {state}')
                return
            if CAPTURE_RECT.collidepoint(position):
                self.toggle_capture()
                return
            if OCT_RECT.collidepoint(position):
                self.set_kb_octave(1)
                return

        if self.current_view == 'SEQUENCER':
            if EUCLID_RECT.collidepoint(position):
                self.open_euclid_modal()
                return
            if VAR_RECT.collidepoint(position):
                self.apply_variation()
                return
            cell = self.sequencer_cell_at(position)
            if cell:
                track, step = cell
                shift = pygame.key.get_mods() & pygame.KMOD_SHIFT
                if button == 1 and shift and self.drum_banks[self.active_bank][track][step]:
                    self.push_undo()
                    self.drag = ('velocity', track, step,
                                 self.drum_velocities[self.active_bank][track][step], position[1])
                    return
                self.push_undo()
                self.paint_active = True
                if button == 3:
                    self.paint_value = False
                else:
                    self.paint_value = not self.drum_banks[self.active_bank][track][step]
                    if self.paint_value:
                        self.preview_drum(track)
                self.drum_banks[self.active_bank][track][step] = self.paint_value
                return
            row = self.sequencer_row_at(position)
            if row is not None:
                sample_button = pygame.Rect(150, SEQ_TRACK_TOP + row * SEQ_ROW_HEIGHT + 14, 62, 26)
                if sample_button.collidepoint(position):
                    if button == 3:
                        self.clear_drum_sample(row)
                        return
                    if not TK_AVAILABLE:
                        self.set_status('File dialogs need tkinter - drag a sound onto this row instead')
                        return
                    path = file_dialog('open', f'Sample for {DRUM_TRACKS[row]}', [
                        ('Audio Files', '*.wav *.mp3 *.ogg *.flac'), ('All Files', '*.*')])
                    if path:
                        self.assign_drum_sample(row, path)
                    return
            return

        if self.current_view == 'PIANO':
            if RND_RECT.collidepoint(position):
                self.randomize_melody()
                return
            if CHORD_RECT.collidepoint(position):
                self.cycle_chord_mode()
                return
            if position[0] < PIANO_GRID_X:
                row = (position[1] - PIANO_GRID_TOP) // PIANO_ROW_H
                note_index = self.piano_scroll + row
                if 0 <= row < PIANO_VISIBLE_ROWS and note_index < len(PIANO_NOTES):
                    self.preview_note(PIANO_NOTES[note_index])
                return
            cell = self.piano_cell_at(position)
            if cell:
                note_index, step = cell
                bank = self.melody_banks[self.active_bank]
                existing = bank[note_index][step]
                shift = pygame.key.get_mods() & pygame.KMOD_SHIFT
                if button == 1 and shift and existing is not None:
                    self.push_undo()
                    self.drag = ('length', note_index, step, existing[1], position[0])
                    return
                self.push_undo()
                self.paint_active = True
                note = PIANO_NOTES[note_index]
                if button == 3:
                    self.paint_value = None
                elif existing is not None and existing[0] == self.melody_instrument:
                    self.paint_value = None
                else:
                    self.paint_value = (self.melody_instrument, 1)
                    self.preview_note(note)
                self.paint_melody(note_index, step, self.paint_value)
                return
            for index in range(len(INSTRUMENTS)):
                rect = pygame.Rect(PIANO_GRID_X + index * 88, INSTRUMENT_BUTTON_Y, 80, 30)
                if rect.collidepoint(position):
                    self.melody_instrument = INSTRUMENTS[index]
                    return
            return

        if self.current_view == 'SONG':
            if SONG_TOGGLE_RECT.collidepoint(position):
                self.song_enabled = not self.song_enabled
                state = 'on - playback follows the arrangement' if self.song_enabled else 'off - banks loop'
                self.set_status(f'Song mode {state}')
                return
            if SONG_MINUS_RECT.collidepoint(position):
                self.set_song_length(self.song_length - 4)
                return
            if SONG_PLUS_RECT.collidepoint(position):
                self.set_song_length(self.song_length + 4)
                return
            cell = self.song_cell_at(position)
            if cell:
                bank_row, bar = cell
                self.push_undo()
                if self.arrangement[bar] == bank_row:
                    self.paint_value = None
                else:
                    self.paint_value = bank_row
                    self.active_bank = bank_row
                self.arrangement[bar] = self.paint_value
                self.paint_active = True
            return

        if self.current_view == 'AUDIO':
            if MIC_PREV_RECT.collidepoint(position):
                if self.microphone_devices and not self.recording:
                    self.selected_microphone = (self.selected_microphone - 1) % len(self.microphone_devices)
                return
            if MIC_NEXT_RECT.collidepoint(position) or MIC_DEVICE_RECT.collidepoint(position):
                if self.microphone_devices and not self.recording:
                    self.selected_microphone = (self.selected_microphone + 1) % len(self.microphone_devices)
                return
            if IMPORT_AUDIO_RECT.collidepoint(position):
                if not TK_AVAILABLE:
                    self.set_status('File dialogs need tkinter - use drag & drop instead')
                    return
                path = file_dialog('open', 'Import Audio', [
                    ('Audio Files', '*.wav *.mp3 *.ogg *.flac'), ('All Files', '*.*')])
                if path:
                    self.import_audio_file(path)
                return
            if RECORD_AUDIO_RECT.collidepoint(position):
                if self.recording:
                    self.stop_recording()
                else:
                    self.start_recording()
                return
            for index in range(min(len(self.audio_tracks), 5)):
                track = self.audio_tracks[index]
                y = AUDIO_TRACK_TOP + index * AUDIO_TRACK_HEIGHT
                mute_rect = pygame.Rect(30, y + 18, 30, 25)
                solo_rect = pygame.Rect(66, y + 18, 30, 25)
                delete_rect = pygame.Rect(102, y + 18, 30, 25)
                clip_rect = self.audio_clip_rect(track, y)
                if mute_rect.collidepoint(position):
                    track['muted'] = not track['muted']
                    self.dirty = True
                    return
                if solo_rect.collidepoint(position):
                    track['solo'] = not track['solo']
                    self.dirty = True
                    return
                if delete_rect.collidepoint(position):
                    self.delete_audio_track(index)
                    return
                if clip_rect.collidepoint(position):
                    self.drag = ('audio', index)
                    self.apply_audio_drag(position, index)
                    return
            return

        if self.current_view == 'MIXER':
            for index, (name, track_state, is_master) in enumerate(self.mixer_strips()):
                geometry = mixer_strip_geometry(index)
                if geometry['mute'].collidepoint(position):
                    track_state['muted'] = not track_state.get('muted', False)
                    self.dirty = True
                    return
                if geometry['solo'].collidepoint(position):
                    track_state['solo'] = not track_state.get('solo', False)
                    self.dirty = True
                    return
                for knob_index, knob_rect in enumerate(geometry['knobs']):
                    if knob_rect.collidepoint(position):
                        key = ('fx_space', 'fx_echo', 'fx_tone')[knob_index]
                        if is_master:
                            current = self.master_fx[key[3:]]
                        else:
                            current = track_state.get(key, 1.0 if key == 'fx_tone' else 0.0)
                        self.dirty = True
                        self.drag = ('knob', index, key, position[1], current)
                        return
                if geometry['fader'].inflate(20, 0).collidepoint(position):
                    self.drag = ('fader', index)
                    self.apply_fader_drag(position, index)
                    return
                if geometry['pan'].inflate(0, 16).collidepoint(position):
                    self.drag = ('pan', index)
                    self.apply_pan_drag(position, index)
                    return
            return

    def paint_melody(self, note_index, step, value):
        """Place a painted cell, expanding to a triad when chord mode is on."""
        if value is None or self.chord_mode is None:
            self.set_melody_cell(note_index, step, value)
            return
        instrument = value[0]
        for target_row in place_chord(self.melody_banks[self.active_bank], note_index, step,
                                      self.chord_mode, instrument):
            self.set_melody_cell(target_row, step, (instrument, 1))

    def set_melody_cell(self, note_index, step, value):
        """Set a melody cell and shorten any earlier note this one overlaps."""
        bank = self.melody_banks[self.active_bank]
        bank[note_index][step] = value
        if value is None:
            return
        for earlier in range(step):
            cell = bank[note_index][earlier]
            if cell is not None and earlier + cell[1] > step:
                bank[note_index][earlier] = (cell[0], step - earlier)

    def set_song_length(self, bars):
        new_length = clamp(bars, SONG_MIN_BARS, SONG_MAX_BARS)
        if new_length == self.song_length:
            return
        self.push_undo()
        arrangement = list(self.arrangement[:new_length])
        arrangement += [None] * (new_length - len(arrangement))
        self.arrangement = arrangement
        self.song_length = new_length
        self.song_bar = min(self.song_bar, new_length - 1)

    def handle_mouse_motion(self, position):
        if self.drag is None and not self.paint_active:
            return
        if self.drag:
            kind = self.drag[0]
            if kind == 'swing':
                self.apply_swing_drag(position)
            elif kind == 'velocity':
                _, track, step, start_velocity, start_y = self.drag
                velocity = clamp(start_velocity + (start_y - position[1]) / 120.0, 0.05, 1.0)
                self.drum_velocities[self.active_bank][track][step] = round(velocity, 2)
                self.set_status(f'VELOCITY {int(velocity * 100)}', 1.0)
            elif kind == 'length':
                _, note_index, step, start_length, start_x = self.drag
                delta = int((position[0] - start_x) // PIANO_STEP_W)
                max_length = NUM_STEPS - step
                bank = self.melody_banks[self.active_bank]
                for later in range(step + start_length + 1, NUM_STEPS):
                    if bank[note_index][later] is not None:
                        max_length = min(max_length, later - step)
                        break
                length = clamp(start_length + delta, 1, max(max_length, 1))
                bank[note_index][step] = (bank[note_index][step][0], length)
                self.set_status(f'LENGTH {length}', 1.0)
            elif kind == 'knob':
                _, strip_index, key, start_y, start_value = self.drag
                value = clamp(start_value + (start_y - position[1]) / 150.0, 0.0, 1.0)
                strips = self.mixer_strips()
                if strip_index < len(strips):
                    name, track_state, is_master = strips[strip_index]
                    if is_master:
                        self.master_fx[key[3:]] = value
                    else:
                        track_state[key] = value
                    label = ('SPACE', 'ECHO', 'TONE')[('fx_space', 'fx_echo', 'fx_tone').index(key)]
                    self.set_status(f'{name} {label} {int(value * 100)}', 1.0)
            elif kind == 'audio':
                self.apply_audio_drag(position, self.drag[1])
            elif kind == 'fader':
                self.apply_fader_drag(position, self.drag[1])
            elif kind == 'pan':
                self.apply_pan_drag(position, self.drag[1])
            return
        if self.current_view == 'SEQUENCER':
            cell = self.sequencer_cell_at(position)
            if cell:
                track, step = cell
                self.drum_banks[self.active_bank][track][step] = self.paint_value
        elif self.current_view == 'PIANO':
            cell = self.piano_cell_at(position)
            if cell:
                note_index, step = cell
                self.paint_melody(note_index, step, self.paint_value)
        elif self.current_view == 'SONG':
            cell = self.song_cell_at(position)
            if cell:
                _, bar = cell
                self.arrangement[bar] = self.paint_value

    def apply_swing_drag(self, position):
        ratio = (position[0] - SWING_TRACK_RECT.left) / SWING_TRACK_RECT.width
        self.swing = int(clamp(round(ratio * 100), 0, 100))

    def audio_clip_rect(self, track, y):
        loop_duration = 60 / self.bpm / 4 * NUM_STEPS
        clip_width = int(track['length'] / loop_duration * AUDIO_TIMELINE_W)
        clip_width = clamp(clip_width, 50, AUDIO_TIMELINE_W)
        clip_x = AUDIO_TIMELINE_X + int(track['start_step'] / NUM_STEPS * AUDIO_TIMELINE_W)
        return pygame.Rect(clip_x, y + 8, clip_width, 52)

    def apply_audio_drag(self, position, index):
        with self.audio_lock:
            if index >= len(self.audio_tracks):
                return
            ratio = (position[0] - AUDIO_TIMELINE_X) / AUDIO_TIMELINE_W
            self.audio_tracks[index]['start_step'] = int(clamp(ratio, 0, 0.999) * NUM_STEPS)
            self.dirty = True

    def mixer_strips(self):
        strips = [('MASTER', None, True)]
        for index, name in enumerate(DRUM_TRACKS):
            strips.append((name, self.drum_mixer[index], False))
        strips.append(('PIANO', self.melody_mixer, False))
        with self.audio_lock:
            for track in self.audio_tracks:
                strips.append((track['name'], track, False))
        return strips[:MAX_MIXER_STRIPS]

    def apply_fader_drag(self, position, index):
        strips = self.mixer_strips()
        if index >= len(strips):
            return
        geometry = mixer_strip_geometry(index)
        fader = geometry['fader']
        ratio = (fader.bottom - position[1]) / fader.height
        value = clamp(ratio, 0.0, 1.0)
        name, track_state, is_master = strips[index]
        if is_master:
            self.master_volume = value
        else:
            track_state['volume'] = value

    def apply_pan_drag(self, position, index):
        strips = self.mixer_strips()
        if index >= len(strips):
            return
        geometry = mixer_strip_geometry(index)
        pan_rect = geometry['pan']
        ratio = (position[0] - pan_rect.left) / pan_rect.width
        value = clamp(ratio * 2.0 - 1.0, -1.0, 1.0)
        name, track_state, is_master = strips[index]
        if not is_master:
            track_state['pan'] = value

    # -- drawing -------------------------------------------------------------

    def hovered(self, rect):
        return rect.collidepoint(self.frame_mouse)

    def playhead_fraction(self):
        """Fractional progress through the current step for a smooth playhead."""
        if not self.playing or self.step_duration <= 0:
            return 0.0
        return clamp((time.perf_counter() - self.last_step_at) / self.step_duration, 0.0, 1.0)

    def draw_card(self, rect):
        """Content card with a barely-there drop shadow."""
        theme = self.theme
        shadow = pygame.Surface((rect.width + 12, rect.height + 14), pygame.SRCALPHA)
        pygame.draw.rect(shadow, (0, 0, 0, 36), (6, 8, rect.width, rect.height), border_radius=12)
        self.screen.blit(shadow, (rect.x - 6, rect.y - 6))
        pygame.draw.rect(self.screen, theme['panel'], rect, border_radius=10)
        pygame.draw.rect(self.screen, theme['line_soft'], rect, 1, border_radius=10)

    def draw_tint(self, rect, color, alpha):
        surface = pygame.Surface(rect.size, pygame.SRCALPHA)
        surface.fill((color[0], color[1], color[2], alpha))
        self.screen.blit(surface, rect.topleft)

    def draw_logo(self, rect):
        pygame.draw.rect(self.screen, self.theme['accent'], rect, border_radius=8)
        pygame.draw.polygon(self.screen, (255, 255, 255), [
            (rect.left + rect.width * 0.38, rect.top + rect.height * 0.28),
            (rect.left + rect.width * 0.38, rect.top + rect.height * 0.72),
            (rect.left + rect.width * 0.76, rect.centery)])

    def draw_button(self, rect, label, font=None, active=False, danger=False, success=False, border=True, icon=None, ghost=False):
        theme = self.theme
        font = font or self.fonts['tiny']
        if active:
            fill = theme['accent'] if not danger and not success else (theme['red'] if danger else theme['green'])
            text_color = (255, 255, 255)
        elif self.hovered(rect):
            fill = theme['button_hover']
            text_color = theme['text']
        elif ghost:
            fill = None
            text_color = theme['text_dim'] if not (danger or success) else (theme['red'] if danger else theme['green'])
        else:
            fill = theme['button']
            text_color = theme['text_dim'] if not (danger or success) else (theme['red'] if danger else theme['green'])
        pressed = not active and fill is not None and pygame.mouse.get_pressed()[0] and self.hovered(rect)
        if fill is not None:
            if pressed:
                fill = blend(fill, theme['bg'], 0.25)
            pygame.draw.rect(self.screen, fill, rect, border_radius=6)
            if border:
                pygame.draw.rect(self.screen, theme['line'], rect, 1, border_radius=6)
        label_surface = font.render(label, True, text_color)
        if icon is not None:
            total = 14 + 6 + label_surface.get_width()
            start_x = rect.centerx - total // 2
            icon(self.screen, text_color, (start_x + 7, rect.centery))
            self.screen.blit(label_surface, label_surface.get_rect(midleft=(start_x + 20, rect.centery)))
        else:
            self.screen.blit(label_surface, label_surface.get_rect(center=rect.center))

    def draw_text(self, text, position, font=None, color=None, align='topleft'):
        font = font or self.fonts['tiny']
        surface = font.render(text, True, color or self.theme['text'])
        rect = surface.get_rect(**{align: position})
        self.screen.blit(surface, rect)
        return rect

    def draw_chrome(self):
        theme = self.theme
        self.screen.fill(theme['bg'])

        # Header: flat mark, title, dim version, quiet actions.
        self.draw_logo(pygame.Rect(24, 16, 32, 32))
        title = self.fonts['title'].render('FluroStudio', True, theme['text'])
        self.screen.blit(title, (66, 17))
        self.draw_text(f'v{VERSION}', (title.get_width() + 78, 26), self.fonts['tiny'], theme['text_faint'])
        self.draw_button(THEME_RECT, self.theme_name.upper(), icon=draw_theme_glyph, ghost=True)
        self.draw_button(EXPORT_RECT, 'EXPORT', icon=draw_export_glyph, ghost=True)
        self.draw_button(SAVE_RECT, 'SAVE', icon=draw_save_glyph, ghost=True)
        self.draw_button(LOAD_RECT, 'LOAD', icon=draw_load_glyph, ghost=True)
        pygame.draw.line(self.screen, theme['line_soft'], (0, HEADER_H), (LOGICAL_W, HEADER_H))

        # Transport strip: grouped by whitespace, labels kept whisper-quiet.
        pygame.draw.rect(self.screen, theme['panel_alt'], (0, HEADER_H, LOGICAL_W, TABS_TOP - HEADER_H))
        for label, x in (('TRANSPORT', 30), ('TEMPO', 180), ('GROOVE', 434), ('BANKS', 702), ('EDIT', 874)):
            self.draw_text(label, (x, 71), self.fonts['micro'], theme['text_faint'])

        play_active = self.playing
        self.draw_button(PLAY_RECT, '', active=False)
        pygame.draw.polygon(self.screen, theme['green'] if not play_active else theme['text_dim'],
                            [(PLAY_RECT.left + 20, PLAY_RECT.top + 10),
                             (PLAY_RECT.left + 20, PLAY_RECT.bottom - 10),
                             (PLAY_RECT.right - 18, PLAY_RECT.centery)])
        self.draw_button(STOP_RECT, '', active=False)
        pygame.draw.rect(self.screen, theme['red'], (STOP_RECT.centerx - 10, STOP_RECT.centery - 10, 20, 20), border_radius=3)

        self.draw_button(BPM_MINUS_RECT, '-', self.fonts['small'])
        self.draw_button(BPM_PLUS_RECT, '+', self.fonts['small'])
        self.draw_button(BPM_RECT, str(self.bpm), self.fonts['mono'])
        self.draw_text('BPM', (312, 98), self.fonts['small'], theme['text_faint'])
        self.draw_button(TAP_RECT, 'TAP', active=False)

        pygame.draw.rect(self.screen, theme['line_soft'], SWING_TRACK_RECT, border_radius=4)
        ratio = self.swing / 100
        knob_x = int(SWING_TRACK_RECT.left + ratio * (SWING_TRACK_RECT.width - 10))
        knob_rect = pygame.Rect(knob_x, SWING_TRACK_RECT.top - 4, 10, 16)
        pygame.draw.rect(self.screen, theme['accent'], knob_rect, border_radius=4)
        self.draw_text(f'{self.swing}%', (SWING_TRACK_RECT.right + 12, SWING_TRACK_RECT.centery), self.fonts['mono'], theme['text_dim'], align='midleft')

        self.draw_button(METRO_RECT, 'METRO', active=self.metronome)
        bank_names = 'ABCD'
        for index, rect in enumerate(BANK_RECTS):
            self.draw_button(rect, bank_names[index], active=index == self.active_bank)
        self.draw_button(UNDO_RECT, 'UNDO')
        self.draw_button(REDO_RECT, 'REDO')
        if not self.undo_stack:
            dim = self.fonts['tiny'].render('UNDO', True, blend(theme['text_dim'], theme['panel_alt'], 0.55))
            self.screen.blit(dim, dim.get_rect(center=UNDO_RECT.center))
        if not self.redo_stack:
            dim = self.fonts['tiny'].render('REDO', True, blend(theme['text_dim'], theme['panel_alt'], 0.55))
            self.screen.blit(dim, dim.get_rect(center=REDO_RECT.center))
        pygame.draw.line(self.screen, theme['line_soft'], (0, TABS_TOP), (LOGICAL_W, TABS_TOP))

        # View tabs as one segmented control; active segment is a soft accent pill.
        container = pygame.Rect(22, 150, 552, 44)
        pygame.draw.rect(self.screen, theme['panel'], container, border_radius=10)
        pygame.draw.rect(self.screen, theme['line_soft'], container, 1, border_radius=10)
        tabs = [('SEQUENCER', SEQ_TAB_RECT, 'SEQUENCER'), ('PIANO ROLL', PIANO_TAB_RECT, 'PIANO'),
                ('AUDIO', AUDIO_TAB_RECT, 'AUDIO'), ('SONG', SONG_TAB_RECT, 'SONG'),
                ('MIXER', MIXER_TAB_RECT, 'MIXER')]
        for label, rect, view_name in tabs:
            if self.current_view == view_name:
                pygame.draw.rect(self.screen, blend(theme['accent'], theme['panel'], 0.35),
                                 rect.inflate(-6, -6), border_radius=6)
                color = (255, 255, 255)
            else:
                color = theme['text'] if self.hovered(rect) else theme['text_dim']
            label_surface = self.fonts['small'].render(label, True, color)
            self.screen.blit(label_surface, label_surface.get_rect(center=rect.center))
        if self.current_view in ('SEQUENCER', 'PIANO'):
            self.draw_button(COPY_RECT, 'COPY', ghost=True)
            self.draw_button(DEMO_RECT, 'DEMO', ghost=True, success=True)
            self.draw_button(CLEAR_RECT, 'CLEAR', ghost=True, danger=True)
        if self.current_view == 'SEQUENCER':
            self.draw_button(EUCLID_RECT, 'EUCLID', active=False)
            self.draw_button(VAR_RECT, 'VAR', ghost=True)
        if self.current_view == 'PIANO':
            self.draw_button(KB_RECT, f'KB:{"ON" if self.kb_enabled else "OFF"}', active=self.kb_enabled)
            self.draw_button(CAPTURE_RECT, 'REC', active=self.capture_armed, danger=self.capture_armed)
            self.draw_button(OCT_RECT, f'OCT {self.kb_base_octave}')
        pygame.draw.line(self.screen, theme['line'], (0, CONTENT_TOP), (LOGICAL_W, CONTENT_TOP))

    def draw_footer(self):
        theme = self.theme
        pygame.draw.line(self.screen, theme['line'], (0, FOOTER_TOP), (LOGICAL_W, FOOTER_TOP))
        if time.time() < self.status_until and self.status_message:
            pygame.draw.circle(self.screen, theme['accent'], (30, FOOTER_TOP + 26), 4)
            self.draw_text(self.status_message, (42, FOOTER_TOP + 18), self.fonts['small'], theme['text'])
        else:
            hints = 'SPACE play · 1-5 views · SHIFT+drag = velocity / note length · CTRL+E export · M metro · T tap · CTRL+Z undo'
            surface = self.fonts['tiny'].render(hints, True, theme['text_faint'])
            self.screen.blit(surface, surface.get_rect(midright=(LOGICAL_W - 24, FOOTER_TOP + 26)))
        if self.recording:
            elapsed = int(time.time() - self.recording_started_at)
            blink = int(time.time() * 2) % 2 == 0
            color = theme['red'] if blink else blend(theme['red'], theme['bg'], 0.5)
            pygame.draw.circle(self.screen, color, (14, FOOTER_TOP + 26), 6)
            self.draw_text(f'REC {elapsed // 60}:{elapsed % 60:02d}', (26, FOOTER_TOP + 18), self.fonts['small'], theme['red'])

    def draw_sequencer(self):
        theme = self.theme
        self.draw_card(pygame.Rect(20, 208, 1040, 448))
        bank = self.drum_banks[self.active_bank]
        velocities = self.drum_velocities[self.active_bank]
        grid_top = SEQ_TRACK_TOP + 14
        grid_bottom = SEQ_TRACK_TOP + len(DRUM_TRACKS) * SEQ_ROW_HEIGHT - 10
        for beat in range(1, 4):
            x = SEQ_START_X + beat * 4 * (SEQ_STEP_SIZE + SEQ_STEP_GAP) - SEQ_STEP_GAP // 2 - 1
            pygame.draw.line(self.screen, theme['line_soft'], (x, grid_top - 10), (x, grid_bottom + 10))
        for step in range(NUM_STEPS):
            x = SEQ_START_X + step * (SEQ_STEP_SIZE + SEQ_STEP_GAP)
            color = theme['text'] if step % 4 == 0 else theme['text_faint']
            number = self.fonts['step'].render(str(step + 1), True, color)
            self.screen.blit(number, number.get_rect(center=(x + SEQ_STEP_SIZE // 2, SEQ_TRACK_TOP - 2)))
        for track in range(len(DRUM_TRACKS)):
            y = SEQ_TRACK_TOP + track * SEQ_ROW_HEIGHT
            self.screen.blit(self.drum_icons[track], (28, y + 8))
            self.draw_text(DRUM_TRACKS[track], (84, y + 18), self.fonts['track'], theme['text'])
            custom = self.drum_samples[track]
            sample_rect = pygame.Rect(150, y + 16, 62, 26)
            self.draw_button(sample_rect, ellipsize(self.fonts['tiny'], custom['name'], 54) if custom else 'SMP',
                             ghost=True)
            if custom:
                pygame.draw.rect(self.screen, theme['accent'], (sample_rect.left + 3, sample_rect.centery - 2, 4, 4), border_radius=2)
            for step in range(NUM_STEPS):
                x = SEQ_START_X + step * (SEQ_STEP_SIZE + SEQ_STEP_GAP)
                rect = pygame.Rect(x, y + 14, SEQ_STEP_SIZE, SEQ_STEP_SIZE)
                on = bank[track][step]
                if on:
                    base = blend(theme['step_bg'], theme['green'], 0.35 + 0.65 * velocities[track][step])
                    color = blend(base, (255, 255, 255), 0.15) if self.hovered(rect) else base
                else:
                    color = theme['step_hover'] if self.hovered(rect) else theme['step_bg']
                pygame.draw.rect(self.screen, color, rect, border_radius=8)
                pygame.draw.rect(self.screen, theme['line'], rect, 1, border_radius=8)
                if on and velocities[track][step] < 0.995:
                    marker_height = int(4 + 10 * velocities[track][step])
                    pygame.draw.rect(self.screen, blend(theme['bg'], theme['green'], 0.5),
                                     (rect.left + 4, rect.bottom - 4 - marker_height, 4, marker_height), border_radius=2)
        if self.playing:
            column_x = int(SEQ_START_X + self.current_step * (SEQ_STEP_SIZE + SEQ_STEP_GAP))
            self.draw_tint(pygame.Rect(column_x, grid_top - 10, SEQ_STEP_SIZE, grid_bottom - grid_top + 16), theme['accent'], 14)
            playhead_x = int(SEQ_START_X + (self.current_step + self.playhead_fraction()) * (SEQ_STEP_SIZE + SEQ_STEP_GAP) + SEQ_STEP_SIZE // 2)
            pygame.draw.line(self.screen, theme['playhead'], (playhead_x, grid_top - 12), (playhead_x, grid_bottom + 6), 3)

    def draw_piano(self):
        theme = self.theme
        self.draw_card(pygame.Rect(20, 208, 1040, 448))
        bank = self.melody_banks[self.active_bank]
        grid_bottom = PIANO_GRID_TOP + PIANO_VISIBLE_ROWS * PIANO_ROW_H
        grid_right = PIANO_GRID_X + NUM_STEPS * PIANO_STEP_W
        held_names = {info[3] for info in self.kb_held.values()}
        for step in range(NUM_STEPS):
            x = PIANO_GRID_X + step * PIANO_STEP_W
            color = theme['text'] if step % 4 == 0 else theme['text_faint']
            number = self.fonts['step'].render(str(step + 1), True, color)
            self.screen.blit(number, number.get_rect(center=(x + PIANO_STEP_W // 2, PIANO_GRID_TOP - 12)))
        for row in range(PIANO_VISIBLE_ROWS):
            note_index = self.piano_scroll + row
            if note_index >= len(PIANO_NOTES):
                break
            note = PIANO_NOTES[note_index]
            y = PIANO_GRID_TOP + row * PIANO_ROW_H
            sharp = '#' in note
            key_rect = pygame.Rect(PIANO_KEY_X, y, PIANO_KEY_W, PIANO_ROW_H)
            key_color = theme['black_key'] if sharp else theme['white_key']
            text_color = (235, 235, 240) if sharp else (30, 30, 34)
            if self.hovered(key_rect) and not sharp:
                key_color = theme['white_key_dim']
            if note in held_names:
                key_color = blend(key_color, theme['accent'], 0.5)
            pygame.draw.rect(self.screen, key_color, key_rect)
            pygame.draw.rect(self.screen, theme['line'], key_rect, 1)
            self.draw_text(note, (PIANO_KEY_X + 14, y + 7), self.fonts['tiny'], text_color)
            if self.kb_enabled:
                key_label = self.kb_label_map.get(note_to_midi(note))
                if key_label:
                    self.draw_text(key_label, (PIANO_KEY_X + PIANO_KEY_W - 10, y + 8),
                                   self.fonts['tiny'], theme['text_faint'], align='topright')
            for step in range(NUM_STEPS):
                cell = bank[note_index][step]
                # Skip cells covered by an earlier note's span.
                covered = False
                for earlier in range(step):
                    prior = bank[note_index][earlier]
                    if prior is not None and earlier + prior[1] > step:
                        covered = True
                        break
                if cell is None and covered:
                    continue
                x = PIANO_GRID_X + step * PIANO_STEP_W
                cell_rect = pygame.Rect(x, y, PIANO_STEP_W, PIANO_ROW_H)
                if cell is not None:
                    length = cell[1]
                    span_rect = pygame.Rect(x, y + 2, length * PIANO_STEP_W - 4, PIANO_ROW_H - 4)
                    color = INSTRUMENT_COLORS[cell[0]]
                    if self.hovered(span_rect):
                        color = blend(color, (255, 255, 255), 0.15)
                    pygame.draw.rect(self.screen, color, span_rect, border_radius=4)
                    if length > 1:
                        pygame.draw.rect(self.screen, blend(color, (0, 0, 0), 0.35),
                                         (span_rect.right - 6, span_rect.top, 6, span_rect.height),
                                         border_bottom_right_radius=4, border_top_right_radius=4)
                else:
                    color = theme['cell_dark'] if sharp else theme['cell_light']
                    if self.hovered(cell_rect):
                        color = theme['step_hover']
                    pygame.draw.rect(self.screen, color, cell_rect)
                    pygame.draw.rect(self.screen, theme['line_soft'], cell_rect, 1)
            if note.startswith('C'):
                pygame.draw.line(self.screen, theme['line'], (PIANO_KEY_X, y + PIANO_ROW_H - 1), (grid_right, y + PIANO_ROW_H - 1), 2)
        if self.playing:
            column_x = int(PIANO_GRID_X + self.current_step * PIANO_STEP_W)
            self.draw_tint(pygame.Rect(column_x, PIANO_GRID_TOP, PIANO_STEP_W, grid_bottom - PIANO_GRID_TOP), theme['accent'], 12)
            playhead_x = int(PIANO_GRID_X + (self.current_step + self.playhead_fraction()) * PIANO_STEP_W)
            pygame.draw.line(self.screen, theme['playhead'], (playhead_x, PIANO_GRID_TOP), (playhead_x, grid_bottom), 3)
        for index, instrument in enumerate(INSTRUMENTS):
            rect = pygame.Rect(PIANO_GRID_X + index * 88, INSTRUMENT_BUTTON_Y, 80, 30)
            self.draw_button(rect, instrument, active=self.melody_instrument == instrument)
        self.draw_button(CHORD_RECT, {'min': 'CHORD: MIN', 'maj': 'CHORD: MAJ'}.get(self.chord_mode, 'CHORDS: OFF'),
                         active=self.chord_mode is not None)
        self.draw_button(RND_RECT, 'RND', ghost=True, success=True)
        self.draw_text('SHIFT+drag a note = length · drag paints · right-click erases · F1/F2 octave',
                       (740, INSTRUMENT_BUTTON_Y + 8), self.fonts['tiny'], theme['text_dim'])

    def draw_song(self):
        theme = self.theme
        self.draw_card(pygame.Rect(20, 208, 1040, 448))
        self.draw_button(SONG_TOGGLE_RECT, f'SONG MODE: {"ON" if self.song_enabled else "OFF"}', active=self.song_enabled)
        self.draw_text('BARS', (160, 220), self.fonts['tiny'], theme['text_dim'])
        self.draw_button(SONG_MINUS_RECT, '-', self.fonts['small'])
        self.draw_button(SONG_LENGTH_RECT, str(self.song_length), self.fonts['small'])
        self.draw_button(SONG_PLUS_RECT, '+', self.fonts['small'])
        self.draw_text('Click a cell to place bank A-D in that bar - drag paints, clicking again clears',
                       (340, 220), self.fonts['tiny'], theme['text_dim'])

        bar_w = (SONG_GRID_RIGHT - SONG_GRID_X) / self.song_length
        grid_bottom = SONG_GRID_TOP + NUM_BANKS * SONG_BAR_H
        for bar in range(0, self.song_length, 4):
            if (bar // 4) % 2 == 1:
                x = int(SONG_GRID_X + bar * bar_w)
                self.draw_tint(pygame.Rect(x, SONG_GRID_TOP, max(1, int(4 * bar_w)), NUM_BANKS * SONG_BAR_H), theme['text'], 7)
        for bar in range(0, self.song_length, 4):
            x = int(SONG_GRID_X + bar * bar_w)
            color = theme['text'] if bar % 16 < 4 else theme['text_faint']
            number = self.fonts['step'].render(str(bar + 1), True, color)
            self.screen.blit(number, (x + 2, SONG_GRID_TOP - 20))
            pygame.draw.line(self.screen, theme['line_soft'], (x, SONG_GRID_TOP - 4), (x, grid_bottom))
        if self.playing and self.song_enabled:
            bar_position = min(self.song_bar + (self.current_step + self.playhead_fraction()) / NUM_STEPS, self.song_length)
            x = int(SONG_GRID_X + bar_position * bar_w)
            pygame.draw.line(self.screen, theme['playhead'], (x, SONG_GRID_TOP - 4), (x, grid_bottom), 3)
        bank_names = 'ABCD'
        for row in range(NUM_BANKS):
            y = SONG_GRID_TOP + row * SONG_BAR_H
            self.draw_button(pygame.Rect(28, y + 6, 44, SONG_BAR_H - 12), bank_names[row],
                             active=self.active_bank == row)
            for bar in range(self.song_length):
                x = int(SONG_GRID_X + bar * bar_w)
                cell_rect = pygame.Rect(x + 1, y + 3, max(4, int(bar_w) - 2), SONG_BAR_H - 6)
                filled = self.arrangement[bar] == row
                if filled:
                    color = blend(theme['accent'], (255, 255, 255), 0.2) if self.hovered(cell_rect) else theme['accent']
                else:
                    color = theme['step_hover'] if self.hovered(cell_rect) else theme['panel_alt']
                pygame.draw.rect(self.screen, color, cell_rect, border_radius=4)
                pygame.draw.rect(self.screen, theme['line_soft'], cell_rect, 1, border_radius=4)
        pygame.draw.line(self.screen, theme['line'], (SONG_GRID_X, grid_bottom), (SONG_GRID_RIGHT, grid_bottom))
        has_content = any(value is not None for value in self.arrangement)
        if self.song_enabled and has_content:
            status = 'Playing the arrangement'
        elif self.song_enabled:
            status = 'Song mode is on but the arrangement is empty - place some banks below'
        else:
            status = 'Turn SONG MODE on to play this arrangement instead of looping one bank'
        self.draw_text(status, (SONG_GRID_X, grid_bottom + 14), self.fonts['small'], theme['text_dim'])

    def draw_audio(self):
        theme = self.theme
        self.draw_card(pygame.Rect(20, 208, 1040, 448))
        self.draw_button(MIC_PREV_RECT, '<', self.fonts['small'])
        self.draw_button(MIC_NEXT_RECT, '>', self.fonts['small'])
        device_rect = MIC_DEVICE_RECT
        if not SOUNDDEVICE_AVAILABLE:
            label = 'MIC: sounddevice not installed'
        elif not self.microphone_devices:
            label = 'MIC: no input device found'
        else:
            _, device_name = self.microphone_devices[self.selected_microphone]
            label = ellipsize(self.fonts['tiny'], 'MIC: ' + device_name, device_rect.width - 18)
        pygame.draw.rect(self.screen, theme['button'], device_rect, border_radius=8)
        pygame.draw.rect(self.screen, theme['line'], device_rect, 1, border_radius=8)
        surface = self.fonts['tiny'].render(label, True, theme['text'])
        self.screen.blit(surface, surface.get_rect(center=device_rect.center))
        self.draw_button(IMPORT_AUDIO_RECT, 'IMPORT')
        record_active = self.recording
        self.draw_button(RECORD_AUDIO_RECT, '', active=record_active, danger=record_active)
        icon_pos = (RECORD_AUDIO_RECT.left + 8, RECORD_AUDIO_RECT.centery - 12)
        self.screen.blit(self.microphone_icon, icon_pos)
        record_label = 'STOP' if record_active else 'RECORD'
        label_color = (255, 255, 255) if record_active else (self.theme['red'] if self.hovered(RECORD_AUDIO_RECT) else self.theme['text_dim'])
        record_surface = self.fonts['tiny'].render(record_label, True, label_color)
        self.screen.blit(record_surface, record_surface.get_rect(midleft=(RECORD_AUDIO_RECT.left + 40, RECORD_AUDIO_RECT.centery)))

        for step in range(NUM_STEPS):
            x = AUDIO_TIMELINE_X + int(step / NUM_STEPS * AUDIO_TIMELINE_W)
            pygame.draw.line(self.screen, theme['line_soft'], (x, AUDIO_TRACK_TOP - 6), (x, FOOTER_TOP - 20))
            color = theme['text'] if step % 4 == 0 else theme['text_dim']
            self.draw_text(str(step + 1), (x + 4, AUDIO_TRACK_TOP - 28), self.fonts['tiny'], color)
        if self.playing:
            x = AUDIO_TIMELINE_X + int((self.current_step + self.playhead_fraction()) / NUM_STEPS * AUDIO_TIMELINE_W)
            pygame.draw.line(self.screen, theme['playhead'], (x, AUDIO_TRACK_TOP - 6), (x, FOOTER_TOP - 18), 3)
        for index in range(min(len(self.audio_tracks), 5)):
            track = self.audio_tracks[index]
            y = AUDIO_TRACK_TOP + index * AUDIO_TRACK_HEIGHT
            pygame.draw.line(self.screen, theme['line_soft'], (20, y + AUDIO_TRACK_HEIGHT - 4), (LOGICAL_W - 20, y + AUDIO_TRACK_HEIGHT - 4))
            mute_rect = pygame.Rect(30, y + 18, 30, 25)
            solo_rect = pygame.Rect(66, y + 18, 30, 25)
            delete_rect = pygame.Rect(102, y + 18, 30, 25)
            self.draw_button(mute_rect, 'M', active=track['muted'], danger=track['muted'])
            self.draw_button(solo_rect, 'S', active=track['solo'], success=track['solo'])
            self.draw_button(delete_rect, 'X', danger=True)
            clip_rect = self.audio_clip_rect(track, y)
            clip_color = theme['clip'] if not track['muted'] else blend(theme['clip'], theme['bg'], 0.6)
            pygame.draw.rect(self.screen, clip_color, clip_rect, border_radius=6)
            pygame.draw.rect(self.screen, theme['orange'], clip_rect, 2, border_radius=6)
            self.draw_waveform(track['waveform'], clip_rect.inflate(-8, -8), theme['orange'])
            self.draw_text(ellipsize(self.fonts['tiny'], track['name'], 190), (140, y + 26), self.fonts['tiny'], theme['text'])
        if not self.audio_tracks:
            self.draw_text('Drop an audio file anywhere, or press IMPORT - drag clips to move them',
                           (AUDIO_TIMELINE_X + 10, AUDIO_TRACK_TOP + 20), self.fonts['small'], theme['text_dim'])

    def draw_waveform(self, waveform, rect, color):
        if waveform is None or len(waveform) == 0:
            return
        center_y = rect.centery
        samples_per_pixel = max(1, len(waveform) // max(1, rect.width))
        for x in range(rect.width):
            start = x * samples_per_pixel
            end = min(start + samples_per_pixel, len(waveform))
            if start >= len(waveform):
                break
            amplitude = np.max(np.abs(waveform[start:end]))
            height = int(amplitude * (rect.height / 2 - 4))
            pygame.draw.line(self.screen, color, (rect.left + x, center_y - height), (rect.left + x, center_y + height), 1)

    def draw_mixer(self):
        theme = self.theme
        self.draw_card(pygame.Rect(20, 208, 1040, 448))
        solo = any_track_soloed(self.drum_mixer, self.melody_mixer, self.audio_tracks)
        for index, (name, track_state, is_master) in enumerate(self.mixer_strips()):
            geometry = mixer_strip_geometry(index)
            strip_rect = geometry['strip']
            pygame.draw.rect(self.screen, theme['panel'], strip_rect, border_radius=8)
            pygame.draw.rect(self.screen, theme['accent'] if is_master else theme['line'], strip_rect, 1, border_radius=8)
            label = ellipsize(self.fonts['tiny'], name, strip_rect.width - 12)
            surface = self.fonts['tiny'].render(label, True, theme['text'])
            self.screen.blit(surface, surface.get_rect(center=(strip_rect.centerx, strip_rect.top + 16)))
            if not is_master:
                self.draw_button(geometry['mute'], 'M', active=track_state.get('muted', False), danger=track_state.get('muted', False))
                self.draw_button(geometry['solo'], 'S', active=track_state.get('solo', False), success=track_state.get('solo', False))
            knob_keys = ('fx_space', 'fx_echo', 'fx_tone')
            knob_labels = ('REV', 'DLY', 'TONE')
            for knob_index, knob_rect in enumerate(geometry['knobs']):
                if is_master:
                    value = self.master_fx[knob_keys[knob_index][3:]]
                else:
                    value = track_state.get(knob_keys[knob_index], 1.0 if knob_keys[knob_index] == 'fx_tone' else 0.0)
                center = knob_rect.center
                pygame.draw.circle(self.screen, theme['button_hover'], center, 13)
                pygame.draw.circle(self.screen, theme['line'], center, 13, 1)
                angle = math.radians(-135 + 270 * value)
                pygame.draw.line(self.screen, theme['accent'], center,
                                 (center[0] + 10 * math.cos(angle), center[1] + 10 * math.sin(angle)), 2)
                self.draw_text(knob_labels[knob_index], (center[0], knob_rect.bottom + 3),
                               load_font(11, bold=True), theme['text_faint'], align='midtop')
            fader = geometry['fader']
            pygame.draw.rect(self.screen, theme['line_soft'], fader, border_radius=6)
            if is_master:
                value = self.master_volume
            else:
                value = track_state.get('volume', 1.0)
            knob_y = int(fader.bottom - value * fader.height)
            fill_rect = pygame.Rect(fader.left + 3, knob_y, fader.width - 6, fader.bottom - knob_y - 3)
            if fill_rect.height > 0:
                pygame.draw.rect(self.screen, blend(theme['line_soft'], theme['accent'], 0.5), fill_rect, border_radius=4)
            pygame.draw.rect(self.screen, theme['accent'], (fader.left - 8, knob_y - 5, fader.width + 16, 10), border_radius=5)
            pygame.draw.line(self.screen, (255, 255, 255), (fader.left - 2, knob_y), (fader.left + fader.width + 2, knob_y), 2)
            percent = self.fonts['mono'].render(str(int(value * 100)), True, theme['text_dim'])
            self.screen.blit(percent, percent.get_rect(center=(strip_rect.centerx, fader.bottom + 14)))
            pan_rect = geometry['pan']
            pygame.draw.rect(self.screen, theme['line_soft'], pan_rect, border_radius=4)
            if not is_master:
                pan = track_state.get('pan', 0.0)
                pan_x = int(pan_rect.left + (pan + 1.0) / 2.0 * pan_rect.width)
                pygame.draw.circle(self.screen, theme['accent'], (pan_x, pan_rect.centery), 7)
                pygame.draw.circle(self.screen, theme['panel'], (pan_x, pan_rect.centery), 3)
                self.draw_text('PAN', (strip_rect.centerx, pan_rect.bottom + 12), self.fonts['micro'], theme['text_faint'], align='midtop')
            if solo and not is_master and not track_state.get('solo', False):
                overlay = pygame.Surface(strip_rect.size, pygame.SRCALPHA)
                overlay.fill((0, 0, 0, 90))
                self.screen.blit(overlay, strip_rect.topleft)
                pygame.draw.rect(self.screen, theme['line'], strip_rect, 1, border_radius=8)
                dim_name = self.fonts['tiny'].render(label, True, theme['text_dim'])
                self.screen.blit(dim_name, dim_name.get_rect(center=(strip_rect.centerx, strip_rect.top + 16)))

    def draw(self):
        self.frame_mouse = self.to_logical(pygame.mouse.get_pos())
        self.draw_chrome()
        if self.current_view == 'SEQUENCER':
            self.draw_sequencer()
        elif self.current_view == 'PIANO':
            self.draw_piano()
        elif self.current_view == 'AUDIO':
            self.draw_audio()
        elif self.current_view == 'SONG':
            self.draw_song()
        elif self.current_view == 'MIXER':
            self.draw_mixer()
        self.draw_footer()
        if self.modal is not None:
            self.draw_modal()

        width, height = self.window.get_size()
        scale = min(width / LOGICAL_W, height / LOGICAL_H)
        scaled_w, scaled_h = max(1, int(LOGICAL_W * scale)), max(1, int(LOGICAL_H * scale))
        offset = ((width - scaled_w) // 2, (height - scaled_h) // 2)
        self.view_transform = (scale, offset[0], offset[1])
        scaled = pygame.transform.smoothscale(self.screen, (scaled_w, scaled_h))
        self.window.fill((12, 12, 14))
        self.window.blit(scaled, offset)
        pygame.display.update()

    # -- main loop -----------------------------------------------------------

    def stop_sounds(self):
        """Silence everything on whichever playback path is active."""
        if self.engine_mode == 'rt':
            self.engine.stop_all()
        elif self.mixer_ok:
            pygame.mixer.stop()

    def shutdown(self):
        self.clock_thread.stop_event.set()
        self.clock_thread.join(timeout=1.0)
        if self.recording:
            self.recording = False
            if self.recording_stream is not None:
                try:
                    self.recording_stream.stop()
                    self.recording_stream.close()
                except Exception:
                    pass
        if self.engine is not None:
            self.engine.close()
        pygame.quit()

    def run(self):
        if IS_WEB:
            import asyncio
            asyncio.run(self.run_async())
            return
        running = True
        while running:
            for event in pygame.event.get():
                running = self.handle_event(event)
                if not running:
                    break
            if time.time() >= self.next_autosave:
                self.autosave()
                self.next_autosave = time.time() + AUTOSAVE_SECONDS
            self.draw()
            self.clock.tick(60)
        self.shutdown()

    async def run_async(self):
        """Browser main loop (pygbag): yields to the event loop every frame."""
        import asyncio
        running = True
        while running:
            for event in pygame.event.get():
                running = self.handle_event(event)
                if not running:
                    break
            self.draw()
            await asyncio.sleep(0)
        self.shutdown()

    # -- selftest / screenshots ----------------------------------------------

    def run_selftest(self):
        """Exercise the core systems without any user interaction."""
        try:
            assert self.engine_mode in ('rt', 'baked')
            print(f"audio engine: {self.engine_mode}")
            assert len(self.drum_banks) == NUM_BANKS
            assert len(self.drum_banks[0]) == len(DRUM_TRACKS)
            assert all(len(row) == NUM_STEPS for row in self.drum_banks[0])
            assert len(self.melody_banks[0]) == len(PIANO_NOTES)
            assert len(self.drum_velocities) == NUM_BANKS

            snapshot_before = deepcopy(self.drum_banks)
            self.drum_banks[0][0][0] = True
            self.push_undo()
            self.drum_banks[0][0][0] = False
            self.undo()
            assert self.drum_banks[0][0][0] is True
            self.redo()

            self.active_bank = 0
            self.copy_bank_forward()
            assert self.drum_banks[1] == self.drum_banks[0]
            assert self.drum_velocities[1] == self.drum_velocities[0]
            assert self.melody_banks[1] == self.melody_banks[0]

            self.trigger_step(0)

            # FX: reverb must add tail energy, and the baked path must survive
            # a knob change rebuild.
            wet = apply_track_fx(self.drum_waves[1], space=0.7, echo=0.5, tone=0.5, bpm=120.0)
            assert float(np.sum(np.abs(wet[-4000:]))) > float(np.sum(np.abs(self.drum_waves[1][-4000:])))
            self.drum_mixer[0]['fx_space'] = 0.5
            self.rebuild_baked_sounds()
            self.drum_mixer[0]['fx_space'] = 0.0
            self.rebuild_baked_sounds()

            # Keyboard capture: keys played during playback land in the grid.
            self.current_view = 'PIANO'
            self.toggle_capture()
            assert self.capture_armed
            self.start_playback()
            time.sleep(0.2)
            self.kb_note_on(pygame.K_q)
            time.sleep(0.15)
            self.kb_note_off(pygame.K_q)
            self.stop_playback()
            assert self.capture_count >= 1
            self.toggle_capture()

            # Generative tools: Euclidean pattern shape + variation runs.
            assert euclidean_pattern(3, 8) == [True, False, False, True, False, False, True, False]
            assert sum(euclidean_pattern(4, 16)) == 4
            self.apply_variation()

            # Beat code round trip: export -> encode -> decode -> import.
            code = encode_beat_code(self.export_project())
            assert code.startswith('FLRO-')
            restored = decode_beat_code(code)
            assert restored is not None and restored.get('bpm')
            assert decode_beat_code('FLRO-garbage') is None
            exported_banks = deepcopy(self.drum_banks)
            self.clear_bank()
            assert self.load_beat_code(code)
            assert self.drum_banks == exported_banks

            # Stems: a single-track render is finite and fits the mix length.
            stem_bytes, stem_peak = self.render_export(stem=('drum', 0))
            assert len(stem_bytes) == int(16 * 60.0 / self.bpm / 4 * SAMPLE_RATE) * 4
            assert stem_peak >= 0.0

            # Sample slot: assign a hand-made sample and trigger it.
            self.drum_samples[0] = {'name': 'test.wav', 'path': '', 'wave': self.drum_waves[0] * 0.5}
            self.trigger_step(0)
            self.drum_samples[0] = None

            # Note lengths: placing a note inside another's span truncates it.
            row = PIANO_NOTE_ROW['C4']
            self.set_melody_cell(row, 0, ('KEYS', 3))
            self.set_melody_cell(row, 2, ('PLUCK', 1))
            assert self.melody_banks[self.active_bank][row][0] == ('KEYS', 2)
            assert self.melody_banks[self.active_bank][row][2] == ('PLUCK', 1)

            # Song mode: playback must follow the arrangement across the wrap.
            self.bpm = 240
            self.song_enabled = True
            self.song_length = 4
            self.arrangement = [0, 1, None, None]
            self.song_bar = 0
            self.active_bank = 0
            self.start_playback()
            time.sleep(1.4)
            if self.song_bar == 1:
                assert self.active_bank == 1
            self.stop_playback()
            assert self.song_bar == 0
            self.song_enabled = False

            # WAV export: correct length, audible content, valid file on disk.
            pcm_bytes, peak = self.render_export()
            expected_frames = int(16 * 60.0 / self.bpm / 4 * SAMPLE_RATE)
            assert len(pcm_bytes) == expected_frames * 4
            assert peak > 0.0
            import tempfile
            with tempfile.TemporaryDirectory() as tmp_dir:
                wav_path = os.path.join(tmp_dir, 'export.wav')
                write_wav(wav_path, pcm_bytes)
                with wave.open(wav_path, 'rb') as wav_file:
                    assert wav_file.getnchannels() == 2
                    assert wav_file.getsampwidth() == 2
                    assert wav_file.getframerate() == SAMPLE_RATE
                    assert wav_file.getnframes() == expected_frames

                # Autosave + recovery round trip.
                self.dirty = True
                self.autosave()
                autosave_path = os.path.join(recordings_dir(), 'autosave.fluro')
                assert os.path.exists(autosave_path)
                exported_banks = deepcopy(self.drum_banks)
                self.clear_bank()
                self.recover_autosave()
                assert self.drum_banks == exported_banks
                os.remove(autosave_path)

            project = self.export_project()
            self.import_project(project, base_dir='')
            assert self.drum_banks == exported_banks
            print('SELFTEST PASSED')
            return 0
        except Exception:
            traceback.print_exc()
            print('SELFTEST FAILED')
            return 1

    def save_screenshots(self, directory):
        os.makedirs(directory, exist_ok=True)
        views = {'sequencer': 'SEQUENCER', 'piano': 'PIANO', 'audio': 'AUDIO', 'song': 'SONG', 'mixer': 'MIXER'}
        for filename, view in views.items():
            self.current_view = view
            self.draw()
            pygame.image.save(self.screen, os.path.join(directory, f'{filename}.png'))
        self.set_theme('light' if self.theme_name == 'dark' else 'dark')
        self.current_view = 'SEQUENCER'
        self.draw()
        pygame.image.save(self.screen, os.path.join(directory, f'sequencer-{self.theme_name}.png'))
        self.open_code_modal()
        self.draw()
        pygame.image.save(self.screen, os.path.join(directory, 'beatcode.png'))
        self.modal = None
        print(f'Screenshots saved to {directory}')


def initial_piano_scroll(melody_banks):
    """Pick a scroll position that shows the lowest placed note (if any)."""
    lowest_row = -1
    for bank in melody_banks:
        for row_index, row in enumerate(bank):
            if any(cell is not None for cell in row):
                lowest_row = max(lowest_row, row_index)
    if lowest_row < 0:
        return 0
    return clamp(lowest_row - PIANO_VISIBLE_ROWS + 2, 0, max(0, len(PIANO_NOTES) - PIANO_VISIBLE_ROWS))


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='FluroStudio - a one-file beat studio')
    parser.add_argument('--project', metavar='FILE', help='open a saved project at launch')
    parser.add_argument('--code', metavar='CODE', help='load a FLRO- beat code at launch')
    parser.add_argument('--theme', choices=sorted(THEMES), default='dark', help='start in dark or light theme')
    parser.add_argument('--selftest', action='store_true', help='run built-in checks and exit')
    parser.add_argument('--screenshot', metavar='DIR', help='render each view to PNG files and exit')
    return parser.parse_args(argv)


def _start_app(args):
    app = FluroStudioApp(theme=args.theme)
    if args.project:
        app.load_project_file(args.project)
    if getattr(args, 'code', None):
        app.load_beat_code(args.code)
    return app


async def amain(argv=None):
    args = parse_args(argv)
    app = _start_app(args)
    try:
        if args.selftest:
            return app.run_selftest()
        if args.screenshot:
            app.save_screenshots(args.screenshot)
            return 0
        await app.run_async()
    finally:
        app.shutdown()
    return 0


def main(argv=None):
    if IS_WEB:
        import asyncio
        return asyncio.run(amain(argv))
    args = parse_args(argv)
    app = _start_app(args)
    try:
        if args.selftest:
            return app.run_selftest()
        if args.screenshot:
            app.save_screenshots(args.screenshot)
            return 0
        app.run()
    except KeyboardInterrupt:
        pass
    finally:
        app.shutdown()
    return 0


if __name__ == '__main__':
    sys.exit(main())
