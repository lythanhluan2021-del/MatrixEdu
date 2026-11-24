/**
 * src/docx-exam-importer.js
 * Bộ đọc & Trộn đề thi thủ công từ file Word (.docx) BẢO TOÀN NGUYÊN BẢN OOXML:
 * - Giữ nguyên 100% công thức Word Equation (<m:oMath>, <m:oMathPara>)
 * - Giữ nguyên 100% đối tượng MathType (<w:object> + word/embeddings/* + word/media/*.wmf|emf|png)
 * - Giữ nguyên 100% hình ảnh (đồ thị, hình học, mạch điện, công thức cấu tạo, sơ đồ sinh học: <w:drawing>, <w:pict>, word/media/*)
 * - Giữ nguyên 100% chỉ số trên/dưới (<w:vertAlign>) và bảng biểu trong câu hỏi
 * - Tự động nhận diện đáp án đúng (gạch chân <w:u>, chữ đỏ/xanh <w:color>, tô sáng <w:highlight>, dấu * hoặc bảng đáp án cuối file)
 * - Tự động chuyển OMML -> HTML hiển thị đẹp (phân số, căn, mũ, chỉ số) + ảnh base64 để xem trước trực tiếp trên Web/EXE
 * - Hỗ trợ xuất lại file Word (.docx) sau khi trộn nhiều mã đề mà KHÔNG làm hỏng bất kỳ công thức hay hình ảnh nào!
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { readZipEntries, createZipBuffer, decodeXmlEntities } = require('./zip-docx');
const { detectMetadataFromTablesAndText } = require('./doc-parser');
const { parseAnyAnswerKeyFile } = require('./answer-key-parser');

const RUNTIME_DATA_DIR = process.env.VERCEL
  ? path.join(os.tmpdir(), 'matrixedu_data')
  : path.join(__dirname, '..', 'data');
const OOXML_CACHE_DIR = path.join(RUNTIME_DATA_DIR, 'ooxml_sources');

// Cache trên RAM để tăng tốc xuất Word và hỗ trợ môi trường Serverless
const memoryOoxmlCache = new Map();

function ensureOoxmlCacheDir() {
  try {
    if (!fs.existsSync(OOXML_CACHE_DIR)) {
      fs.mkdirSync(OOXML_CACHE_DIR, { recursive: true });
    }
  } catch (_) {}
}

function saveOoxmlSourceCache(sourceId, payload) {
  memoryOoxmlCache.set(sourceId, payload);
  // Giới hạn RAM tối đa 10 đề gần nhất
  if (memoryOoxmlCache.size > 10) {
    const oldestKey = memoryOoxmlCache.keys().next().value;
    memoryOoxmlCache.delete(oldestKey);
  }
  try {
    ensureOoxmlCacheDir();
    const serializable = {
      sourceId,
      fileName: payload.fileName,
      docRootTag: payload.docRootTag,
      sectPr: payload.sectPr,
      savedAt: new Date().toISOString(),
      entriesBase64: {}
    };
    for (const [k, buf] of Object.entries(payload.entries || {})) {
      serializable.entriesBase64[k] = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(String(buf), 'utf8').toString('base64');
    }
    fs.writeFileSync(path.join(OOXML_CACHE_DIR, `${sourceId}.json`), JSON.stringify(serializable), 'utf8');
  } catch (_) {}
}

function loadOoxmlSourceCache(sourceId) {
  if (!sourceId) return null;
  if (memoryOoxmlCache.has(sourceId)) {
    return memoryOoxmlCache.get(sourceId);
  }
  try {
    const fp = path.join(OOXML_CACHE_DIR, `${sourceId}.json`);
    if (fs.existsSync(fp)) {
      const parsed = JSON.parse(fs.readFileSync(fp, 'utf8'));
      const entries = {};
      for (const [k, b64] of Object.entries(parsed.entriesBase64 || {})) {
        entries[k] = Buffer.from(b64, 'base64');
      }
      const restored = {
        sourceId,
        fileName: parsed.fileName,
        docRootTag: parsed.docRootTag,
        sectPr: parsed.sectPr,
        entries
      };
      memoryOoxmlCache.set(sourceId, restored);
      return restored;
    }
  } catch (_) {}
  return null;
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Đọc word/_rels/document.xml.rels -> Map { rId: targetPath }
 */
function parseRelationshipsMap(relsXml) {
  const map = {};
  if (!relsXml) return map;
  const regex = /<Relationship\b([^>]+)\/?>/gi;
  let m;
  while ((m = regex.exec(relsXml)) !== null) {
    const attrs = m[1];
    const idMatch = attrs.match(/\bId="([^"]+)"/i);
    const targetMatch = attrs.match(/\bTarget="([^"]+)"/i);
    const typeMatch = attrs.match(/\bType="([^"]+)"/i);
    if (idMatch && targetMatch) {
      let target = targetMatch[1].replace(/\\/g, '/').replace(/^\/+/, '');
      if (!target.startsWith('word/') && !target.startsWith('http')) {
        target = 'word/' + target.replace(/^\.\//, '');
      }
      map[idMatch[1]] = {
        target,
        type: typeMatch ? typeMatch[1] : ''
      };
    }
  }
  return map;
}

/**
 * Chuyển đổi file ảnh trong word/media/* sang Data URI để hiển thị trực tiếp trên Web
 */
function buildMediaDataUriMap(entries) {
  const map = {};
  const mimeByExt = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp'
  };
  for (const [name, buf] of Object.entries(entries || {})) {
    if (!/^word\/media\//i.test(name)) continue;
    const ext = name.split('.').pop().toLowerCase();
    const mime = mimeByExt[ext];
    if (mime && Buffer.isBuffer(buf)) {
      map[name] = `data:${mime};base64,${buf.toString('base64')}`;
    } else {
      // Định dạng vector Windows (.wmf/.emf từ MathType cũ) — giữ nguyên trong Word, hiển thị nhãn xem trước trên web
      map[name] = `__VECTOR_MEDIA__:${path.basename(name)}`;
    }
  }
  return map;
}

/**
 * Tách nội dung con theo tên thẻ XML (hỗ trợ thẻ lồng nhau cùng tên như <m:f> bên trong <m:f>)
 */
function extractBalancedTag(xml, tagName, startPos = 0) {
  const openRe = new RegExp(`<${tagName}(?:\\s[^>]*)?>`, 'g');
  openRe.lastIndex = startPos;
  const first = openRe.exec(xml);
  if (!first) return null;

  const openStart = first.index;
  const contentStart = openRe.lastIndex;
  const selfClosing = first[0].endsWith('/>');
  if (selfClosing) {
    return { full: first[0], inner: '', start: openStart, end: contentStart };
  }

  const tokenRe = new RegExp(`<(\\/?)${tagName}(?:\\s[^>]*)?(\\/?)>`, 'g');
  tokenRe.lastIndex = contentStart;
  let depth = 1;
  let m;
  while ((m = tokenRe.exec(xml)) !== null) {
    const isClose = m[1] === '/';
    const isSelf = m[2] === '/';
    if (isSelf) continue;
    if (isClose) depth--;
    else depth++;
    if (depth === 0) {
      return {
        full: xml.slice(openStart, tokenRe.lastIndex),
        inner: xml.slice(contentStart, m.index),
        start: openStart,
        end: tokenRe.lastIndex
      };
    }
  }
  return null;
}

/**
 * Chuyển đổi đệ quy biểu thức OMML (<m:oMath>...</m:oMath>) sang Plain Text & Rich HTML (hiển thị đẹp offline)
 */
function ommlToTextAndHtml(ommlXml) {
  if (!ommlXml) return { text: '', html: '' };

  function walk(nodeXml) {
    let text = '';
    let html = '';
    let pos = 0;

    while (pos < nodeXml.length) {
      const nextTagIdx = nodeXml.indexOf('<m:', pos);
      if (nextTagIdx === -1) break;

      const nameMatch = nodeXml.slice(nextTagIdx).match(/^<(m:[a-zA-Z0-9]+)/);
      if (!nameMatch) {
        pos = nextTagIdx + 3;
        continue;
      }
      const tag = nameMatch[1];
      const extracted = extractBalancedTag(nodeXml, tag, nextTagIdx);
      if (!extracted) {
        pos = nextTagIdx + tag.length + 2;
        continue;
      }

      if (tag === 'm:t') {
        const val = decodeXmlEntities(extracted.inner);
        text += val;
        html += escapeHtml(val);
      } else if (tag === 'm:f') {
        const numTag = extractBalancedTag(extracted.inner, 'm:num', 0);
        const denTag = extractBalancedTag(extracted.inner, 'm:den', 0);
        const num = walk(numTag ? numTag.inner : '');
        const den = walk(denTag ? denTag.inner : '');
        text += `(${num.text})/(${den.text})`;
        html += `<span class="omml-frac" style="display:inline-flex;flex-direction:column;align-items:center;vertical-align:middle;margin:0 2px;line-height:1.1;font-size:0.9em;"><span style="border-bottom:1px solid currentColor;padding:0 3px;">${num.html}</span><span style="padding:0 3px;">${den.html}</span></span>`;
      } else if (tag === 'm:sSup') {
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const supTag = extractBalancedTag(extracted.inner, 'm:sup', 0);
        const base = walk(eTag ? eTag.inner : '');
        const sup = walk(supTag ? supTag.inner : '');
        text += `${base.text}^(${sup.text})`;
        html += `${base.html}<sup>${sup.html}</sup>`;
      } else if (tag === 'm:sSub') {
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const subTag = extractBalancedTag(extracted.inner, 'm:sub', 0);
        const base = walk(eTag ? eTag.inner : '');
        const sub = walk(subTag ? subTag.inner : '');
        text += `${base.text}_(${sub.text})`;
        html += `${base.html}<sub>${sub.html}</sub>`;
      } else if (tag === 'm:sSubSup') {
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const subTag = extractBalancedTag(extracted.inner, 'm:sub', 0);
        const supTag = extractBalancedTag(extracted.inner, 'm:sup', 0);
        const base = walk(eTag ? eTag.inner : '');
        const sub = walk(subTag ? subTag.inner : '');
        const sup = walk(supTag ? supTag.inner : '');
        text += `${base.text}_(${sub.text})^(${sup.text})`;
        html += `${base.html}<sub>${sub.html}</sub><sup>${sup.html}</sup>`;
      } else if (tag === 'm:rad') {
        const degTag = extractBalancedTag(extracted.inner, 'm:deg', 0);
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const deg = walk(degTag ? degTag.inner : '');
        const inner = walk(eTag ? eTag.inner : '');
        const degClean = deg.text.trim();
        text += degClean ? `root(${degClean},${inner.text})` : `√(${inner.text})`;
        html += `${degClean ? `<sup style="font-size:0.7em;">${deg.html}</sup>` : ''}√<span style="border-top:1px solid currentColor;padding:0 2px;">${inner.html}</span>`;
      } else if (tag === 'm:d') {
        const begMatch = extracted.inner.match(/<m:begChr\s+m:val="([^"]*)"/i);
        const endMatch = extracted.inner.match(/<m:endChr\s+m:val="([^"]*)"/i);
        const beg = begMatch ? decodeXmlEntities(begMatch[1]) : '(';
        const end = endMatch ? decodeXmlEntities(endMatch[1]) : ')';
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const inner = walk(eTag ? eTag.inner : '');
        text += `${beg}${inner.text}${end}`;
        html += `${escapeHtml(beg)}${inner.html}${escapeHtml(end)}`;
      } else if (tag === 'm:nary') {
        const chrMatch = extracted.inner.match(/<m:chr\s+m:val="([^"]*)"/i);
        const sym = chrMatch ? decodeXmlEntities(chrMatch[1]) : '∫';
        const subTag = extractBalancedTag(extracted.inner, 'm:sub', 0);
        const supTag = extractBalancedTag(extracted.inner, 'm:sup', 0);
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const sub = walk(subTag ? subTag.inner : '');
        const sup = walk(supTag ? supTag.inner : '');
        const body = walk(eTag ? eTag.inner : '');
        text += `${sym}${sub.text ? `_${sub.text}` : ''}${sup.text ? `^${sup.text}` : ''} ${body.text}`;
        html += `<span style="font-size:1.15em;">${escapeHtml(sym)}</span>${sub.html ? `<sub>${sub.html}</sub>` : ''}${sup.html ? `<sup>${sup.html}</sup>` : ''} ${body.html}`;
      } else if (tag === 'm:acc') {
        const chrMatch = extracted.inner.match(/<m:chr\s+m:val="([^"]*)"/i);
        const chr = chrMatch ? decodeXmlEntities(chrMatch[1]) : '⃗';
        const eTag = extractBalancedTag(extracted.inner, 'm:e', 0);
        const inner = walk(eTag ? eTag.inner : '');
        text += inner.text + (chr === '→' || chr === '⃗' ? '⃗' : '');
        html += `<span style="position:relative;display:inline-block;">${inner.html}</span>`;
      } else if (tag === 'm:r' || tag === 'm:oMath' || tag === 'm:oMathPara' || tag === 'm:e' || tag === 'm:mr' || tag === 'm:m' || tag === 'm:func' || tag === 'm:fName' || tag === 'm:limLow' || tag === 'm:lim') {
        const sub = walk(extracted.inner);
        text += sub.text;
        html += sub.html;
      }

      pos = extracted.end;
    }

    return { text, html };
  }

  const res = walk(ommlXml);
  return {
    text: res.text.trim(),
    html: res.html ? `<span class="omml-math" style="font-family:'Cambria Math','Times New Roman',serif;font-style:italic;">${res.html}</span>` : ''
  };
}

/**
 * Kiểm tra xem mã màu hex Word (<w:color w:val="..."/>) có phải màu đánh dấu đáp án (đỏ / xanh dương / xanh lá nổi bật) không
 */
function isAnswerHighlightColor(hexVal) {
  if (!hexVal) return false;
  const h = String(hexVal).trim().toUpperCase().replace(/^#/, '');
  if (!/^[0-9A-F]{6}$/.test(h)) return false;
  if (h === '000000' || h === 'FFFFFF' || h === 'AUTO') return false;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  // Đỏ nổi bật (VD: FF0000, C00000, EE0000, E31E24, DC2626)
  if (r >= 150 && g <= 95 && b <= 95) return true;
  // Xanh lá hoặc xanh dương đậm dùng làm đáp án (VD: 00B050, 0070C0, 0000FF)
  if (b >= 165 && r <= 70 && g <= 130) return true;
  if (g >= 140 && r <= 70 && b <= 110) return true;
  return false;
}

/**
 * Phân tích 1 đoạn <w:p> thành danh sách token giữ nguyên thứ tự xuất hiện:
 * text run (<w:r>), công thức (<m:oMath>), hình ảnh (<w:drawing>/<w:pict>/<w:object>)
 */
function parseRichParagraph(pXml, relsMap, mediaDataUriMap) {
  const tokens = [];
  let plainText = '';
  let richHtml = '';
  let formulaCount = 0;
  let imageCount = 0;
  const underlinedTexts = [];
  const coloredTexts = [];

  // Lấy nội dung bên trong <w:p ...>...</w:p> (bỏ qua <w:pPr>)
  const pOpenEnd = pXml.indexOf('>');
  const pCloseStart = pXml.lastIndexOf('</w:p>');
  const inner = (pOpenEnd !== -1 && pCloseStart > pOpenEnd) ? pXml.slice(pOpenEnd + 1, pCloseStart) : pXml;

  let pos = 0;
  while (pos < inner.length) {
    const nextW = inner.indexOf('<w:r', pos);
    const nextM = inner.indexOf('<m:oMath', pos);
    const nextHyper = inner.indexOf('<w:hyperlink', pos);

    const candidates = [
      nextW !== -1 ? { idx: nextW, kind: 'r' } : null,
      nextM !== -1 ? { idx: nextM, kind: 'm' } : null,
      nextHyper !== -1 ? { idx: nextHyper, kind: 'h' } : null
    ].filter(Boolean).sort((a, b) => a.idx - b.idx);

    if (candidates.length === 0) break;
    const pick = candidates[0];

    // Tránh nhầm <w:rPr> với <w:r>
    if (pick.kind === 'r' && !/^<w:r(?:\s|>|\/)/.test(inner.slice(pick.idx))) {
      pos = pick.idx + 4;
      continue;
    }

    if (pick.kind === 'm') {
      const isPara = inner.slice(pick.idx).startsWith('<m:oMathPara');
      const tagName = isPara ? 'm:oMathPara' : 'm:oMath';
      const extracted = extractBalancedTag(inner, tagName, pick.idx);
      if (!extracted) { pos = pick.idx + 8; continue; }
      const converted = ommlToTextAndHtml(extracted.full);
      formulaCount++;
      plainText += converted.text;
      richHtml += converted.html || `<span class="omml-math">[Công thức]</span>`;
      tokens.push({
        type: 'math',
        xml: extracted.full,
        text: converted.text,
        html: converted.html,
        marked: false
      });
      pos = extracted.end;
      continue;
    }

    if (pick.kind === 'h') {
      const extracted = extractBalancedTag(inner, 'w:hyperlink', pick.idx);
      if (!extracted) { pos = pick.idx + 12; continue; }
      const sub = parseRichParagraph(`<w:p>${extracted.inner}</w:p>`, relsMap, mediaDataUriMap);
      plainText += sub.plainText;
      richHtml += sub.richHtml;
      formulaCount += sub.formulaCount;
      imageCount += sub.imageCount;
      tokens.push(...sub.tokens);
      pos = extracted.end;
      continue;
    }

    // <w:r>...</w:r>
    const extracted = extractBalancedTag(inner, 'w:r', pick.idx);
    if (!extracted) { pos = pick.idx + 4; continue; }
    const rXml = extracted.full;

    const rPrTag = extractBalancedTag(rXml, 'w:rPr', 0);
    const rPr = rPrTag ? rPrTag.inner : '';
    const isUnderlined = /<w:u\b/i.test(rPr) && !/<w:u\b[^>]*w:val="none"/i.test(rPr);
    const colorMatch = rPr.match(/<w:color\b[^>]*w:val="([^"]+)"/i);
    const isColored = colorMatch ? isAnswerHighlightColor(colorMatch[1]) : false;
    const isHighlighted = /<w:highlight\b/i.test(rPr) && !/<w:highlight\b[^>]*w:val="none"/i.test(rPr);
    const isBold = /<w:b(?:\s|\/|>)/i.test(rPr) && !/<w:b\b[^>]*w:val="(?:0|false)"/i.test(rPr);
    const isItalic = /<w:i(?:\s|\/|>)/i.test(rPr) && !/<w:i\b[^>]*w:val="(?:0|false)"/i.test(rPr);
    const vertMatch = rPr.match(/<w:vertAlign\b[^>]*w:val="(superscript|subscript)"/i);
    const vertAlign = vertMatch ? vertMatch[1].toLowerCase() : '';
    const isMarked = isUnderlined || isColored || isHighlighted;

    // Kiểm tra hình ảnh (<w:drawing> / <a:blip> / <v:imagedata>) hoặc MathType (<w:object>)
    const hasObject = /<w:object\b/i.test(rXml);
    const hasDrawingOrPict = /<w:drawing\b|<w:pict\b|<a:blip\b|<v:imagedata\b/i.test(rXml);
    if (hasObject || hasDrawingOrPict) {
      const rIdMatch = rXml.match(/r:(?:embed|id)="([^"]+)"/i);
      const rel = rIdMatch ? relsMap[rIdMatch[1]] : null;
      const mediaData = rel ? mediaDataUriMap[rel.target] : null;
      if (hasObject) {
        formulaCount++;
      } else {
        imageCount++;
      }

      let imgHtml = '';
      if (mediaData && mediaData.startsWith('data:image/')) {
        const maxH = hasObject ? '32px' : '220px';
        imgHtml = `<img src="${mediaData}" style="max-width:100%;max-height:${maxH};vertical-align:middle;border-radius:4px;margin:2px 3px;" alt="${hasObject ? 'Công thức MathType' : 'Hình minh họa'}" />`;
      } else if (hasObject) {
        imgHtml = `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:#eef2ff;color:#3730a3;font-size:0.78em;font-weight:700;border:1px solid #c7d2fe;">📐 [MathType bảo toàn trong Word]</span>`;
      } else {
        imgHtml = `<span style="display:inline-block;padding:1px 6px;border-radius:4px;background:#ecfdf5;color:#065f46;font-size:0.78em;font-weight:700;border:1px solid #a7f3d0;">🖼️ [Hình ảnh bảo toàn trong Word]</span>`;
      }

      plainText += hasObject ? ' [Công thức] ' : ' [Hình ảnh] ';
      richHtml += imgHtml;
      tokens.push({
        type: hasObject ? 'object' : 'image',
        xml: rXml,
        text: hasObject ? ' [Công thức] ' : ' [Hình ảnh] ',
        html: imgHtml,
        marked: isMarked
      });
    }

    // Trích text + tab + br trong <w:r>
    const subRegex = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/?>|<w:br\s*\/?>/g;
    let sm;
    let runText = '';
    while ((sm = subRegex.exec(rXml)) !== null) {
      if (sm[0].startsWith('<w:tab')) runText += '\t';
      else if (sm[0].startsWith('<w:br')) runText += '\n';
      else runText += decodeXmlEntities(sm[1]);
    }

    if (runText) {
      let dispText = runText;
      if (vertAlign === 'superscript') dispText = `^${runText}`;
      else if (vertAlign === 'subscript') dispText = `_${runText}`;

      let dispHtml = escapeHtml(runText).replace(/\n/g, '<br/>').replace(/\t/g, ' &nbsp; ');
      if (vertAlign === 'superscript') dispHtml = `<sup>${dispHtml}</sup>`;
      else if (vertAlign === 'subscript') dispHtml = `<sub>${dispHtml}</sub>`;
      if (isBold) dispHtml = `<b>${dispHtml}</b>`;
      if (isItalic) dispHtml = `<i>${dispHtml}</i>`;
      if (isUnderlined) {
        underlinedTexts.push(runText.trim());
      }
      if (isColored || isHighlighted) {
        coloredTexts.push(runText.trim());
      }

      plainText += dispText;
      richHtml += dispHtml;
      tokens.push({
        type: 'run',
        xml: rXml,
        rPr,
        text: runText,
        dispText,
        html: dispHtml,
        marked: isMarked,
        isUnderlined,
        isColored,
        isHighlighted
      });
    }

    pos = extracted.end;
  }

  return {
    rawXml: pXml,
    tokens,
    plainText: plainText.replace(/[ \t]+/g, ' ').trim(),
    rawPlainText: plainText,
    richHtml: richHtml.trim(),
    formulaCount,
    imageCount,
    underlinedTexts: underlinedTexts.filter(Boolean),
    coloredTexts: coloredTexts.filter(Boolean),
    hasMarked: tokens.some(t => t.marked)
  };
}

/**
 * Tách 1 đoạn văn chứa nhiều phương án trên cùng dòng (VD: "A. x^2   B. x^3   C. 2x   D. 3x")
 * thành các đoạn con cho từng phương án mà VẪN GIỮ NGUYÊN 100% <m:oMath>, <w:object>, <w:drawing>!
 */
function splitInlineOptionsFromTokens(tokens, labelMode = 'ABCD') {
  const re = labelMode === 'ABCD'
    ? /(?:^|[\s\t])(\*?[A-D]\*?)\s*([.)])\s*/g
    : /(?:^|[\s\t])(\*?[a-d]\*?)\s*([.)])\s*/g;

  // Xây chuỗi chỉ mục từ danh sách token để biết chính xác ranh giới ký tự của từng nhãn A./B./C./D.
  const flatChunks = [];
  let fullStr = '';
  tokens.forEach((tk, tIdx) => {
    const start = fullStr.length;
    const chunkText = tk.type === 'run' ? tk.text : (tk.text || '\uFFFC');
    fullStr += chunkText;
    flatChunks.push({ tIdx, start, end: fullStr.length, tk, chunkText });
  });

  const markers = [];
  let m;
  while ((m = re.exec(fullStr)) !== null) {
    const rawLbl = m[1];
    const cleanLbl = rawLbl.replace(/\*/g, '');
    const lblChar = labelMode === 'ABCD' ? cleanLbl.toUpperCase() : cleanLbl.toLowerCase();
    // Tìm vị trí bắt đầu của nhãn thực (bỏ qua khoảng trắng đứng trước)
    const leadingWsLen = m[0].indexOf(rawLbl);
    const labelStart = m.index + leadingWsLen;
    const contentStart = m.index + m[0].length;
    // Kiểm tra ký tự nhãn có được đánh dấu (gạch chân / màu đỏ / dấu *) không
    const labelChunk = flatChunks.find(c => labelStart >= c.start && labelStart < c.end);
    const labelMarked = Boolean(rawLbl.includes('*') || (labelChunk && labelChunk.tk.marked));

    markers.push({
      label: lblChar,
      matchStart: m.index,
      labelStart,
      contentStart,
      labelMarked
    });
  }

  if (markers.length === 0) return null;

  // Chỉ chấp nhận nếu chuỗi nhãn hợp lệ (bắt đầu từ A/a hoặc là 1 nhãn ở đầu dòng)
  const expectedOrder = labelMode === 'ABCD' ? ['A', 'B', 'C', 'D'] : ['a', 'b', 'c', 'd'];
  const validMarkers = [];
  for (const mk of markers) {
    // Nếu là nhãn đầu tiên mà trước đó có văn bản dài -> chỉ chấp nhận nếu là A/a hoặc có từ 2 nhãn trở lên
    if (validMarkers.length === 0) {
      validMarkers.push(mk);
    } else {
      const prevIdx = expectedOrder.indexOf(validMarkers[validMarkers.length - 1].label);
      const curIdx = expectedOrder.indexOf(mk.label);
      if (curIdx > prevIdx) {
        validMarkers.push(mk);
      }
    }
  }
  if (validMarkers.length === 0) return null;

  function sliceRange(rangeStart, rangeEnd) {
    let xml = '';
    let text = '';
    let html = '';
    let marked = false;
    let formulaCount = 0;
    let imageCount = 0;

    for (const ch of flatChunks) {
      if (ch.end <= rangeStart || ch.start >= rangeEnd) continue;
      if (ch.tk.type !== 'run') {
        xml += ch.tk.xml;
        text += ch.tk.text;
        html += ch.tk.html;
        if (ch.tk.type === 'math' || ch.tk.type === 'object') formulaCount++;
        if (ch.tk.type === 'image') imageCount++;
        if (ch.tk.marked) marked = true;
      } else {
        const localStart = Math.max(0, rangeStart - ch.start);
        const localEnd = Math.min(ch.chunkText.length, rangeEnd - ch.start);
        const subStr = ch.chunkText.slice(localStart, localEnd);
        if (!subStr) continue;
        // Dựng lại <w:r> giữ nguyên rPr gốc!
        const rPrWrap = ch.tk.rPr ? `<w:rPr>${ch.tk.rPr}</w:rPr>` : '';
        xml += `<w:r>${rPrWrap}<w:t xml:space="preserve">${escapeXml(subStr)}</w:t></w:r>`;
        text += subStr;
        html += escapeHtml(subStr).replace(/\n/g, '<br/>');
        if (ch.tk.marked && subStr.trim().length > 0) marked = true;
      }
    }
    return {
      xml: xml.trim(),
      text: text.replace(/\s+/g, ' ').trim(),
      html: html.trim(),
      marked,
      formulaCount,
      imageCount
    };
  }

  const prefix = validMarkers[0].matchStart > 0
    ? sliceRange(0, validMarkers[0].matchStart)
    : null;

  const options = validMarkers.map((mk, idx) => {
    const nextStart = (idx + 1 < validMarkers.length) ? validMarkers[idx + 1].matchStart : fullStr.length;
    const body = sliceRange(mk.contentStart, nextStart);
    return {
      label: mk.label,
      xml: body.xml,
      text: body.text,
      html: body.html,
      marked: mk.labelMarked || body.marked,
      formulaCount: body.formulaCount,
      imageCount: body.imageCount
    };
  });

  return { prefix, options };
}

/**
 * Xóa gạch chân / màu đỏ / highlight đáp án trong 1 đoạn XML để bản in học sinh KHÔNG BAO GIỜ lộ đáp án!
 */
function stripAnswerHighlightingFromXml(xmlFragment) {
  if (!xmlFragment) return '';
  return String(xmlFragment)
    .replace(/<w:u\b[^>]*\/?>/gi, '')
    .replace(/<w:highlight\b[^>]*\/?>/gi, '')
    .replace(/<w:color\b[^>]*w:val="([^"]+)"[^>]*\/?>/gi, (full, hex) => {
      return isAnswerHighlightColor(hex) ? '' : full;
    });
}

/**
 * Xóa tiền tố "Câu 12." hoặc "Bài 3:" khỏi phần đầu đoạn XML câu hỏi để gắn lại số câu mới sau khi trộn
 */
function stripQuestionNumberPrefixFromXml(pXml) {
  if (!pXml) return '';
  let stripped = false;
  return pXml.replace(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g, (full, inner) => {
    if (stripped) return full;
    const decoded = decodeXmlEntities(inner);
    if (!decoded.trim()) return full;
    const m = decoded.match(/^\s*(?:Câu(?:\s*hỏi)?|Bài|Question)\s*\d+\s*[:.)\-]?\s*/i);
    if (m) {
      stripped = true;
      const rest = decoded.slice(m[0].length);
      return `<w:t xml:space="preserve">${escapeXml(rest)}</w:t>`;
    }
    // Trường hợp "Câu" ở run 1 và " 1." ở run 2
    if (/^\s*(?:Câu(?:\s*hỏi)?|Bài|Question)\s*$/i.test(decoded)) {
      return `<w:t xml:space="preserve"></w:t>`;
    }
    if (/^\s*\d+\s*[:.)\-]\s*/.test(decoded)) {
      stripped = true;
      const rest = decoded.replace(/^\s*\d+\s*[:.)\-]\s*/, '');
      return `<w:t xml:space="preserve">${escapeXml(rest)}</w:t>`;
    }
    stripped = true;
    return full;
  });
}

/**
 * Chèn nhãn mới (VD: "Câu 5. ") in đậm vào ngay đầu 1 đoạn <w:p> gốc (giữ nguyên toàn bộ công thức & ảnh phía sau!)
 */
function prependBoldLabelToParagraphXml(pXml, labelText) {
  const cleanP = stripAnswerHighlightingFromXml(stripQuestionNumberPrefixFromXml(pXml));
  const labelRun = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${escapeXml(labelText)}</w:t></w:r>`;
  // Chèn ngay sau </w:pPr> nếu có, hoặc ngay sau <w:p...>
  if (/<\/w:pPr>/i.test(cleanP)) {
    return cleanP.replace(/<\/w:pPr>/i, `</w:pPr>${labelRun}`);
  }
  return cleanP.replace(/<w:p\b[^>]*>/i, (m) => `${m}${labelRun}`);
}

/**
 * Bóc tách 1 bảng Word (<w:tbl>) thành dạng text 2D và HTML xem trước
 */
function parseTableElement(tblXml, relsMap, mediaDataUriMap) {
  const rows = [];
  let htmlRows = '';
  let formulaCount = 0;
  let imageCount = 0;
  const trRegex = /<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/g;
  let trM;
  while ((trM = trRegex.exec(tblXml)) !== null) {
    const rowCells = [];
    let htmlCells = '';
    const tcRegex = /<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/g;
    let tcM;
    while ((tcM = tcRegex.exec(trM[1])) !== null) {
      const pRegex = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
      let pM;
      const cellTexts = [];
      const cellHtmls = [];
      const cellRawXmls = [];
      let cellMarked = false;
      while ((pM = pRegex.exec(tcM[0])) !== null) {
        const rp = parseRichParagraph(pM[0], relsMap, mediaDataUriMap);
        formulaCount += rp.formulaCount;
        imageCount += rp.imageCount;
        if (rp.plainText) cellTexts.push(rp.plainText);
        if (rp.richHtml) cellHtmls.push(rp.richHtml);
        cellRawXmls.push(pM[0]);
        if (rp.hasMarked) cellMarked = true;
      }
      rowCells.push({
        text: cellTexts.join(' '),
        html: cellHtmls.join('<br/>'),
        rawXmls: cellRawXmls,
        marked: cellMarked
      });
      htmlCells += `<td style="border:1px solid #cbd5e1;padding:4px 8px;">${cellHtmls.join('<br/>')}</td>`;
    }
    if (rowCells.length > 0) {
      rows.push(rowCells);
      htmlRows += `<tr>${htmlCells}</tr>`;
    }
  }
  return {
    rawXml: tblXml,
    rows,
    plainMatrix: rows.map(r => r.map(c => c.text)),
    richHtml: `<table style="border-collapse:collapse;margin:6px 0;font-size:0.9em;width:auto;">${htmlRows}</table>`,
    formulaCount,
    imageCount
  };
}

/**
 * Đọc toàn bộ file đề thi thủ công (.docx) -> danh sách câu hỏi có kèm OOXML gốc + richHtml + đáp án
 */
function parseManualExamDocx(buffer, fileName = 'de_goc.docx') {
  const entries = readZipEntries(buffer);
  const docXmlBuf = entries['word/document.xml'];
  if (!docXmlBuf) {
    throw new Error('File .docx không hợp lệ (không tìm thấy word/document.xml).');
  }
  const xml = docXmlBuf.toString('utf8');
  const relsXml = entries['word/_rels/document.xml.rels']
    ? entries['word/_rels/document.xml.rels'].toString('utf8')
    : '';
  const relsMap = parseRelationshipsMap(relsXml);
  const mediaDataUriMap = buildMediaDataUriMap(entries);

  const docRootMatch = xml.match(/<w:document\b[^>]*>/i);
  const docRootTag = docRootMatch
    ? docRootMatch[0]
    : '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math">';
  const sectPrMatch = xml.match(/<w:sectPr\b[\s\S]*?<\/w:sectPr>/i);
  const sectPr = sectPrMatch
    ? sectPrMatch[0]
    : '<w:sectPr><w:pgSz w:w="11906" w:h="16838" w:orient="portrait"/><w:pgMar w:top="1134" w:right="1020" w:bottom="1134" w:left="1418" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr>';

  const bodyMatch = xml.match(/<w:body>([\s\S]*?)<\/w:body>/i);
  const bodyXml = bodyMatch ? bodyMatch[1] : xml;

  // 1. Duyệt các phần tử cấp 1 của <w:body> theo đúng thứ tự (<w:p> và <w:tbl>)
  const bodyItems = [];
  const plainParagraphs = [];
  const plainTables = [];
  let pos = 0;

  while (pos < bodyXml.length) {
    const nextP = bodyXml.indexOf('<w:p', pos);
    const nextT = bodyXml.indexOf('<w:tbl', pos);
    const cands = [
      nextP !== -1 ? { idx: nextP, kind: 'p' } : null,
      nextT !== -1 ? { idx: nextT, kind: 'tbl' } : null
    ].filter(Boolean).sort((a, b) => a.idx - b.idx);

    if (cands.length === 0) break;
    const pick = cands[0];

    if (pick.kind === 'p') {
      if (!/^<w:p(?:\s|>|\/)/.test(bodyXml.slice(pick.idx))) {
        pos = pick.idx + 4;
        continue;
      }
      const ex = extractBalancedTag(bodyXml, 'w:p', pick.idx);
      if (!ex) { pos = pick.idx + 4; continue; }
      const rp = parseRichParagraph(ex.full, relsMap, mediaDataUriMap);
      if (rp.plainText || rp.imageCount > 0 || rp.formulaCount > 0) {
        bodyItems.push({ kind: 'p', ...rp });
        if (rp.plainText) plainParagraphs.push(rp.plainText);
      }
      pos = ex.end;
    } else {
      if (!/^<w:tbl(?:\s|>|\/)/.test(bodyXml.slice(pick.idx))) {
        pos = pick.idx + 6;
        continue;
      }
      const ex = extractBalancedTag(bodyXml, 'w:tbl', pick.idx);
      if (!ex) { pos = pick.idx + 6; continue; }
      const tb = parseTableElement(ex.full, relsMap, mediaDataUriMap);
      bodyItems.push({ kind: 'tbl', ...tb });
      if (tb.plainMatrix.length > 0) plainTables.push(tb.plainMatrix);
      pos = ex.end;
    }
  }

  // 2. Thử trích xuất Bảng đáp án cuối đề (nếu có) để bổ sung cho các câu không gạch chân/bôi đỏ
  let bottomAnswerKey = null;
  try {
    const akMap = parseAnyAnswerKeyFile(fileName, buffer);
    const codes = Object.keys(akMap || {});
    if (codes.length > 0) {
      bottomAnswerKey = akMap[codes[0]];
    }
  } catch (_) {}

  // 3. Phân đoạn thành các Câu hỏi (Phần I MCQ, Phần II TF, Phần III SA, Phần IV Tự luận)
  let currentSection = 'MCQ'; // 'MCQ' | 'TF' | 'SA' | 'ESSAY' | 'ANSWER_SECTION'
  let currentGroupId = null;
  let pendingGroupContext = null; // Ngữ liệu dùng chung (Đọc hiểu / Thí nghiệm / Phả hệ)
  const questions = [];
  let curQ = null;

  function finalizeQuestion(q) {
    if (!q) return;
    // Tự động suy luận dạng câu hỏi nếu tiêu đề phần chưa ghi rõ
    if (q.statements && q.statements.length > 0) {
      q.type = 'TF';
    } else if (q.options && q.options.length >= 2) {
      q.type = 'MCQ';
    }

    if (q.type === 'MCQ') {
      // Đảm bảo đủ 4 phương án A, B, C, D
      while (q.options.length < 4) {
        q.options.push('');
        q.optionXmls.push('');
        q.optionRichHtmls.push('');
      }
      if (!q.answer && q.markedOptions.length > 0) {
        q.answer = q.markedOptions[0];
      }
    } else if (q.type === 'TF') {
      const subLetters = ['a', 'b', 'c', 'd'];
      q.statements = q.statements.slice(0, 4).map((st, idx) => ({
        letter: subLetters[idx],
        text: st.text,
        richHtml: st.richHtml,
        rawXml: st.rawXml,
        isTrue: Boolean(st.isTrue),
        answer: st.isTrue ? 'Đúng' : 'Sai',
        level: 'Hiểu'
      }));
      q.items = q.statements;
    }

    questions.push(q);
  }

  for (let i = 0; i < bodyItems.length; i++) {
    const item = bodyItems[i];

    if (item.kind === 'tbl') {
      // Nếu đang ở phần Bảng Đáp án -> bỏ qua
      if (currentSection === 'ANSWER_SECTION') continue;
      // Kiểm tra bảng tiêu đề hành chính (SỞ GD / TRƯỜNG THPT) ở đầu file -> bỏ qua
      const tblFlat = item.plainMatrix.map(r => r.join(' ')).join(' ').toLowerCase();
      if (!curQ && /(?:trường\s*thpt|sở\s*gd|kiểm\s*tra|thời\s*gian\s*làm\s*bài|mã\s*đề)/i.test(tblFlat)) {
        continue;
      }
      // Nếu là bảng đáp án 4 phương án A/B/C/D nằm trong 1 câu MCQ (nhiều GV đặt A, B, C, D trong bảng 2x2 hoặc 1x4!)
      if (curQ && curQ.type === 'MCQ' && curQ.options.length === 0) {
        const flatCells = item.rows.flat();
        const optMatches = flatCells.map(c => {
          const m = c.text.match(/^(\*?[A-D]\*?)\s*[.)]\s*([\s\S]*)$/i);
          return m ? { label: m[1].replace(/\*/g, '').toUpperCase(), cell: c, bodyText: m[2].trim(), hasStar: m[1].includes('*') } : null;
        }).filter(Boolean);
        if (optMatches.length === 4) {
          const order = ['A', 'B', 'C', 'D'];
          order.forEach(lbl => {
            const found = optMatches.find(o => o.label === lbl);
            if (found) {
              curQ.options.push(found.bodyText);
              // Trích nội dung XML bỏ nhãn A.
              const cellXmlInner = found.cell.rawXmls.map(px => {
                const parsedP = parseRichParagraph(px, relsMap, mediaDataUriMap);
                const split = splitInlineOptionsFromTokens(parsedP.tokens, 'ABCD');
                return (split && split.options[0]) ? split.options[0].xml : '';
              }).join('');
              curQ.optionXmls.push(cellXmlInner);
              curQ.optionRichHtmls.push(found.cell.html.replace(/^(?:<[^>]+>)*\*?[A-D]\*?\s*[.)]\s*/i, ''));
              if (found.cell.marked || found.hasStar) {
                curQ.markedOptions.push(lbl);
              }
            }
          });
          curQ.formulaCount += item.formulaCount;
          curQ.imageCount += item.imageCount;
          continue;
        }
      }

      // Bảng dữ liệu / bảng biến thiên / bảng thống kê thuộc nội dung câu hỏi hiện tại -> giữ nguyên nguyên bản XML!
      if (curQ) {
        curQ.stemXmlBlocks.push(item.rawXml);
        curQ.richHtml += item.richHtml;
        curQ.stem += `\n[Bảng số liệu]`;
        curQ.formulaCount += item.formulaCount;
        curQ.imageCount += item.imageCount;
      }
      continue;
    }

    // item.kind === 'p'
    const text = item.plainText;
    const lower = text.toLowerCase();

    // 3.1. Nhận diện tiêu đề chuyển phần (Phần I, Phần II, Phần III, Tự luận, Bảng Đáp án cuối file — KHÔNG nhầm với dòng "Đáp án: -2,5" của từng câu!)
    const isStandaloneAnswerHeading = (
      /^(?:bảng\s*đáp\s*án|đáp\s*án\s+(?:và\s*hướng\s*dẫn\s*chấm|chi\s*tiết|tham\s*khảo|các\s*mã\s*đề)|hướng\s*dẫn\s*chấm)\b/i.test(lower) ||
      /^đáp\s*án\s*:?\s*$/i.test(lower)
    ) && text.length < 90;
    if (isStandaloneAnswerHeading) {
      finalizeQuestion(curQ);
      curQ = null;
      currentSection = 'ANSWER_SECTION';
      continue;
    }
    if (currentSection === 'ANSWER_SECTION') continue;

    if (/^(?:phần\s*(?:iii|iv|3|4)|[ivx]+\.)[\s\.\-:]*(?:tự\s*luận)\b/i.test(lower) || /^tự\s*luận\b/i.test(lower)) {
      finalizeQuestion(curQ);
      curQ = null;
      currentSection = 'ESSAY';
      currentGroupId = null;
      continue;
    }
    if (/^(?:phần\s*(?:iii|3)|[ivx]+\.)[\s\.\-:]*(?:câu\s*(?:hỏi\s*)?trắc\s*nghiệm\s*)?(?:trả\s*lời\s*ngắn|điền\s*khuyết)/i.test(lower)) {
      finalizeQuestion(curQ);
      curQ = null;
      currentSection = 'SA';
      currentGroupId = null;
      continue;
    }
    if (/^(?:phần\s*(?:ii|2)|[ivx]+\.)[\s\.\-:]*(?:câu\s*(?:hỏi\s*)?trắc\s*nghiệm\s*)?(?:đúng[\s\/\-–]+sai)/i.test(lower)) {
      finalizeQuestion(curQ);
      curQ = null;
      currentSection = 'TF';
      currentGroupId = null;
      continue;
    }
    if (/^(?:phần\s*(?:i|1)|[ivx]+\.)[\s\.\-:]*(?:câu\s*(?:hỏi\s*)?trắc\s*nghiệm\s*)?(?:nhiều\s*(?:phương\s*án|lựa\s*chọn)|khách\s*quan|4\s*lựa\s*chọn)/i.test(lower)) {
      finalizeQuestion(curQ);
      curQ = null;
      currentSection = 'MCQ';
      currentGroupId = null;
      continue;
    }

    // Bỏ qua dòng hướng dẫn chung dưới tiêu đề phần ("Thí sinh trả lời từ câu 1 đến câu 12...")
    if (!curQ && /^(?:thí\s*sinh\s*trả\s*lời|mỗi\s*câu\s*hỏi\s*thí\s*sinh|trong\s*mỗi\s*ý\s*a\)|học\s*sinh\s*trả\s*lời|---+\s*hết\s*---+)/i.test(lower)) {
      continue;
    }
    if (/^[-–—*\s]*hết[-–—*\s]*$/i.test(lower)) {
      finalizeQuestion(curQ);
      curQ = null;
      break;
    }

    // 3.2. Phát hiện ngữ liệu dùng chung cho nhóm câu hỏi (VD: "Dùng thông tin sau cho Câu 5 và Câu 6", "Read the following passage...")
    const groupMatch = text.match(/(?:dùng\s*(?:thông\s*tin|dữ\s*liệu|hình\s*vẽ|đoạn\s*văn)\s*sau\s*(?:để\s*trả\s*lời\s*)?(?:cho\s*)?câu\s*(\d+)\s*(?:đến|và|-|–)\s*(?:câu\s*)?(\d+)|trả\s*lời\s*các\s*câu\s*(?:hỏi\s*)?từ\s*(\d+)\s*(?:đến|-)\s*(\d+)|questions?\s*(\d+)\s*(?:to|-)\s*(\d+))/i);
    if (groupMatch) {
      finalizeQuestion(curQ);
      curQ = null;
      const gStart = parseInt(groupMatch[1] || groupMatch[3] || groupMatch[5], 10);
      const gEnd = parseInt(groupMatch[2] || groupMatch[4] || groupMatch[6], 10);
      currentGroupId = `grp_${gStart}_${gEnd}`;
      pendingGroupContext = { groupId: currentGroupId, start: gStart, end: gEnd, text, xmlBlocks: [item.rawXml], html: item.richHtml };
      continue;
    }

    // 3.3. Nhận diện dòng bắt đầu Câu hỏi mới: "Câu 1.", "Câu 1:", "Bài 1."
    const qStartMatch = text.match(/^(?:Câu(?:\s*hỏi)?|Bài|Question)\s*(\d+)\s*[:.)\-]?\s*([\s\S]*)$/i);
    if (qStartMatch) {
      finalizeQuestion(curQ);
      const origNum = parseInt(qStartMatch[1], 10);
      const bodyText = qStartMatch[2].trim();

      // Kiểm tra câu này có nằm trong nhóm ngữ liệu dùng chung không
      let assignedGroupId = null;
      if (pendingGroupContext && origNum >= pendingGroupContext.start && origNum <= pendingGroupContext.end) {
        assignedGroupId = pendingGroupContext.groupId;
      } else if (pendingGroupContext && origNum > pendingGroupContext.end) {
        pendingGroupContext = null;
        currentGroupId = null;
      }

      // Kiểm tra xem ngay trên cùng dòng Câu 1 có dính luôn các phương án A. B. C. D. không
      const inlineSplit = currentSection === 'MCQ' ? splitInlineOptionsFromTokens(item.tokens, 'ABCD') : null;
      const hasInlineOptsOnStem = inlineSplit && inlineSplit.options.length >= 2;

      curQ = {
        id: `manual_${currentSection.toLowerCase()}_${questions.length + 1}`,
        origNum,
        type: currentSection,
        level: 'Hiểu',
        topic: 'Đề gốc tải lên',
        unit: fileName,
        points: currentSection === 'MCQ' ? 0.25 : currentSection === 'TF' ? 1.0 : currentSection === 'SA' ? 0.5 : 1.0,
        stem: hasInlineOptsOnStem ? (inlineSplit.prefix?.text || '').replace(/^(?:Câu(?:\s*hỏi)?|Bài|Question)\s*\d+\s*[:.)\-]?\s*/i, '').trim() : bodyText,
        richHtml: hasInlineOptsOnStem ? (inlineSplit.prefix?.html || '').replace(/^(?:<[^>]+>)*(?:Câu(?:\s*hỏi)?|Bài|Question)\s*\d+\s*[:.)\-]?\s*/i, '').trim() : item.richHtml.replace(/^(?:<[^>]+>)*(?:Câu(?:\s*hỏi)?|Bài|Question)\s*\d+\s*[:.)\-]?\s*/i, '').trim(),
        stemXmlBlocks: hasInlineOptsOnStem
          ? [`<w:p>${inlineSplit.prefix ? inlineSplit.prefix.xml : ''}</w:p>`]
          : [item.rawXml],
        options: [],
        optionXmls: [],
        optionRichHtmls: [],
        markedOptions: [],
        statements: [],
        answer: '',
        explanation: '',
        groupId: assignedGroupId,
        formulaCount: item.formulaCount,
        imageCount: item.imageCount,
        isManualImport: true,
        sourceBadge: `Đề gốc (${fileName})`
      };

      if (hasInlineOptsOnStem) {
        inlineSplit.options.forEach(opt => {
          curQ.options.push(opt.text);
          curQ.optionXmls.push(opt.xml);
          curQ.optionRichHtmls.push(opt.html);
          if (opt.marked) curQ.markedOptions.push(opt.label);
        });
      }
      continue;
    }

    // Nếu chưa vào câu hỏi nào mà có ngữ liệu nhóm -> gộp vào ngữ liệu nhóm
    if (!curQ) {
      if (pendingGroupContext) {
        pendingGroupContext.xmlBlocks.push(item.rawXml);
        pendingGroupContext.html += `<br/>${item.richHtml}`;
      }
      continue;
    }

    // 3.4. Đang bên trong 1 câu hỏi: kiểm tra dòng "Đáp án: ..." / "Đáp số: ..." / "Lời giải: ..."
    const inlineAnsMatch = text.match(/^(?:đáp\s*án|đáp\s*số|kết\s*quả|chọn)\s*[:=\-]?\s*([^\n]+)$/i);
    if (inlineAnsMatch) {
      const val = inlineAnsMatch[1].trim();
      if (curQ.type === 'MCQ') {
        const mL = val.match(/^([A-D])\b/i);
        if (mL) curQ.answer = mL[1].toUpperCase();
      } else if (curQ.type === 'SA') {
        curQ.answer = val.replace(/\s+/g, '').replace(',', '.');
      } else if (curQ.type === 'ESSAY') {
        curQ.answer = val;
      }
      continue;
    }
    if (/^(?:lời\s*giải|hướng\s*dẫn\s*giải|giải\s*thích)\s*[:\-]?/i.test(lower)) {
      curQ.explanation = text.replace(/^(?:lời\s*giải|hướng\s*dẫn\s*giải|giải\s*thích)\s*[:\-]?\s*/i, '').trim();
      continue;
    }

    // 3.5. Phương án Phần I (A. B. C. D.)
    if (curQ.type === 'MCQ') {
      const splitAbcd = splitInlineOptionsFromTokens(item.tokens, 'ABCD');
      if (splitAbcd && splitAbcd.options.length > 0 && (!splitAbcd.prefix || splitAbcd.prefix.text.length === 0)) {
        splitAbcd.options.forEach(opt => {
          curQ.options.push(opt.text);
          curQ.optionXmls.push(opt.xml);
          curQ.optionRichHtmls.push(opt.html);
          if (opt.marked) curQ.markedOptions.push(opt.label);
        });
        curQ.formulaCount += item.formulaCount;
        curQ.imageCount += item.imageCount;
        continue;
      }
    }

    // 3.6. Mệnh đề Phần II Đúng/Sai (a) b) c) d))
    if (curQ.type === 'TF' || (curQ.options.length === 0 && /^\*?[a-d]\*?\s*[.)]/i.test(text))) {
      const splitTf = splitInlineOptionsFromTokens(item.tokens, 'abcd');
      if (splitTf && splitTf.options.length > 0 && (!splitTf.prefix || splitTf.prefix.text.length === 0)) {
        curQ.type = 'TF';
        splitTf.options.forEach(opt => {
          let cleanTxt = opt.text;
          let isTrue = opt.marked;
          // Kiểm tra ký hiệu (Đ) / (S) / (Đúng) / (Sai) ở cuối dòng
          const tagEnd = cleanTxt.match(/\s*\((Đ|S|Đúng|Sai|T|F)\)\s*$/i);
          if (tagEnd) {
            isTrue = /^(Đ|Đúng|T)$/i.test(tagEnd[1]);
            cleanTxt = cleanTxt.replace(/\s*\((Đ|S|Đúng|Sai|T|F)\)\s*$/i, '').trim();
          }
          curQ.statements.push({
            letter: opt.label,
            text: cleanTxt,
            richHtml: opt.html,
            rawXml: opt.xml,
            isTrue
          });
        });
        curQ.formulaCount += item.formulaCount;
        curQ.imageCount += item.imageCount;
        continue;
      }
    }

    // 3.7. Đoạn văn bổ sung / hình vẽ / công thức đứng riêng dòng thuộc phần dẫn của câu hỏi!
    if (curQ.options.length === 0 && curQ.statements.length === 0) {
      curQ.stemXmlBlocks.push(item.rawXml);
      if (text) curQ.stem = (curQ.stem ? `${curQ.stem}\n` : '') + text;
      curQ.richHtml = (curQ.richHtml ? `${curQ.richHtml}<br/>` : '') + item.richHtml;
      curQ.formulaCount += item.formulaCount;
      curQ.imageCount += item.imageCount;
    } else if (curQ.type === 'ESSAY') {
      curQ.stemXmlBlocks.push(item.rawXml);
      if (text) curQ.stem += `\n${text}`;
      curQ.richHtml += `<br/>${item.richHtml}`;
      curQ.formulaCount += item.formulaCount;
      curQ.imageCount += item.imageCount;
    }
  }
  finalizeQuestion(curQ);

  // 4. Bổ sung đáp án từ Bảng Đáp án cuối file (nếu câu chưa có gạch chân/bôi đỏ)
  if (bottomAnswerKey) {
    let mcqIdx = 0;
    let tfIdx = 0;
    let saIdx = 0;
    questions.forEach(q => {
      if (q.type === 'MCQ') {
        if (!q.answer && bottomAnswerKey.part1 && bottomAnswerKey.part1[mcqIdx]) {
          q.answer = bottomAnswerKey.part1[mcqIdx];
        }
        mcqIdx++;
      } else if (q.type === 'TF') {
        tfIdx++;
        const k2 = bottomAnswerKey.part2 && (bottomAnswerKey.part2[tfIdx] || bottomAnswerKey.part2[String(tfIdx)]);
        if (k2 && Array.isArray(q.statements)) {
          q.statements.forEach((st, sIdx) => {
            const sub = ['a', 'b', 'c', 'd'][sIdx];
            if (k2[sub]) {
              st.isTrue = k2[sub] === 'Đ';
              st.answer = st.isTrue ? 'Đúng' : 'Sai';
            }
          });
        }
      } else if (q.type === 'SA') {
        saIdx++;
        const k3 = bottomAnswerKey.part3 && (bottomAnswerKey.part3[saIdx] || bottomAnswerKey.part3[String(saIdx)]);
        if (!q.answer && k3 !== undefined && k3 !== '') {
          q.answer = String(k3);
        }
      }
    });
  }

  // Nếu câu MCQ vẫn chưa xác định được đáp án, đánh dấu cảnh báo thay vì im lặng bịa 'A'
  const missingAnswerNums = [];
  const p3Over4Chars = [];
  let totalFormulas = 0;
  let totalImages = 0;
  let mcqCount = 0;
  let tfCount = 0;
  let saCount = 0;
  let essayCount = 0;

  questions.forEach((q, idx) => {
    totalFormulas += q.formulaCount || 0;
    totalImages += q.imageCount || 0;
    if (q.type === 'MCQ') {
      mcqCount++;
      if (!q.answer) {
        q.answer = 'A';
        q.answerUncertain = true;
        missingAnswerNums.push(`P.I Câu ${mcqCount}`);
      }
    } else if (q.type === 'TF') {
      tfCount++;
    } else if (q.type === 'SA') {
      saCount++;
      if (!q.answer) missingAnswerNums.push(`P.III Câu ${saCount}`);
      const normSa = String(q.answer || '').replace(/\s+/g, '');
      if (normSa.length > 4) {
        p3Over4Chars.push({ qNum: saCount, answer: normSa });
      }
    } else {
      essayCount++;
    }
    q.matrixRef = `MANUAL-${q.type}-${idx + 1}`;
  });

  // Tự động suy luận thang điểm chuẩn BGD 2025 (Toán: 12TN+4ĐS+6TLN×0.5; KHTN/Địa: 18TN+4ĐS+6TLN×0.25)
  const inferredSaPt = (mcqCount === 18 && tfCount === 4 && saCount === 6) ? 0.25 : 0.5;
  questions.forEach(q => {
    if (q.type === 'MCQ') q.points = 0.25;
    else if (q.type === 'TF') q.points = 1.0;
    else if (q.type === 'SA') q.points = inferredSaPt;
  });

  const detectedMetadata = detectMetadataFromTablesAndText(plainTables, plainParagraphs, fileName);
  const sourceId = `ooxml_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  saveOoxmlSourceCache(sourceId, {
    sourceId,
    fileName,
    docRootTag,
    sectPr,
    entries
  });

  return {
    sourceId,
    fileName,
    detectedMetadata,
    questions,
    stats: {
      totalQuestions: questions.length,
      mcqCount,
      tfCount,
      saCount,
      essayCount,
      formulaCount: totalFormulas,
      imageCount: totalImages,
      inferredSaPoint: inferredSaPt,
      missingAnswerNums,
      p3Over4Chars
    }
  };
}

/**
 * Tạo 1 đoạn <w:p> văn bản Times New Roman 13pt sạch cho tiêu đề phần / mã đề / bảng đáp án
 */
function simpleWordPara(text, opts = {}) {
  const align = opts.align || 'left';
  const bold = opts.bold ? '<w:b/><w:bCs/>' : '';
  const italic = opts.italic ? '<w:i/><w:iCs/>' : '';
  const sz = opts.sz || 26;
  const before = opts.before !== undefined ? opts.before : 60;
  const after = opts.after !== undefined ? opts.after : 60;
  return `<w:p><w:pPr><w:spacing w:before="${before}" w:after="${after}" w:line="276" w:lineRule="auto"/><w:jc w:val="${align}"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/>${bold}${italic}<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${escapeXml(text)}</w:t></w:r></w:p>`;
}

function simpleWordPageBreak() {
  return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
}

/**
 * Dựng 1 phương án A./B./C./D. hoặc a)/b)/c)/d) giữ nguyên 100% OOXML gốc (Equation, MathType, Hình ảnh, Chỉ số)
 */
function buildOptionParagraphFromOoxml(labelPrefix, rawInnerXml, fallbackText) {
  const labelRun = `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:b/><w:bCs/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${escapeXml(labelPrefix)}</w:t></w:r>`;
  const bodyXml = rawInnerXml && rawInnerXml.trim()
    ? stripAnswerHighlightingFromXml(rawInnerXml)
    : `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="26"/><w:szCs w:val="26"/></w:rPr><w:t xml:space="preserve">${escapeXml(fallbackText || '')}</w:t></w:r>`;
  return `<w:p><w:pPr><w:spacing w:before="30" w:after="40" w:line="264" w:lineRule="auto"/><w:ind w:left="360"/></w:pPr>${labelRun}${bodyXml}</w:p>`;
}

/**
 * Dựng bảng đáp án đa mã đề chuẩn Word A4 cho các mã đề đã trộn
 */
function buildAnswerKeyXmlTable(variants = []) {
  if (!variants.length) return '';
  let xml = simpleWordPara('BẢNG ĐÁP ÁN CÁC MÃ ĐỀ', { bold: true, align: 'center', sz: 28, before: 120, after: 120 });

  const buildGrid = (headers, rows) => {
    const colW = Math.round(5000 / headers.length);
    const tblPr = `<w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:jc w:val="center"/><w:tblBorders><w:top w:val="single" w:sz="6" w:space="0" w:color="333333"/><w:left w:val="single" w:sz="6" w:space="0" w:color="333333"/><w:bottom w:val="single" w:sz="6" w:space="0" w:color="333333"/><w:right w:val="single" w:sz="6" w:space="0" w:color="333333"/><w:insideH w:val="single" w:sz="4" w:space="0" w:color="333333"/><w:insideV w:val="single" w:sz="4" w:space="0" w:color="333333"/></w:tblBorders></w:tblPr>`;
    let hRow = '<w:tr>';
    headers.forEach(h => {
      hRow += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="pct"/><w:shd w:val="clear" w:color="auto" w:fill="E8EEF5"/></w:tcPr>${simpleWordPara(h, { bold: true, align: 'center', sz: 24, before: 30, after: 30 })}</w:tc>`;
    });
    hRow += '</w:tr>';
    let bRows = '';
    rows.forEach(r => {
      bRows += '<w:tr>';
      r.forEach(cell => {
        bRows += `<w:tc><w:tcPr><w:tcW w:w="${colW}" w:type="pct"/></w:tcPr>${simpleWordPara(cell, { align: 'center', sz: 24, before: 20, after: 20 })}</w:tc>`;
      });
      bRows += '</w:tr>';
    });
    return `<w:tbl>${tblPr}${hRow}${bRows}</w:tbl>`;
  };

  const firstQs = variants[0].questions || [];
  const mcqCount = firstQs.filter(q => q.type === 'MCQ').length;
  const tfCount = firstQs.filter(q => q.type === 'TF').length;
  const saCount = firstQs.filter(q => q.type === 'SA').length;
  const headers = ['Câu', ...variants.map(v => `Mã ${v.code}`)];

  if (mcqCount > 0) {
    xml += simpleWordPara('PHẦN I. TRẮC NGHIỆM NHIỀU LỰA CHỌN', { bold: true, sz: 26, before: 100, after: 60 });
    const rows = [];
    for (let i = 0; i < mcqCount; i++) {
      rows.push([String(i + 1), ...variants.map(v => {
        const mcqs = (v.questions || []).filter(q => q.type === 'MCQ');
        return mcqs[i]?.answer || '';
      })]);
    }
    xml += buildGrid(headers, rows);
  }

  if (tfCount > 0) {
    xml += simpleWordPara('PHẦN II. TRẮC NGHIỆM ĐÚNG SAI', { bold: true, sz: 26, before: 140, after: 60 });
    const rows = [];
    const subs = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < tfCount; i++) {
      subs.forEach((sub, sIdx) => {
        rows.push([`${i + 1}${sub}`, ...variants.map(v => {
          const tfs = (v.questions || []).filter(q => q.type === 'TF');
          const st = (tfs[i]?.statements || tfs[i]?.items || [])[sIdx];
          return st ? (st.isTrue ? 'Đ' : 'S') : '';
        })]);
      });
    }
    xml += buildGrid(headers, rows);
  }

  if (saCount > 0) {
    xml += simpleWordPara('PHẦN III. TRẢ LỜI NGẮN', { bold: true, sz: 26, before: 140, after: 60 });
    const rows = [];
    for (let i = 0; i < saCount; i++) {
      rows.push([String(i + 1), ...variants.map(v => {
        const sas = (v.questions || []).filter(q => q.type === 'SA');
        return String(sas[i]?.answer ?? '');
      })]);
    }
    xml += buildGrid(headers, rows);
  }

  return xml;
}

/**
 * Xuất lại file Word (.docx) sau khi trộn mã đề với BẢO TOÀN 100% OOXML (Equation, MathType, Hình ảnh, Bảng biểu)!
 */
function buildLosslessShuffledDocx(examData, mode = 'exam', targetVariantCode = null) {
  const source = loadOoxmlSourceCache(examData.ooxmlSourceId);
  if (!source || !source.entries) {
    return null; // Caller falls back to standard generateExamDocx
  }

  const meta = examData.metadata || {};
  const variants = (examData.variants && examData.variants.length > 0)
    ? examData.variants
    : [{ code: '101', questions: examData.questions || [] }];

  const selectedVariants = (mode === 'exam' && targetVariantCode)
    ? variants.filter(v => String(v.code) === String(targetVariantCode))
    : variants;
  const list = selectedVariants.length > 0 ? selectedVariants : [variants[0]];

  let bodyXml = '';

  function buildOneVariantXml(variant) {
    let vXml = '';
    vXml += simpleWordPara((meta.schoolName || 'TRƯỜNG THPT').toUpperCase(), { bold: true, align: 'center', sz: 26, before: 0, after: 30 });
    vXml += simpleWordPara(`ĐỀ KIỂM TRA ${(meta.examPeriod || '').toUpperCase()} — MÔN: ${(meta.subject || '').toUpperCase()} LỚP ${meta.grade || ''}`, { bold: true, align: 'center', sz: 26, before: 20, after: 30 });
    vXml += simpleWordPara(`Thời gian làm bài: ${meta.duration || 45} phút   |   MÃ ĐỀ: ${variant.code}`, { bold: true, align: 'center', sz: 26, before: 20, after: 120 });

    const qs = variant.questions || [];
    const mcqs = qs.filter(q => q.type === 'MCQ');
    const tfs = qs.filter(q => q.type === 'TF');
    const sas = qs.filter(q => q.type === 'SA');
    const essays = qs.filter(q => q.type === 'ESSAY');

    const emitQuestionStem = (q, numLabel) => {
      if (Array.isArray(q.stemXmlBlocks) && q.stemXmlBlocks.length > 0) {
        let out = '';
        q.stemXmlBlocks.forEach((blk, idx) => {
          if (idx === 0 && /^<w:p\b/i.test(blk.trim())) {
            out += prependBoldLabelToParagraphXml(blk, numLabel);
          } else {
            out += stripAnswerHighlightingFromXml(blk);
          }
        });
        return out;
      }
      return simpleWordPara(`${numLabel}${q.stem || ''}`, { before: 80, after: 40 });
    };

    if (mcqs.length > 0) {
      vXml += simpleWordPara('PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn.', { bold: true, before: 100, after: 60 });
      mcqs.forEach((q, idx) => {
        vXml += emitQuestionStem(q, `Câu ${idx + 1}. `);
        const labels = ['A', 'B', 'C', 'D'];
        (q.options || []).slice(0, 4).forEach((optText, oIdx) => {
          const optXml = Array.isArray(q.optionXmls) ? q.optionXmls[oIdx] : '';
          vXml += buildOptionParagraphFromOoxml(`${labels[oIdx]}. `, optXml, optText);
        });
      });
    }

    if (tfs.length > 0) {
      vXml += simpleWordPara('PHẦN II. Câu trắc nghiệm đúng sai.', { bold: true, before: 120, after: 60 });
      tfs.forEach((q, idx) => {
        vXml += emitQuestionStem(q, `Câu ${idx + 1}. `);
        const subs = ['a', 'b', 'c', 'd'];
        const stmts = q.statements || q.items || [];
        stmts.slice(0, 4).forEach((st, sIdx) => {
          vXml += buildOptionParagraphFromOoxml(`${subs[sIdx]}) `, st.rawXml || '', st.text || '');
        });
      });
    }

    if (sas.length > 0) {
      vXml += simpleWordPara('PHẦN III. Câu trắc nghiệm trả lời ngắn.', { bold: true, before: 120, after: 60 });
      sas.forEach((q, idx) => {
        vXml += emitQuestionStem(q, `Câu ${idx + 1}. `);
      });
    }

    if (essays.length > 0) {
      vXml += simpleWordPara('PHẦN IV. TỰ LUẬN.', { bold: true, before: 120, after: 60 });
      essays.forEach((q, idx) => {
        vXml += emitQuestionStem(q, `Câu ${idx + 1}. `);
      });
    }

    vXml += simpleWordPara('---------- HẾT ----------', { bold: true, align: 'center', before: 140, after: 60 });
    return vXml;
  }

  if (mode === 'answer') {
    bodyXml = buildAnswerKeyXmlTable(variants);
  } else if (mode === 'exam') {
    list.forEach((v, idx) => {
      if (idx > 0) bodyXml += simpleWordPageBreak();
      bodyXml += buildOneVariantXml(v);
    });
  } else {
    // 'full': Tất cả mã đề + Bảng đáp án
    variants.forEach((v, idx) => {
      if (idx > 0) bodyXml += simpleWordPageBreak();
      bodyXml += buildOneVariantXml(v);
    });
    bodyXml += simpleWordPageBreak();
    bodyXml += buildAnswerKeyXmlTable(variants);
  }

  const finalDocumentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n${source.docRootTag}<w:body>${bodyXml}${source.sectPr}</w:body></w:document>`;

  // Giữ nguyên 100% mọi file tài nguyên gốc của .docx (word/media/*, word/embeddings/*, rels, styles, content types)
  const outEntries = { ...source.entries };
  outEntries['word/document.xml'] = Buffer.from(finalDocumentXml, 'utf8');
  return createZipBuffer(outEntries);
}

module.exports = {
  parseManualExamDocx,
  buildLosslessShuffledDocx,
  loadOoxmlSourceCache,
  ommlToTextAndHtml,
  stripAnswerHighlightingFromXml
};
