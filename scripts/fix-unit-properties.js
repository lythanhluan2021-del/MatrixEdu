const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexHtmlPath, 'utf8');

// 1. Update renderUnitsTable
const oldRenderUnits = `    function renderUnitsTable() {
      const tbody = document.getElementById('units-tbody');
      const levels = getLevelsForCurrentMetadata();

      if (!appState.units || appState.units.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">Chưa có đơn vị kiến thức. Hãy tải tài liệu hoặc nhấn "+ Thêm đơn vị kiến thức".</td></tr>\`;
        return;
      }

      tbody.innerHTML = appState.units.map((u, idx) => {
        const outcomesHtml = levels.map(lv => \`
          <div style="margin-bottom:6px;">
            <span class="badge badge-blue" style="margin-bottom:3px;">\${escapeHtml(lv)}:</span>
            <input type="text" value="\${escapeHtml((u.outcomes && u.outcomes[lv]) || '')}"
                   onchange="updateUnitOutcome(\${idx}, '\${lv}', this.value)" />
          </div>
        \`).join('');

        return \`
          <tr>
            <td style="text-align:center; font-weight:700;">\${idx + 1}</td>
            <td>
              <textarea rows="3" onchange="appState.units[\${idx}].topic = this.value">\${escapeHtml(u.topic)}</textarea>
            </td>
            <td>
              <textarea rows="3" onchange="appState.units[\${idx}].unit = this.value">\${escapeHtml(u.unit)}</textarea>
            </td>
            <td>\${outcomesHtml}</td>
            <td style="text-align:center;">
              <button class="btn btn-danger btn-sm" onclick="removeUnitRow(\${idx})">✕</button>
            </td>
          </tr>
        \`;
      }).join('');
    }`;

const newRenderUnits = `    function renderUnitsTable() {
      const tbody = document.getElementById('units-tbody');
      const levels = getLevelsForCurrentMetadata();

      if (!appState.units || appState.units.length === 0) {
        tbody.innerHTML = \`<tr><td colspan="5" style="text-align:center; color:var(--muted); padding:20px;">Chưa có đơn vị kiến thức. Hãy tải tài liệu hoặc nhấn "+ Thêm đơn vị kiến thức".</td></tr>\`;
        return;
      }

      tbody.innerHTML = appState.units.map((u, idx) => {
        const topicVal = u.topic || '';
        const unitVal = u.unit || u.name || '';
        const outcomesObj = u.outcomes || u.reqs || {};
        const outcomesHtml = levels.map(lv => \`
          <div style="margin-bottom:6px;">
            <span class="badge badge-blue" style="margin-bottom:3px;">\${escapeHtml(lv)}:</span>
            <input type="text" value="\${escapeHtml(outcomesObj[lv] || '')}"
                   onchange="updateUnitOutcome(\${idx}, '\${lv}', this.value)" />
          </div>
        \`).join('');

        return \`
          <tr>
            <td style="text-align:center; font-weight:700;">\${idx + 1}</td>
            <td>
              <textarea rows="3" onchange="appState.units[\${idx}].topic = this.value">\${escapeHtml(topicVal)}</textarea>
            </td>
            <td>
              <textarea rows="3" onchange="appState.units[\${idx}].unit = this.value; appState.units[\${idx}].name = this.value;">\${escapeHtml(unitVal)}</textarea>
            </td>
            <td>\${outcomesHtml}</td>
            <td style="text-align:center;">
              <button class="btn btn-danger btn-sm" onclick="removeUnitRow(\${idx})">✕</button>
            </td>
          </tr>
        \`;
      }).join('');
    }`;

if (content.includes(oldRenderUnits)) {
  content = content.replace(oldRenderUnits, newRenderUnits);
  console.log('✓ Replaced renderUnitsTable successfully');
} else {
  console.log('⚠ Could not find exact oldRenderUnits');
}

// 2. Update updateUnitOutcome
const oldUpdateOutcome = `    function updateUnitOutcome(unitIdx, levelKey, val) {
      if (!appState.units[unitIdx].outcomes) appState.units[unitIdx].outcomes = {};
      appState.units[unitIdx].outcomes[levelKey] = val;
    }`;

const newUpdateOutcome = `    function updateUnitOutcome(unitIdx, levelKey, val) {
      if (!appState.units[unitIdx]) return;
      if (!appState.units[unitIdx].outcomes) appState.units[unitIdx].outcomes = {};
      if (!appState.units[unitIdx].reqs) appState.units[unitIdx].reqs = {};
      appState.units[unitIdx].outcomes[levelKey] = val;
      appState.units[unitIdx].reqs[levelKey] = val;
    }`;

if (content.includes(oldUpdateOutcome)) {
  content = content.replace(oldUpdateOutcome, newUpdateOutcome);
  console.log('✓ Replaced updateUnitOutcome successfully');
} else {
  console.log('⚠ Could not find exact oldUpdateOutcome');
}

// 3. Update saveMatrixFromModal unit mapping
const oldSaveUnits = `      // Đồng bộ đơn vị kiến thức (Units)
      appState.units = newRows.map((r, i) => {
        const specItem = (currentModalSpecData || [])[i];
        return {
          id: 'u_' + (i + 1),
          topic: r.topic,
          name: r.unit,
          reqs: specItem?.outcomes || {
            'Biết': 'Nhận biết các khái niệm, thành phần và quy chuẩn cơ bản.',
            'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành và phương thức tương tác.',
            'Vận dụng': 'Vận dụng kiến thức giải quyết vấn đề thực tế, cấu hình và xử lí tình huống.'
          }
        };
      });`;

const newSaveUnits = `      // Đồng bộ đơn vị kiến thức (Units) - Hỗ trợ song song cả unit, name, outcomes, reqs
      appState.units = newRows.map((r, i) => {
        const specItem = (currentModalSpecData || [])[i];
        const out = (specItem && specItem.outcomes) ? specItem.outcomes : {
          'Biết': 'Nhận biết các khái niệm, thành phần và quy chuẩn cơ bản.',
          'Hiểu': 'Hiểu nguyên lí, cơ chế vận hành và phương thức tương tác.',
          'Vận dụng': 'Vận dụng kiến thức giải quyết vấn đề thực tế, cấu hình và xử lí tình huống.'
        };
        return {
          id: 'u_' + (i + 1),
          topic: r.topic,
          unit: r.unit,
          name: r.unit,
          outcomes: out,
          reqs: out
        };
      });`;

if (content.includes(oldSaveUnits)) {
  content = content.replace(oldSaveUnits, newSaveUnits);
  console.log('✓ Replaced saveMatrixFromModal units mapping successfully');
} else {
  console.log('⚠ Could not find exact oldSaveUnits');
}

// 4. Update applyExtractedDocumentData unit mapping
const oldApplyUnits = `appState.units = Array.isArray(data.detectedUnits) ? JSON.parse(JSON.stringify(data.detectedUnits)) : [];`;
const newApplyUnits = `appState.units = (Array.isArray(data.detectedUnits) ? data.detectedUnits : []).map((u, i) => ({
          ...u,
          id: u.id || ('unit_' + (i + 1)),
          topic: u.topic || ('Chủ đề ' + (i + 1)),
          unit: u.unit || u.name || '',
          name: u.unit || u.name || '',
          outcomes: u.outcomes || u.reqs || {},
          reqs: u.outcomes || u.reqs || {}
        }));`;

if (content.includes(oldApplyUnits)) {
  content = content.replace(oldApplyUnits, newApplyUnits);
  console.log('✓ Replaced applyExtractedDocumentData units normalization successfully');
} else {
  console.log('⚠ Could not find exact oldApplyUnits');
}

// 5. Update runStep1Analysis unit mapping
const oldStep1Units = `appState.units = data.analysis.units || [];`;
const newStep1Units = `appState.units = (data.analysis.units || []).map((u, i) => ({
          ...u,
          id: u.id || ('unit_' + (i + 1)),
          topic: u.topic || ('Chủ đề ' + (i + 1)),
          unit: u.unit || u.name || '',
          name: u.unit || u.name || '',
          outcomes: u.outcomes || u.reqs || {},
          reqs: u.outcomes || u.reqs || {}
        }));`;

if (content.includes(oldStep1Units)) {
  content = content.replace(oldStep1Units, newStep1Units);
  console.log('✓ Replaced runStep1Analysis units normalization successfully');
} else {
  console.log('⚠ Could not find exact oldStep1Units');
}

fs.writeFileSync(indexHtmlPath, content, 'utf8');
console.log('All updates written to index.html successfully!');

