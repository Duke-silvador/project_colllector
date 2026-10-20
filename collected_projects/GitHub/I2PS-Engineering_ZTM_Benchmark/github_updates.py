"""I2PS GitHub stable release installer. Stdlib only; never starts mining.

The repository's main branch is not a runnable distribution. Downloads must be
published GitHub Releases with a SHA256SUMS.txt sidecar and an approved ZIP.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
import os
import platform
import re
import shutil
import stat
import sys
import tempfile
import urllib.error
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

REPOSITORY = 'I2PS-Engineering/Dual-ISA-RandomX-Lab'
API_URL = f'https://api.github.com/repos/{REPOSITORY}/releases/latest'
OFFICIAL_PREFIX = f'https://github.com/{REPOSITORY}/releases/download/'
CHECKSUM_NAME = 'SHA256SUMS.txt'
MAX_DOWNLOAD = 150 * 1024 * 1024
MAX_UNPACKED = 400 * 1024 * 1024
USER_AGENT = 'I2PS-RandomX-Lab-release-checker/0.1'


class ReleaseError(Exception):
    pass


def platform_asset(system=None, machine=None):
    system = system or platform.system()
    machine = (machine or platform.machine()).lower()
    if system != 'Linux':
        raise ReleaseError('Automatic GitHub installation currently supports Linux. Install Ubuntu first if migrating from Windows.')
    arch = {'x86_64': 'x86_64', 'amd64': 'x86_64', 'aarch64': 'aarch64', 'arm64': 'aarch64'}.get(machine)
    if not arch:
        raise ReleaseError(f'No I2PS release architecture matches {machine}; do not run a different-architecture executable.')
    return f'I2PS-Dual-ISA-RandomX-Lab-linux-{arch}.zip'


def fetch_bytes(url: str, limit=MAX_DOWNLOAD, opener=None):
    if not url.startswith('https://'):
        raise ReleaseError('Only HTTPS downloads are permitted')
    opener = opener or urllib.request.urlopen
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT,
                                               'Accept': 'application/vnd.github+json'})
    try:
        with opener(req, timeout=12) as response:
            # github.com release assets may redirect to signed GitHub-controlled CDN.
            actual = response.geturl() if hasattr(response, 'geturl') else url
            from urllib.parse import urlparse
            host = urlparse(actual).hostname or ''
            if host not in ('github.com', 'api.github.com', 'release-assets.githubusercontent.com',
                            'objects.githubusercontent.com', 'github-releases.githubusercontent.com'):
                raise ReleaseError('Unexpected GitHub release asset redirect')
            blob = response.read(limit + 1)
    except (OSError, urllib.error.URLError) as exc:
        raise ReleaseError(f'Unable to reach GitHub: {exc}') from exc
    if len(blob) > limit:
        raise ReleaseError('Download exceeds maximum permitted size')
    return blob


def latest_release(fetch=fetch_bytes):
    try:
        data = json.loads(fetch(API_URL, 2_000_000).decode('utf-8'))
    except ReleaseError as exc:
        if 'HTTP Error 404' in str(exc):
            raise ReleaseError('No approved stable GitHub Release is available yet. Nothing installed.') from exc
        raise
    except (UnicodeError, ValueError) as exc:
        raise ReleaseError('GitHub returned invalid release metadata') from exc
    if not isinstance(data, dict) or not isinstance(data.get('assets'), list):
        raise ReleaseError('No approved GitHub stable release is published yet. Nothing was installed.')
    if data.get('draft') or data.get('prerelease'):
        raise ReleaseError('Latest release is not approved stable')
    tag = data.get('tag_name', '')
    if not isinstance(tag, str) or not re.fullmatch(r'v?\d+\.\d+\.\d+', tag):
        raise ReleaseError('GitHub release has an invalid version tag')
    return data


def release_asset(release, name):
    assets = [x for x in release['assets'] if x.get('name') == name]
    if len(assets) != 1:
        raise ReleaseError(f'Missing uniquely named release asset: {name}')
    asset = assets[0]
    url = asset.get('browser_download_url', '')
    if not isinstance(url, str) or not url.startswith(OFFICIAL_PREFIX):
        raise ReleaseError('Asset is not located under the official I2PS GitHub releases')
    return url


def checksum_for(manifest: bytes, filename: str):
    if len(manifest) > 200000:
        raise ReleaseError('SHA256SUMS file too large')
    try:
        lines = manifest.decode('utf-8').splitlines()
    except UnicodeError as exc:
        raise ReleaseError('Checksums file is not valid text') from exc
    hashes = []
    for line in lines:
        m = re.fullmatch(r'([a-fA-F0-9]{64})\s+\*?([^/\\\s]+)', line.strip())
        if m and m.group(2) == filename:
            hashes.append(m.group(1).lower())
    if len(hashes) != 1:
        raise ReleaseError('Missing or duplicate pinned SHA-256 for the requested ZIP')
    return hashes[0]


def verify_archive(blob: bytes, expected_hash: str):
    if hashlib.sha256(blob).hexdigest() != expected_hash:
        raise ReleaseError('Package SHA-256 mismatch; refusing installation')
    try:
        zf = zipfile.ZipFile(io.BytesIO(blob))
        items = zf.infolist()
        if not items or len(items) > 2000:
            raise ReleaseError('Empty or oversized archive listing')
        total = 0
        for member in items:
            path = PurePosixPath(member.filename)
            if (path.is_absolute() or '..' in path.parts or '\\' in member.filename or
                path.parts[0] != 'dual_isa_randomx_lab' or len(path.parts) < 2):
                raise ReleaseError('Unsafe package path in ZIP')
            # App ZIPs must not replace user data, miner executables or install receipts.
            if len(path.parts) > 1 and (path.parts[1] in ('data', 'vendor') or path.name == '.i2ps-release.json'):
                raise ReleaseError('App ZIP attempts to replace locally owned data or miner files')
            mode = (member.external_attr >> 16) & 0xffff
            if stat.S_ISLNK(mode):
                raise ReleaseError('Symlinks are prohibited in release ZIP')
            if mode and stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR):
                raise ReleaseError('Special files are prohibited in release ZIP')
            total += member.file_size
            if member.file_size > 100 * 1024 * 1024 or total > MAX_UNPACKED:
                raise ReleaseError('Release ZIP uncompressed size limit exceeded')
        filenames = {i.filename for i in items}
        if not {'dual_isa_randomx_lab/server.py', 'dual_isa_randomx_lab/LICENSE.md', 'dual_isa_randomx_lab/install_i2ps_linux.sh'}.issubset(filenames):
            raise ReleaseError('Release ZIP is not a recognizable I2PS application package')
        return zf
    except (zipfile.BadZipFile, OSError) as exc:
        raise ReleaseError('Invalid ZIP archive') from exc


def base_dir():
    return Path(os.environ.get('XDG_DATA_HOME', str(Path.home() / '.local/share'))) / 'i2ps-randomx-lab'


def install(release, target, fetch=fetch_bytes):
    name = platform_asset()
    checksum_url = release_asset(release, CHECKSUM_NAME)
    package_url = release_asset(release, name)
    expected = checksum_for(fetch(checksum_url, 200000), name)
    archive = verify_archive(fetch(package_url), expected)
    target = Path(target).expanduser().resolve()
    target.mkdir(parents=True, exist_ok=True)
    current = target / 'current'
    previous = target / 'previous'
    if current.is_symlink() or previous.is_symlink():
        raise ReleaseError('Refusing to replace a symlink installation')
    staged = Path(tempfile.mkdtemp(prefix='.i2ps-staging-', dir=target))
    moved_old = False
    try:
        for member in archive.infolist():
            relative = PurePosixPath(member.filename).relative_to('dual_isa_randomx_lab')
            destination = staged.joinpath(*relative.parts)
            if member.is_dir():
                destination.mkdir(parents=True, exist_ok=True)
                continue
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(member) as src, destination.open('wb') as dst:
                shutil.copyfileobj(src, dst, length=256*1024)
        # Preserve local benchmark data and installed XMRig, but never overwrite
        # the new application code or copy machine secrets to a remote service.
        if current.is_dir():
            for name_local in ('data', 'vendor/xmrig'):
                source = current / name_local
                destination = staged / name_local
                if source.is_dir() and not source.is_symlink() and not destination.exists():
                    shutil.copytree(source, destination, symlinks=False)
        (staged / '.i2ps-release.json').write_text(json.dumps({
            'tag': release['tag_name'], 'asset': name, 'sha256': expected,
            'source': f'https://github.com/{REPOSITORY}/releases'}, indent=2), encoding='utf-8')
        if previous.exists():
            shutil.rmtree(previous)  # previous is checked not to be a symlink
        if current.exists():
            os.replace(current, previous)
            moved_old = True
        try:
            os.replace(staged, current)
        except OSError:
            if moved_old:
                os.replace(previous, current)
            raise
    finally:
        if staged.exists():
            shutil.rmtree(staged)
    return current


def check_latest():
    try:
        release = latest_release()
        name = platform_asset()
        release_asset(release, name)
        release_asset(release, CHECKSUM_NAME)
        receipt = base_dir() / 'current' / '.i2ps-release.json'
        installed = None
        if receipt.is_file():
            try:
                installed = json.loads(receipt.read_text()).get('tag')
            except (OSError, ValueError):
                pass
        return {'status': 'available', 'latest_tag': release['tag_name'], 'installed_tag': installed,
                'update_available': installed != release['tag_name'],
                'release_url': f'https://github.com/{REPOSITORY}/releases/tag/{release["tag_name"]}',
                'installation': 'Run the signed-off GitHub bootstrap or github_updates.py --install after exiting the application'}
    except ReleaseError as exc:
        return {'status': 'unavailable', 'message': str(exc),
                'release_url': f'https://github.com/{REPOSITORY}/releases'}


def main():
    p = argparse.ArgumentParser(description='I2PS release-based installer/updater (does not mine)')
    group = p.add_mutually_exclusive_group(required=True)
    group.add_argument('--check', action='store_true', help='Check official latest stable GitHub Release, without installing')
    group.add_argument('--install', action='store_true', help='Install verified stable release into user-local location')
    p.add_argument('--dir', type=Path, default=base_dir(), help='Installation directory')
    p.add_argument('--yes', action='store_true', help='Skip only installation confirmation, not mining consent')
    args = p.parse_args()
    if args.check:
        result = check_latest()
        print(json.dumps(result, indent=2))
        return 0 if result['status'] == 'available' else 2
    try:
        latest = latest_release()
        asset = platform_asset()
        release_asset(latest, asset)
        release_asset(latest, CHECKSUM_NAME)
        print('Approved I2PS version:', latest['tag_name'], '| Platform archive:', asset)
        print('Destination:', args.dir)
        print('No mining is started. The application requires separate license and mining authorization.')
        if not args.yes:
            if not sys.stdin.isatty() or input('Install this release? [y/N] ').strip().lower() != 'y':
                print('Cancelled without installation')
                return 1
        path = install(latest, args.dir)
        print('Verified installation completed:', path)
        print('Launch: cd', path, '&& bash start_linux_macos.sh')
        return 0
    except (ReleaseError, OSError) as exc:
        print('I2PS installation stopped:', exc, file=sys.stderr)
        return 2


if __name__ == '__main__':
    raise SystemExit(main())