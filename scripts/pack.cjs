const fs = require('fs');
const path = require('path');
const { createGzip } = require('zlib');

const platform = process.argv[2] || 'google';
const distDir = path.join(__dirname, '..', 'dist', platform);
const outputDir = path.join(__dirname, '..', 'build');
const outputFile = path.join(outputDir, `quickpaste-${platform}-${Date.now()}.zip`);

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const filesToInclude = [
  { src: path.join(distDir, 'background.js'), dest: 'dist/background.js' },
  { src: path.join(distDir, 'content.js'), dest: 'dist/content.js' },
  { src: path.join(distDir, 'sidepanel.js'), dest: 'dist/sidepanel.js' },
  { src: path.join(__dirname, '..', 'manifest.json'), dest: 'manifest.json' },
  { src: path.join(__dirname, '..', 'sidepanel.html'), dest: 'sidepanel.html' },
  { src: path.join(__dirname, '..', 'sidepanel.css'), dest: 'sidepanel.css' },
  { src: path.join(__dirname, '..', 'help.html'), dest: 'help.html' },
  { src: path.join(__dirname, '..', 'help.css'), dest: 'help.css' },
];

function readDirRecursive(dir, prefix = '') {
  const result = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const destPath = path.join(prefix, entry.name);
    if (entry.isDirectory()) {
      result.push(...readDirRecursive(fullPath, destPath));
    } else {
      result.push({ src: fullPath, dest: destPath });
    }
  }
  return result;
}

filesToInclude.push(...readDirRecursive(path.join(__dirname, '..', '_locales'), '_locales'));
filesToInclude.push(...readDirRecursive(path.join(__dirname, '..', 'demo-data'), 'demo-data'));
filesToInclude.push(...readDirRecursive(path.join(__dirname, '..', 'icons'), 'icons'));

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ -1) >>> 0;
}

function createZip(files) {
  const centralDir = [];
  let offset = 0;

  const parts = [];

  for (const file of files) {
    const content = fs.readFileSync(file.src);
    const fileName = file.dest.replace(/\\/g, '/');
    
    const localFileHeader = Buffer.alloc(30 + fileName.length);
    localFileHeader.writeUInt32LE(0x04034b50, 0);
    localFileHeader.writeUInt16LE(20, 4);
    localFileHeader.writeUInt16LE(0, 6);
    localFileHeader.writeUInt16LE(0, 8);
    localFileHeader.writeUInt16LE(0, 10);
    localFileHeader.writeUInt32LE(crc32(content), 14);
    localFileHeader.writeUInt32LE(content.length, 18);
    localFileHeader.writeUInt32LE(content.length, 22);
    localFileHeader.writeUInt16LE(fileName.length, 26);
    localFileHeader.writeUInt16LE(0, 28);
    localFileHeader.write(fileName, 30, fileName.length, 'utf8');

    parts.push(localFileHeader);
    parts.push(content);

    const centralDirEntry = Buffer.alloc(46 + fileName.length);
    centralDirEntry.writeUInt32LE(0x02014b50, 0);
    centralDirEntry.writeUInt16LE(0, 4);
    centralDirEntry.writeUInt16LE(20, 6);
    centralDirEntry.writeUInt16LE(0, 8);
    centralDirEntry.writeUInt16LE(0, 10);
    centralDirEntry.writeUInt16LE(0, 12);
    centralDirEntry.writeUInt32LE(crc32(content), 16);
    centralDirEntry.writeUInt32LE(content.length, 20);
    centralDirEntry.writeUInt32LE(content.length, 24);
    centralDirEntry.writeUInt16LE(fileName.length, 28);
    centralDirEntry.writeUInt16LE(0, 30);
    centralDirEntry.writeUInt16LE(0, 32);
    centralDirEntry.writeUInt16LE(0, 34);
    centralDirEntry.writeUInt16LE(0, 36);
    centralDirEntry.writeUInt32LE(offset, 42);
    centralDirEntry.write(fileName, 46, fileName.length, 'utf8');

    centralDir.push(centralDirEntry);
    offset += localFileHeader.length + content.length;
  }

  const centralDirData = Buffer.concat(centralDir);
  const centralDirOffset = offset;
  offset += centralDirData.length;

  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(0x06054b50, 0);
  endOfCentralDir.writeUInt16LE(0, 4);
  endOfCentralDir.writeUInt16LE(0, 6);
  endOfCentralDir.writeUInt16LE(files.length, 8);
  endOfCentralDir.writeUInt16LE(files.length, 10);
  endOfCentralDir.writeUInt32LE(centralDirData.length, 12);
  endOfCentralDir.writeUInt32LE(centralDirOffset, 16);
  endOfCentralDir.writeUInt16LE(0, 20);

  parts.push(centralDirData);
  parts.push(endOfCentralDir);

  return Buffer.concat(parts);
}

const zipData = createZip(filesToInclude);
fs.writeFileSync(outputFile, zipData);
console.log(`[Pack] ${outputFile} created (${zipData.length} bytes)`);
