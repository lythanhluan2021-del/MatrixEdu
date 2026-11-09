const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all occurrences of class="card" or class="step-section"
const cardMatches = [...html.matchAll(/<div class=["']card[^"']*["']/g)].map(m => m[0]);
console.log('Total card divs:', cardMatches.length);
console.log('Sample card classes:', [...new Set(cardMatches)].slice(0, 10));

const sectionMatches = [...html.matchAll(/<section id=["']step-(\d+)["'][^>]*>/g)].map(m => m[0]);
console.log('Section tags:', sectionMatches);

