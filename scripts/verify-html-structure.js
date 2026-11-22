const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');

// Check navigation elements
for (let i = 1; i <= 7; i++) {
  const btnExists = html.includes(`id="nav-step-${i}"`);
  const secExists = html.includes(`id="step-${i}"`);
  console.log(`Step ${i}: button exists: ${btnExists}, section exists: ${secExists}`);
}

// Check sidebar and layout elements
console.log('app-layout exists:', html.includes('id="app-layout"'));
console.log('app-sidebar exists:', html.includes('id="app-sidebar"'));
console.log('main-viewport exists:', html.includes('id="main-viewport"'));
console.log('btn-sidebar-collapse exists:', html.includes('id="btn-sidebar-collapse"'));
console.log('sidebar-mobile-toggle exists:', html.includes('class="sidebar-mobile-toggle"'));

// Check toggleSidebar and goToStep
console.log('toggleSidebar defined:', html.includes('function toggleSidebar('));
console.log('goToStep defined:', html.includes('function goToStep('));

// Check Gorilla glass zones
for (let i = 1; i <= 7; i++) {
  console.log(`glass-zone-step-${i} exists:`, html.includes(`glass-zone-step-${i}`));
}

// Check Modals
console.log('preset-modal exists:', html.includes('id="preset-modal"'));
console.log('matrix-fullscreen-modal exists:', html.includes('id="matrix-fullscreen-modal"'));
console.log('omr-edit-paper-modal exists:', html.includes('id="omr-edit-paper-modal"'));
console.log('drive-bank-modal exists:', html.includes('id="drive-bank-modal"'));

