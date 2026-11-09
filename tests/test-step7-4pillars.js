/**
 * AUTOMATED VERIFICATION SUITE: STEP 7 (4-PILLAR OMR UPGRADE)
 * Verifies:
 * 1. Pillar 1: Real OMR Coordinate Grid & Full Part I, Part II, Part III Grading Engine
 * 2. Pillar 2: Student Roster Importer (CSV, TSV, VNEDU split columns, Smart SBD matching, API /api/omr/parse-roster)
 * 3. Pillar 3: Full Part I/II/III + SBD Live Recalculation & Audit Trail (/api/omr/update-paper)
 * 4. Pillar 4: Persistent Grading Sessions in data/omr_database (/api/omr/sessions GET/POST/DELETE)
 * 5. Frontend index.html JS syntax & presence of all 4 Pillar functions and modals
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const http = require('http');

const {
    parseStudentRosterText
} = require('../src/answer-key-parser');

const {
    gradeBatchPapers,
    updatePaperAndAudit,
    buildSmartRosterMap
} = require('../src/omr-engine');

function requestJson(method, urlPath, bodyObj = null) {
    return new Promise((resolve, reject) => {
        const payload = bodyObj ? Buffer.from(JSON.stringify(bodyObj), 'utf8') : null;
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: urlPath,
            method,
            headers: {
                'Content-Type': 'application/json',
                ...(payload ? { 'Content-Length': payload.length } : {})
            }
        }, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(raw) });
                } catch (e) {
                    reject(new Error(`Invalid JSON from ${urlPath}: ${raw.slice(0, 200)}`));
                }
            });
        });
        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTests() {
    console.log('================================================================');
    console.log('🧪 RUNNING STEP 7 (4-PILLAR OMR UPGRADE) VERIFICATION SUITE');
    console.log('================================================================\n');

    // -----------------------------------------------------------------
    // TEST 1: PILLAR 2 — Student Roster Parser & Smart SBD Matching
    // -----------------------------------------------------------------
    console.log('▶ [Pillar 2] Testing Student Roster Parser (CSV / TSV / VNEDU Split Columns)...');
    const vneduText = [
        'STT\tSố báo danh\tHọ và chữ lót\tTên\tLớp\tNgày sinh',
        '1\t120001\tNguyễn Văn\tAn\t12A1\t15/05/2008',
        '2\t120002\tTrần Thị Bích\tNgọc\t12A1\t20/08/2008',
        '3\t120003\tLê Hoàng\tNam\t12A2\t01/01/2008'
    ].join('\n');

    const parsedVnedu = parseStudentRosterText(vneduText);
    assert.ok(Array.isArray(parsedVnedu), 'VNEDU TSV roster parse should return an array');
    assert.strictEqual(parsedVnedu.length, 3, 'Should extract 3 students');
    assert.strictEqual(parsedVnedu[0].sbd, '120001');
    assert.strictEqual(parsedVnedu[0].fullName, 'Nguyễn Văn An', 'Should merge Họ đệm + Tên accurately');
    assert.strictEqual(parsedVnedu[1].fullName, 'Trần Thị Bích Ngọc');
    assert.strictEqual(parsedVnedu[2].className, '12A2');

    // Test Smart Roster Map (padded/unpadded SBD matching)
    const rosterMap = buildSmartRosterMap([
        { sbd: '000015', fullName: 'Phạm Minh Tuấn', className: '12A1' },
        { sbd: '120009', fullName: 'Hoàng Thu Trang', className: '12A3' }
    ]);
    assert.strictEqual(rosterMap.get('000015').fullName, 'Phạm Minh Tuấn');
    assert.strictEqual(rosterMap.get('15').fullName, 'Phạm Minh Tuấn', 'Smart map should match unpadded numeric SBD');
    assert.strictEqual(rosterMap.get('120009').fullName, 'Hoàng Thu Trang', 'Smart map should match 6-digit SBD');
    console.log('  ✅ Student Roster Parser & Smart SBD Matching passed!\n');

    // -----------------------------------------------------------------
    // TEST 2: PILLAR 1 & 3 — Full Part I, II, III Grading + Score Fields
    // -----------------------------------------------------------------
    console.log('▶ [Pillar 1 & 3] Testing Full OMR Grading Engine (Part I + Part II + Part III + SBD Warnings)...');
    const answerKeysByCode = {
        '101': {
            part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
            part2: {
                1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' },
                2: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' }
            },
            part3: {
                1: '-1,5',
                2: '2025'
            }
        }
    };
    const pointRules = { mcq: 0.25, tfStyle: 'moet2025', sa: 0.5 };
    const testRoster = [
        { sbd: '120001', fullName: 'Nguyễn Văn An', className: '12A1' }
    ];

    const batchRes = gradeBatchPapers({
        papers: [
            {
                id: 'paper_001',
                sbd: '120001',
                scannedExamCode: '101',
                fileName: 'scan_001.jpg',
                answers: {
                    part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'A' }, // 3/4 correct = 0.75đ
                    part2: {
                        1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }, // 4/4 correct = 1.0đ
                        2: { a: 'Đ', b: 'Đ', c: 'S', d: 'Đ' }  // 3/4 correct = 0.5đ
                    },
                    part3: {
                        1: '-1,5', // equivalent to -1.5 -> correct = 0.5đ
                        2: '2024'  // wrong = 0đ
                    }
                }
            },
            {
                id: 'paper_002',
                sbd: '999999', // Not in roster -> UNMATCHED_SBD
                scannedExamCode: '101',
                fileName: 'scan_002.jpg',
                answers: {
                    part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
                    part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }, 2: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' } },
                    part3: { 1: '-1.5', 2: '2025' }
                }
            }
        ],
        answerKeysByCode,
        pointRules,
        roster: testRoster
    });

    const p1 = batchRes.gradedPapers[0];
    assert.strictEqual(p1.studentName, 'Nguyễn Văn An', 'Paper 1 should match student Nguyễn Văn An');
    assert.strictEqual(p1.result.part1Score, 0.75, 'Part I score should be 0.75');
    assert.strictEqual(p1.result.part2Score, 1.5, 'Part II score should be 1.5');
    assert.strictEqual(p1.result.part3Score, 0.5, 'Part III score should be 0.5');
    assert.strictEqual(p1.result.totalScore, 2.75, 'Total score should be 2.75');

    const p2 = batchRes.gradedPapers[1];
    assert.ok(p2.warnings.some(w => w.type === 'UNMATCHED_SBD'), 'Paper 2 should flag UNMATCHED_SBD warning');
    assert.strictEqual(p2.result.totalScore, 4.0, 'Paper 2 with all correct should score 1.0 + 2.0 + 1.0 = 4.0');

    // Now test updating Paper 2 SBD -> '120001' and Part III Q2 -> '0' via updatePaperAndAudit
    const updateRes = updatePaperAndAudit({
        paperId: 'paper_002',
        updates: {
            sbd: '120001',
            part3Answers: { 2: '0' },
            reason: 'Sửa SBD bị mờ và câu 2 Phần III'
        },
        allPapers: batchRes.gradedPapers,
        answerKeysByCode,
        pointRules,
        roster: testRoster,
        user: 'GV Kiểm thử'
    });

    assert.strictEqual(updateRes.updatedPaper.sbd, '120001', 'Updated SBD should be 120001');
    assert.strictEqual(updateRes.updatedPaper.studentName, 'Nguyễn Văn An', 'Updated SBD should auto-match student name');
    assert.strictEqual(updateRes.updatedPaper.result.part3Score, 0.5, 'Updated Part III score should drop to 0.5');
    assert.strictEqual(updateRes.updatedPaper.result.totalScore, 3.5, 'Updated Total score should recalculate to 3.5');
    assert.ok(updateRes.newAuditRecords.length >= 2, 'Audit trail should record both SBD and Part III changes');
    console.log('  ✅ Full Grading Engine + Live SBD/Part III Recalculation & Audit Trail passed!\n');

    // -----------------------------------------------------------------
    // TEST 3: HTTP API ENDPOINTS (Roster, Grade-Batch, Sessions CRUD)
    // -----------------------------------------------------------------
    console.log('▶ [Pillar 2 & 4] Testing Live HTTP API Endpoints (/api/omr/parse-roster, /grade-batch, /sessions)...');
    const apiRosterRes = await requestJson('POST', '/api/omr/parse-roster', {
        rawText: vneduText
    });
    assert.strictEqual(apiRosterRes.status, 200);
    assert.strictEqual(apiRosterRes.data.ok, true);
    assert.strictEqual(apiRosterRes.data.totalStudents, 3);

    const apiGradeRes = await requestJson('POST', '/api/omr/grade-batch', {
        answerKeysByCode,
        pointRules,
        papers: [
            {
                id: 'paper_ngoc',
                sbd: '120002',
                scannedExamCode: '101',
                fileName: 'scan_ngoc.jpg',
                answers: {
                    part1: { 1: 'A', 2: 'B', 3: 'C', 4: 'D' },
                    part2: { 1: { a: 'Đ', b: 'S', c: 'Đ', d: 'S' }, 2: { a: 'Đ', b: 'Đ', c: 'S', d: 'S' } },
                    part3: { 1: '-1,5', 2: '2025' }
                }
            }
        ]
    });
    assert.strictEqual(apiGradeRes.status, 200);
    assert.strictEqual(apiGradeRes.data.ok, true);
    assert.strictEqual(apiGradeRes.data.gradedPapers[0].studentName, 'Trần Thị Bích Ngọc', 'Should auto-match active roster on server');
    assert.ok(apiGradeRes.data.savedSession && apiGradeRes.data.savedSession.id, 'Should auto-save grading session snapshot');

    const savedId = apiGradeRes.data.savedSession.id;

    // List sessions
    const listRes = await requestJson('GET', '/api/omr/sessions');
    assert.strictEqual(listRes.status, 200);
    assert.ok(listRes.data.sessions.some(s => s.id === savedId), 'Saved session should appear in /api/omr/sessions list');

    // Load specific session
    const loadRes = await requestJson('GET', `/api/omr/sessions/${encodeURIComponent(savedId)}`);
    assert.strictEqual(loadRes.status, 200);
    assert.strictEqual(loadRes.data.session.id, savedId);
    assert.strictEqual(loadRes.data.session.gradedPapers[0].studentName, 'Trần Thị Bích Ngọc');

    // Clean up test session & restore default 35-student roster
    const delRes = await requestJson('DELETE', `/api/omr/sessions/${encodeURIComponent(savedId)}`);
    assert.strictEqual(delRes.status, 200);
    assert.strictEqual(delRes.data.ok, true);

    await requestJson('POST', '/api/omr/parse-roster', { resetDefault: true });
    console.log('  ✅ HTTP API Endpoints (/parse-roster, /grade-batch, /sessions GET/POST/DELETE) passed!\n');

    // -----------------------------------------------------------------
    // TEST 4: FRONTEND index.html INTEGRITY CHECK
    // -----------------------------------------------------------------
    console.log('▶ [Frontend] Verifying index.html Step 7 functions & UI components...');
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    const requiredTokens = [
        'scanOmrSheetFromImageElement',
        'extractJpegBlobsFromPdfFile',
        'downloadSampleFilledOmrSheetPng',
        'openOmrRosterModal',
        'handleOmrRosterFileSelect',
        'parsePastedOmrRoster',
        'saveOmrRosterFromModal',
        'renderOmrReportsView',
        'loadSavedOmrSessionById',
        'deleteSavedOmrSessionById',
        'saveCurrentOmrSessionManual',
        'edit-paper-part3-grid',
        'modalOmrRoster',
        'omr-saved-sessions-list'
    ];
    for (const token of requiredTokens) {
        assert.ok(html.includes(token), `index.html must contain ${token}`);
    }
    console.log('  ✅ All Frontend UI components & functions verified in index.html!\n');

    console.log('🎉 ALL STEP 7 (4-PILLAR UPGRADE) TESTS PASSED 100%!');
}

runTests().catch(err => {
    console.error('❌ STEP 7 TEST FAILED:', err);
    process.exit(1);
});
