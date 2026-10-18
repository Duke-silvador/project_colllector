#!/bin/sh
# Run before every push so open copies of the app see a newer build and reload.
N=$(date +%s)
sed -i "s/name=\"mb-build\" content=\"[0-9]*\"/name=\"mb-build\" content=\"$N\"/; s/var B=\"[0-9]*\"/var B=\"$N\"/" index.html
sed -i "s/^Last updated:.*/Last updated: $(TZ=America\/New_York date '+%b %-d, %Y · %-I:%M %p') ET./" README.md
echo "stamped $N"
