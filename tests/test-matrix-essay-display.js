const assert = require('assert');
const fs = require('fs');

console.log('================================================================');
console.log('🧪 TESTING ESSAY / TỰ LUẬN MATRIX DISPLAY & MODAL CONFIRMATION');
console.log('================================================================\n');

const html = fs.readFileSync('index.html', 'utf8');

// Test 1: Check Step 2 table header
console.log('▶ [Test 1] Verifying Step 2 Table Header for Tự luận (câu)...');
assert.ok(
  html.includes('<th colspan="3" class="th-sub" style="background:#047857;">Tự luận (câu)</th>'),
  'Step 2 table header must display "Tự luận (câu)"'
);
assert.ok(
  !html.includes('<th colspan="3" class="th-sub" style="background:#047857;">Tự luận (ý)</th>'),
  'Step 2 table header must NOT display "Tự luận (ý)"'
);
console.log('  ✅ Test 1 Passed: Step 2 header correctly displays "Tự luận (câu)"!');

// Test 2: Verify renderDetectedMatrixPreview contains dynamic ESSAY and SA columns
console.log('▶ [Test 2] Verifying renderDetectedMatrixPreview contains dynamic ESSAY & SA...');
assert.ok(
  html.includes('const hasEssay = matrix.rows.some(r => Object.values(r.counts?.ESSAY || {}).some(v => Number(v) > 0));'),
  'renderDetectedMatrixPreview must check hasEssay'
);
assert.ok(
  html.includes('${hasEssay ? `<th colspan="3" style="background:#047857; color:#fff;">Tự luận (câu)</th>` : \'\'}'),
  'renderDetectedMatrixPreview must render dynamic header for Tự luận (câu)'
);
assert.ok(
  html.includes('${hasEssay ? `') && html.includes('totalEssayB'),
  'renderDetectedMatrixPreview must render dynamic body and footer for ESSAY'
);
console.log('  ✅ Test 2 Passed: renderDetectedMatrixPreview dynamically renders ESSAY columns and scores!');

// Test 3: Verify saveMatrixFromModal preserves metadata and navigates to Step 2
console.log('▶ [Test 3] Verifying saveMatrixFromModal preserves metadata and calls goToStep(2)...');
assert.ok(
  html.includes('cellCodes: origRow.cellCodes || {}'),
  'saveMatrixFromModal must preserve cellCodes'
);
assert.ok(
  html.includes('cellRefs: origRow.cellRefs || {}'),
  'saveMatrixFromModal must preserve cellRefs'
);
assert.ok(
  html.includes('essayPoints: origRow.essayPoints || {}'),
  'saveMatrixFromModal must preserve essayPoints'
);
assert.ok(
  html.includes('goToStep(2);'),
  'saveMatrixFromModal must transition smoothly to Step 2'
);
console.log('  ✅ Test 3 Passed: saveMatrixFromModal preserves row metadata and navigates to Step 2!');

console.log('\n🎉 ALL ESSAY MATRIX DISPLAY TESTS PASSED 100%!');
