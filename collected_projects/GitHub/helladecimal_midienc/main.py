import hashlib, math, struct
from pathlib import Path
import argparse

MIDI_HEADER = b"MThd"
MIDI_TRK = b"MTrk"

def event_enc(data):
    event_data = bytearray()
    
    for i in range(0, len(data)):

        pitch = (data[i]) & 0x7f
        vel = (data[i] >> 7) & 0x01

        #vel = (data[i+1]) if i+1 < len(data) else 0xFF

        event_data.extend([
            1,
            0x90,
            pitch,
            vel * 0x7F
        ])
        

        event_data.extend([
            1,
            0x80,
            pitch,
            0x00
        ])

        print(f"{int( (i/len(data)) * 100)}% done", end="\r")

    event_data.extend([0xFF, 0x2F, 0x00])

    event_data = bytes(event_data)

    event_len = len(event_data)
    return event_data, event_len

def decode(file_data):
    # 4 byte header + 4 length + 6 format + 4 ascii + 4 byte
    event_data = file_data[22:]
    event_data = event_data[:len(event_data)-3] # 3 byte eof

    decoded_data = bytearray()

    for i in range(0, len(event_data), 4):

        if i+3 >= len(event_data):
            break

        note_stat = (event_data[i+1])
        pitch = (event_data[i+2])
        vel = (event_data[i+3])

        bit8 = 1 if vel > 64 else 0

        if note_stat == 0x90: # note on
            decoded_data.append((pitch | (bit8 << 7)))

        print(f"{int((i/len(file_data)) * 100)}% done", end="\r")

    decoded_data = bytes(decoded_data)

    return decoded_data

def encode(file_data):

    event_data, event_len = event_enc(file_data)

    header_chunk = (
        MIDI_HEADER + 
        (6).to_bytes(4, "big", signed=False) + # length
        (0).to_bytes(2, "big", signed=False) + # format
        (1).to_bytes(2, "big", signed=False) + # tracks
        (200).to_bytes(2, "big", signed=False) # ticks per beat
    )
    
    track_chunk = (
        MIDI_TRK + 
        (event_len).to_bytes(4, "big", signed=False) + 
        event_data 
    )

    return header_chunk + track_chunk

def convert(file):
    midi = encode(file.read_bytes())

    with open(f"{file.name}.mid", "wb") as f:
        f.write(midi)

def revert(file):
    data = decode(file.read_bytes())

    new = file.name[:-4] # remove .mid
    with open(f"{new}", "wb") as f:
        f.write(data)

def __main__():
    parser = argparse.ArgumentParser()

    parser.add_argument("file", type=Path)
    parser.add_argument("-e", "--encode", action="store_true")
    parser.add_argument("-d", "--decode", action="store_true")

    args = parser.parse_args()

    if args.file and args.file.exists():
        if args.encode:
            convert(args.file)
        if args.decode:
            revert(args.file)
    else:
        print("invalid file")