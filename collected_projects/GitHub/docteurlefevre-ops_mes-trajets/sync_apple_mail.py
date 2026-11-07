#!/usr/bin/env python3
"""
Script local macOS pour extraire automatiquement les confirmations de voyage
depuis Apple Mail (Mail.app) et les exporter en JSON pour l'application Mes Trajets.
"""
import subprocess
import json
import re
from datetime import datetime

APPLESCRIPT = '''
tell application "Mail"
    set outputList to {}
    set kwList to {"Air France", "Corsica", "SNCF", "OUIGO", "Trainline", "Corsair", "Air Corsica"}
    repeat with kw in kwList
        try
            set foundMsgs to (messages of inbox whose subject contains kw or sender contains kw)
            repeat with m in foundMsgs
                try
                    set msgId to id of m
                    set msgSubj to subject of m
                    set msgSender to sender of m
                    set msgDate to (date received of m) as string
                    set msgContent to content of m
                    if length of msgContent > 3000 then
                        set msgContent to text 1 thru 3000 of msgContent
                    end if
                    set end of outputList to (msgId as string) & "|||" & msgDate & "|||" & msgSender & "|||" & msgSubj & "|||" & msgContent
                end try
            end repeat
        end try
    end repeat
    set AppleScript's text item delimiters to "===MSG_SEP==="
    return outputList as string
end tell
'''

def main():
    print("Interrogation de l'application Apple Mail en cours...")
    proc = subprocess.run(["osascript", "-e", APPLESCRIPT], capture_output=True, text=True)
    if proc.returncode != 0:
        print("Assurez-vous que l'application Mail est ouverte sur votre Mac.")
        print("Détail :", proc.stderr)
        return
    raw = proc.stdout.strip()
    if not raw:
        print("Aucun e-mail correspondant trouvé dans la boîte de réception.")
        return
    items = raw.split("===MSG_SEP===")
    print(f"{len(items)} e-mail(s) trouvé(s). Export dans mail-export.json...")
    out = []
    seen = set()
    for item in items:
        parts = item.split("|||", 4)
        if len(parts) >= 4 and parts[0] not in seen:
            seen.add(parts[0])
            out.append({
                "id": f"mail-{parts[0]}",
                "date_received": parts[1],
                "sender": parts[2],
                "subject": parts[3],
                "snippet": parts[4] if len(parts) > 4 else ""
            })
    with open("mail-export.json", "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("Terminé ! Fichier 'mail-export.json' généré.")

if __name__ == "__main__":
    main()
