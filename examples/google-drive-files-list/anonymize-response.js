const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'response.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const files = data.body?.files || [];
files.forEach((file, i) => {
  const fakeId = 'file_' + String(i + 1).padStart(3, '0');
  file.id = fakeId;
  file.webViewLink = 'https://example.com/drive/file/' + fakeId;
});

// Also anonymize file names that contain personal identifiers
const anonymizeName = (name) => {
  if (!name || typeof name !== 'string') return name;
  return name
    .replace(/yaniv-shani/gi, 'sample-user')
    .replace(/yaniv_shani/gi, 'sample_user')
    .replace(/yanivshani/gi, 'sampleuser');
};

files.forEach((file) => {
  if (file.name) file.name = anonymizeName(file.name);
});

fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
console.log('Anonymized', files.length, 'files');
