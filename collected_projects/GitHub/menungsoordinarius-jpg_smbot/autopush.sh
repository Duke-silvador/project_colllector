#!/bin/bash
PATH_BOT="$(pwd)"

inotifywait -m -r -e modify,create,delete "$PATH_BOT" | while read -r directory events filename; do
    if [[ "$directory" != *".git"* ]]; then
        cd "$PATH_BOT"
        git add .
        git commit -m "Auto update: $(date +'%Y-%m-%d %H:%M:%S')"
        git push origin main
    fi
done
