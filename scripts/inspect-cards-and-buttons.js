const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all card titles across the file
const cardTitles = [...html.matchAll(/class=["']card-title["'][^>]*>(.*?)<\/div>/g)].map(m => m[1].replace(/<[^>]+>/g, '').trim());
console.log('Card titles in index.html:\n', cardTitles);

// Find buttons
const buttons = [...html.matchAll(/<button[^>]*onclick=["']([^"']+)["'][^>]*>(.*?)<\/button>/g)].map(m => ({ fn: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() }));
console.log('\nTotal buttons with onclick:', buttons.length);
const fnCounts = {};
buttons.forEach(b => {
  const baseFn = b.fn.split('(')[0];
  fnCounts[baseFn] = (fnCounts[baseFn] || 0) + 1;
});
console.log('Functions with multiple buttons:', Object.entries(fnCounts).filter(([k, v]) => v > 1));

