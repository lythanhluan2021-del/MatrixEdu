const fs = require('fs');

const cur = fs.readFileSync('index.html', 'utf8');

const targetModals = [
  'modalMatrixFullscreen',
  'modalEditPaper',
  'modalDriveBank',
  'modalShuffleVariants',
  'preset-modal',
  'profiles-modal',
  'ai-config-modal',
  'modalHuongDan'
];

for (const id of targetModals) {
  console.log(`Modal ${id} present:`, cur.includes(`id="${id}"`));
}

