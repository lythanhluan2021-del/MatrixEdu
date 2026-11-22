const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Target CSS from :root down to before /* Tables */
const oldCssStart = `  <style>
    :root {`;
const oldCssEndMarker = `    /* Tables */`;

const startIdx = html.indexOf(oldCssStart);
const endIdx = html.indexOf(oldCssEndMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find CSS start or end marker!', { startIdx, endIdx });
  process.exit(1);
}

const modernCleanCss = `  <style>
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-light: #eff6ff;
      --secondary: #0f766e;
      --secondary-light: #f0fdfa;
      --accent: #d97706;
      --accent-light: #fffbeb;
      --success: #16a34a;
      --success-light: #f0fdf4;
      --danger: #dc2626;
      --danger-light: #fef2f2;
      --bg: #f8fafc;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
      --radius: 8px;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
    }

    /* FULL-SCREEN APP LAYOUT */
    .app-layout {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100vw;
      overflow: hidden;
      background: var(--bg);
    }

    /* Top Header */
    .app-header {
      flex-shrink: 0;
      height: 56px;
      background: #0f172a;
      color: #fff;
      padding: 0 20px;
      display: flex;
      align-items: center;
      z-index: 100;
      box-shadow: 0 1px 2px rgba(0,0,0,0.06);
      border-bottom: 1px solid #1e293b;
    }
    .header-inner {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #1e293b;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      border: 1px solid #334155;
    }
    .brand-title h1 {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: 0.1px;
      color: #f8fafc;
    }
    .brand-title p {
      font-size: 0.72rem;
      color: #94a3b8;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    /* Mobile Hamburger */
    .sidebar-mobile-toggle {
      display: none;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.22);
      color: #fff;
      border-radius: 6px;
      width: 32px;
      height: 32px;
      font-size: 1.05rem;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* WORKSPACE BODY */
    .app-workspace {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 56px);
      overflow: hidden;
      position: relative;
    }

    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.5);
      z-index: 1040;
      opacity: 0;
      transition: opacity 0.25s ease;
    }
    .sidebar-backdrop.active {
      display: block;
      opacity: 1;
    }

    /* LEFT SIDEBAR */
    .app-sidebar {
      width: 270px;
      flex-shrink: 0;
      height: 100%;
      background: #ffffff;
      border-right: 1px solid #e2e8f0;
      box-shadow: none;
      display: flex;
      flex-direction: column;
      transition: width 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      position: relative;
      z-index: 90;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .app-sidebar.collapsed {
      width: 72px;
    }
    .app-sidebar.collapsed .sidebar-heading-text,
    .app-sidebar.collapsed .step-meta,
    .app-sidebar.collapsed .sidebar-footer {
      opacity: 0;
      max-width: 0;
      overflow: hidden;
      pointer-events: none;
      white-space: nowrap;
    }
    .app-sidebar.collapsed .sidebar-step-item {
      justify-content: center;
      padding: 8px 0;
    }
    .app-sidebar.collapsed .collapse-icon {
      transform: rotate(180deg);
    }

    .sidebar-header {
      padding: 10px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      min-height: 48px;
      flex-shrink: 0;
    }
    .sidebar-heading-text {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
    }
    .sidebar-title-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: #2563eb;
      color: #fff;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .sidebar-title-text {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e293b;
    }

    .sidebar-collapse-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      width: 26px;
      height: 26px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }
    .sidebar-collapse-btn:hover {
      background: #eff6ff;
      border-color: #3b82f6;
      color: #1d4ed8;
    }
    .collapse-icon {
      display: inline-block;
      font-size: 0.68rem;
      transition: transform 0.2s ease;
    }

    .sidebar-nav-list {
      padding: 8px 8px;
      display: flex;
      flex-direction: column;
      gap: 4px;
      flex: 1;
    }

    .sidebar-step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 10px;
      border-radius: 6px;
      background: #ffffff;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      transition: background-color 0.15s ease, border-color 0.15s ease;
      position: relative;
      width: 100%;
      user-select: none;
    }
    .sidebar-step-item:hover {
      background: #f8fafc;
      border-color: #e2e8f0;
      transform: none !important;
    }
    .sidebar-step-item.active {
      background: #eff6ff;
      border-color: #bfdbfe;
    }
    .sidebar-step-item.active::before {
      content: '';
      position: absolute;
      left: 0;
      top: 15%;
      bottom: 15%;
      width: 3px;
      border-radius: 0 2px 2px 0;
      background: #2563eb;
    }

    .step-icon-wrap {
      width: 34px;
      height: 34px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      transition: background-color 0.15s ease, border-color 0.15s ease;
    }
    .sidebar-step-item:hover .step-icon-wrap {
      transform: none !important;
    }
    .sidebar-step-item.active .step-icon-wrap {
      background: #dbeafe;
      border-color: #3b82f6;
    }

    .step-icon {
      font-size: 1.05rem;
    }
    .step-number-dot {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: #64748b;
      color: #fff;
      font-size: 0.58rem;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1.5px solid #fff;
    }
    .sidebar-step-item.active .step-number-dot {
      background: #2563eb;
    }
    .sidebar-step-item.completed .step-number-dot {
      background: #16a34a;
    }

    .step-meta {
      flex: 1;
      min-width: 0;
    }
    .step-title {
      font-size: 0.82rem;
      font-weight: 700;
      color: #1e293b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sidebar-step-item.active .step-title {
      color: #1d4ed8;
    }
    .step-desc {
      font-size: 0.7rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    .sidebar-footer {
      padding: 8px 10px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .sidebar-footer-card {
      background: #ffffff;
      border-radius: 6px;
      padding: 6px 8px;
      border: 1px solid #e2e8f0;
      font-size: 0.7rem;
      color: #475569;
    }
    .footer-card-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .footer-card-row:last-child {
      margin-bottom: 0;
    }

    /* RIGHT MAIN VIEWPORT */
    .main-viewport {
      flex: 1;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20px 26px 80px 26px;
      scroll-behavior: smooth;
      background: var(--bg);
    }
    .content-container {
      max-width: 1420px;
      margin: 0 auto;
    }

    /* ====================================================================== */
    /* MODERN MINIMALIST CLEAN FLAT PRO CARDS                                 */
    /* (NO JUMPING, NO 3D GLOW, NO PASTEL FLOOD, CRISP WHITE #FFFFFF)          */
    /* ====================================================================== */
    .card, .step-card {
      position: relative;
      background: #ffffff !important;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05);
      padding: 20px 22px;
      margin-bottom: 20px;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
      overflow: visible;
    }

    .card:hover, .step-card:hover {
      transform: none !important;
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06), 0 2px 4px -2px rgba(0, 0, 0, 0.04) !important;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 1px solid #e2e8f0;
    }
    .card-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* MODERN CLEAN FLAT COLOR ACCENTS (SOLID LEFT INDICATOR, CLEAN WHITE BODY) */
    .hover-zone-blue { border-left: 4px solid #2563eb !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-blue:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #2563eb !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-teal { border-left: 4px solid #0d9488 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-teal:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #0d9488 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-indigo { border-left: 4px solid #4f46e5 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-indigo:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #4f46e5 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-purple { border-left: 4px solid #9333ea !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-purple:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #9333ea !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-amber { border-left: 4px solid #d97706 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-amber:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #d97706 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-emerald { border-left: 4px solid #059669 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-emerald:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #059669 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-rose { border-left: 4px solid #e11d48 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-rose:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #e11d48 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .hover-zone-cyan { border-left: 4px solid #0284c7 !important; border-top: 1px solid #e2e8f0 !important; }
    .hover-zone-cyan:hover {
      background-color: #ffffff !important;
      border-color: #cbd5e1 !important;
      border-left-color: #0284c7 !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.06) !important;
      transform: none !important;
    }

    .question-card {
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 14px;
      margin-bottom: 12px;
      background: #ffffff;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    .question-card:hover {
      background-color: #ffffff !important;
      border-color: #94a3b8 !important;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04) !important;
      transform: none !important;
    }

    /* 7 CLEAN STEP THEMES (TINH GỌN, KHÔNG GÂY RỐI MẮT) */
    .glass-zone-step-1 { --zone-accent: #2563eb; }
    .icon-tint-1 { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; }

    .glass-zone-step-2 { --zone-accent: #4f46e5; }
    .icon-tint-2 { background: #eef2ff; color: #4338ca; border: 1px solid #e0e7ff; }

    .glass-zone-step-3 { --zone-accent: #9333ea; }
    .icon-tint-3 { background: #faf5ff; color: #7e22ce; border: 1px solid #f3e8ff; }

    .glass-zone-step-4 { --zone-accent: #0d9488; }
    .icon-tint-4 { background: #f0fdfa; color: #0f766e; border: 1px solid #ccfbf1; }

    .glass-zone-step-5 { --zone-accent: #d97706; }
    .icon-tint-5 { background: #fffbeb; color: #b45309; border: 1px solid #fef3c7; }

    .glass-zone-step-6 { --zone-accent: #059669; }
    .icon-tint-6 { background: #f0fdf4; color: #047857; border: 1px solid #d1fae5; }

    .glass-zone-step-7 { --zone-accent: #e11d48; }
    .icon-tint-7 { background: #fff1f2; color: #be123c; border: 1px solid #ffe4e6; }

    /* Grid & Form Controls */
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .form-group { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
    .form-label, .form-group label {
      font-size: 0.84rem;
      font-weight: 600;
      color: #334155;
    }
    input[type="text"], input[type="number"], input[type="password"], select, textarea {
      width: 100%;
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      font-size: 0.90rem;
      font-family: inherit;
      background: #ffffff;
      color: #0f172a;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: #2563eb;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.15);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 7px 14px;
      border-radius: 6px;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: background-color 0.15s ease, border-color 0.15s ease;
      text-decoration: none;
      white-space: nowrap;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
    }
    .btn:active {
      transform: scale(0.99);
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; box-shadow: none; }
    .btn-primary { background: #2563eb; color: #fff; border-color: #1d4ed8; }
    .btn-primary:hover:not(:disabled) { background: #1d4ed8; }
    .btn-secondary { background: #0f766e; color: #fff; border-color: #115e59; }
    .btn-secondary:hover:not(:disabled) { background: #115e59; }
    .btn-success { background: #16a34a; color: #fff; border-color: #15803d; }
    .btn-success:hover:not(:disabled) { background: #15803d; }
    .btn-accent { background: #d97706; color: #fff; border-color: #b45309; }
    .btn-accent:hover:not(:disabled) { background: #b45309; }
    .btn-danger { background: #dc2626; color: #fff; border-color: #b91c1c; }
    .btn-danger:hover:not(:disabled) { background: #b91c1c; }
    .btn-outline {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      color: #334155;
    }
    .btn-outline:hover:not(:disabled) {
      border-color: #94a3b8;
      color: #0f172a;
      background: #f8fafc;
    }
    .btn-ghost-light {
      background: rgba(255,255,255,0.12);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.24);
    }
    .btn-ghost-light:hover { background: rgba(255,255,255,0.22); }
    .btn-sm { padding: 5px 10px; font-size: 0.8rem; border-radius: 5px; }
    .btn-lg { padding: 10px 20px; font-size: 0.95rem; border-radius: 7px; }

    /* Badges & Alerts */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 0.76rem;
      font-weight: 600;
      border: 1px solid transparent;
    }
    .badge-blue { background: #eff6ff; color: #1d4ed8; border-color: #dbeafe; }
    .badge-teal { background: #f0fdfa; color: #0f766e; border-color: #ccfbf1; }
    .badge-amber { background: #fffbeb; color: #b45309; border-color: #fef3c7; }
    .badge-green { background: #f0fdf4; color: #15803d; border-color: #dcfce7; }
    .badge-red { background: #fef2f2; color: #b91c1c; border-color: #fee2e2; }

    .alert {
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 0.88rem;
      margin-bottom: 14px;
      border-left: 3px solid #2563eb;
      background: #eff6ff;
      border-top: 1px solid #dbeafe;
      border-right: 1px solid #dbeafe;
      border-bottom: 1px solid #dbeafe;
    }
    .alert-success { border-left-color: #16a34a; background: #f0fdf4; border-color: #dcfce7; color: #14532d; }
    .alert-warn { border-left-color: #d97706; background: #fffbeb; border-color: #fef3c7; color: #78350f; }
    .alert-danger { border-left-color: #dc2626; background: #fef2f2; border-color: #fee2e2; color: #7f1d1d; }

`;

html = html.substring(0, startIdx) + modernCleanCss + html.substring(endIdx);

// 2. Clean up Step 7 inline styles
// Header:
html = html.replace(
  'style="background:#1e3a8a; color:#fff; border-radius:10px; padding:14px 20px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; box-shadow:0 4px 10px rgba(30,58,138,0.2);"',
  'style="background:#0f172a; color:#fff; border-radius:8px; padding:12px 18px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;"'
);

// Left panel container:
html = html.replace(
  'style="width:410px; min-width:370px; max-width:440px; background:#ffffff; border-radius:10px; border:1px solid #cbd5e1; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.06);"',
  'style="width:410px; min-width:370px; max-width:440px; background:#ffffff; border-radius:8px; border:1px solid #e2e8f0; display:flex; flex-direction:column; overflow:hidden;"'
);

// Smart header pill bar in Left panel:
html = html.replace(
  'background:linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);',
  'background:#f8fafc;'
);

// Dropzone in Left panel:
html = html.replace(
  'background:linear-gradient(180deg, #f0f7ff 0%, #ffffff 100%); text-align:center; transition:all 0.2s ease;',
  'background:#f8fafc; text-align:center; transition:border-color 0.2s ease;'
);

// Buttons in Dropzone:
html = html.replace(
  'style="font-size:0.72rem; padding:3px 10px; background:#fff; border:1px solid #bfdbfe; color:#1d4ed8; font-weight:600; border-radius:16px; box-shadow:0 1px 2px rgba(0,0,0,0.04);"',
  'style="font-size:0.72rem; padding:3px 10px; background:#fff; border:1px solid #cbd5e1; color:#1d4ed8; font-weight:600; border-radius:6px;"'
);
html = html.replace(
  'style="font-size:0.72rem; padding:3px 10px; background:#ecfdf5; border:1px solid #a7f3d0; color:#065f46; font-weight:600; border-radius:16px; box-shadow:0 1px 2px rgba(0,0,0,0.04);"',
  'style="font-size:0.72rem; padding:3px 10px; background:#f0fdf4; border:1px solid #bbf7d0; color:#15803d; font-weight:600; border-radius:6px;"'
);

// Start grading button:
html = html.replace(
  'style="font-size:0.78rem; font-weight:700; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding:5px 12px; border-radius:6px; box-shadow:0 2px 5px rgba(37,99,235,0.25); flex-shrink:0; display:flex; align-items:center; gap:4px;"',
  'style="font-size:0.78rem; font-weight:700; background:#2563eb; padding:5px 12px; border-radius:6px; flex-shrink:0; display:flex; align-items:center; gap:4px;"'
);

// Canvas right panel container:
html = html.replace(
  'style="flex:1; min-width:520px; background:#1e293b; border-radius:10px; border:1px solid #334155; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 4px 14px rgba(0,0,0,0.15);"',
  'style="flex:1; min-width:520px; background:#1e293b; border-radius:8px; border:1px solid #334155; display:flex; flex-direction:column; overflow:hidden;"'
);

// Modal header in modalManageAnswerKeys:
html = html.replace(
  'style="padding:14px 18px; background:linear-gradient(135deg, #091325 0%, #1e3a8a 100%); color:#fff; display:flex; justify-content:space-between; align-items:center;"',
  'style="padding:14px 18px; background:#0f172a; color:#fff; display:flex; justify-content:space-between; align-items:center;"'
);

// Modal boxes shadow:
html = html.replace(
  'box-shadow: 0 20px 40px rgba(0,0,0,0.25);',
  'box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); border: 1px solid #cbd5e1;'
);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully applied Modern Clean Flat Pro Redesign to index.html!');

