// Gives Daftar.exe its own icon and name. electron-builder would do this with
// Windows tools; resedit does it in plain JavaScript, so building on Linux works.
const fs = require('node:fs');
const path = require('node:path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const { version } = context.packager.appInfo;
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  const icon = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'build', 'icon.ico')));
  const group = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)[0];
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group.id, group.lang, icon.icons.map((i) => i.data));

  const [info] = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  const [major, minor, patch] = version.split('.').map(Number);
  info.setFileVersion(major, minor, patch, 0, 1033);
  info.setProductVersion(major, minor, patch, 0, 1033);
  info.setStringValues({ lang: 1033, codepage: 1200 }, {
    ProductName: 'Daftar',
    FileDescription: 'Daftar',
    CompanyName: 'HaruFromSpace',
    LegalCopyright: 'Made by a GJU student. Not an official GJU app.',
    OriginalFilename: 'Daftar.exe',
    InternalName: 'Daftar',
    FileVersion: version,
    ProductVersion: version,
  });
  info.outputToResourceEntries(res.entries);
  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
};
