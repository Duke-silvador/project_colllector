#!/bin/bash
set -euo pipefail
SDK="$HOME/Android/sdk"
A="$SDK/build-tools/34.0.0"
P="$SDK/platforms/android-34/android.jar"
cd "$(dirname "$0")"
rm -rf build
mkdir -p build/classes build/gen build/de
find app/src/main/java -name '*.java' > build/srcs.txt
$A/aapt2 compile --dir app/src/main/res -o build/res.zip
$A/aapt2 link -o build/base.apk -I "$P" --manifest app/src/main/AndroidManifest.xml \
  -R build/res.zip --java build/gen --min-sdk-version 26 --target-sdk-version 34 \
  --version-code 1 --version-name 1.0 2>&1 | grep -v Warning || true
echo "proxybal.app.R" > /dev/null
find build/gen -name '*.java' | grep -v proxy || true
echo '--- javac ---'
javac --release 11 -nowarn -cp "$P" -d build/classes $(cat build/srcs.txt) build/gen/proxybal/app/R.java 2>&1 | head -50
echo "--- d8 ---"
CLS=$(find build/classes -name '*.class')
java -cp "$HOME/r8.jar" com.android.tools.r8.D8 --release --min-api 26 --lib "$P" --output build/de $CLS 2>&1 | head -20
python3 - <<'EOF'
import zipfile
z = zipfile.ZipFile('build/base.apk', 'a')
z.write('build/de/classes.dex', 'classes.dex')
z.close()
EOF
$A/zipalign -f -p 4 build/base.apk build/aligned.apk
if [ ! -f debug.keystore ]; then
  keytool -genkeypair -keystore debug.keystore -alias proxy -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass proxybal -keypass proxybal -dname "CN=ProxyBal" >/dev/null 2>&1
fi
$A/apksigner sign --ks debug.keystore --ks-pass pass:proxybal --ks-key-alias proxy \
  --key-pass pass:proxybal --out build/ProxyBalancer.apk build/aligned.apk
echo "OK: build/ProxyBalancer.apk"
