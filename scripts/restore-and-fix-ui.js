const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

const completeCleanCss = `
    :root {
      --primary: #1e40af;
      --primary-hover: #1d4ed8;
      --primary-light: #dbeafe;
      --secondary: #0f766e;
      --secondary-light: #ccfbf1;
      --accent: #d97706;
      --accent-light: #fef3c7;
      --success: #15803d;
      --success-light: #dcfce7;
      --danger: #b91c1c;
      --danger-light: #fee2e2;
      --bg: #f1f5f9;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --radius: 10px;
      --shadow: 0 4px 16px rgba(15, 23, 42, 0.07);
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
      height: 60px;
      background: linear-gradient(135deg, #091325 0%, #172d54 55%, #0d4a52 100%);
      color: #fff;
      padding: 0 20px;
      display: flex;
      align-items: center;
      z-index: 100;
      box-shadow: 0 2px 10px rgba(0,0,0,0.18);
      border-bottom: 1px solid rgba(255,255,255,0.12);
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
      gap: 12px;
    }
    .brand-icon {
      width: 38px;
      height: 38px;
      border-radius: 9px;
      background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.08));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 800;
      border: 1.5px solid rgba(255,255,255,0.3);
    }
    .brand-title h1 {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.2px;
      color: #f8fafc;
    }
    .brand-title p {
      font-size: 0.74rem;
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
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.28);
      color: #fff;
      border-radius: 8px;
      width: 34px;
      height: 34px;
      font-size: 1.1rem;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    /* WORKSPACE BODY */
    .app-workspace {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 60px);
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
      border-right: 1px solid #cbd5e1;
      box-shadow: 2px 0 10px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
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
      padding: 9px 0;
    }
    .app-sidebar.collapsed .collapse-icon {
      transform: rotate(180deg);
    }

    .sidebar-header {
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid #e2e8f0;
      background: #f8fafc;
      min-height: 52px;
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
      font-weight: 800;
      letter-spacing: 0.6px;
      background: #2563eb;
      color: #fff;
      padding: 2px 6px;
      border-radius: 5px;
    }
    .sidebar-title-text {
      font-size: 0.82rem;
      font-weight: 800;
      color: #1e293b;
    }

    .sidebar-collapse-btn {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 7px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      transition: all 0.2s ease;
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
      transition: transform 0.25s ease;
    }

    .sidebar-nav-list {
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    .sidebar-step-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 10px;
      border-radius: 10px;
      background: #ffffff;
      border: 1px solid transparent;
      cursor: pointer;
      text-align: left;
      transition: all 0.2s ease;
      position: relative;
      width: 100%;
      user-select: none;
    }
    .sidebar-step-item:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
      transform: translateX(2px);
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
      width: 4px;
      border-radius: 0 4px 4px 0;
      background: #2563eb;
    }

    .step-icon-wrap {
      width: 36px;
      height: 36px;
      border-radius: 9px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      transition: all 0.2s ease;
    }
    .sidebar-step-item:hover .step-icon-wrap {
      transform: scale(1.05);
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
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: #64748b;
      color: #fff;
      font-size: 0.6rem;
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
      background: #10b981;
    }

    .step-meta {
      flex: 1;
      min-width: 0;
    }
    .step-title {
      font-size: 0.83rem;
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
      padding: 10px 12px;
      border-top: 1px solid #e2e8f0;
      background: #f8fafc;
      flex-shrink: 0;
    }
    .sidebar-footer-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 7px 9px;
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
      padding: 22px 28px 80px 28px;
      scroll-behavior: smooth;
      background: var(--bg);
    }
    .content-container {
      max-width: 1420px;
      margin: 0 auto;
    }

    /* CLEAN MODERN PRO CARDS WITH VIBRANT HOVER */
    .card, .step-card {
      position: relative;
      background: #ffffff;
      border-radius: var(--radius);
      border: 1px solid #cbd5e1;
      border-top: 4px solid var(--zone-accent, #2563eb);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
      padding: 22px;
      margin-bottom: 22px;
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
                  background-color 0.25s ease,
                  border-color 0.25s ease,
                  box-shadow 0.25s ease;
      overflow: visible;
    }

    .card:hover, .step-card:hover {
      transform: translateY(-3px);
      background-color: var(--zone-bg-hover, #eff6ff) !important;
      border-color: var(--zone-border-hover, #3b82f6) !important;
      border-top-color: var(--zone-accent, #2563eb) !important;
      box-shadow: 0 12px 28px var(--zone-glow, rgba(37, 99, 235, 0.16)), 0 4px 10px rgba(0, 0, 0, 0.04) !important;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      padding-bottom: 12px;
      margin-bottom: 16px;
      border-bottom: 2px solid #f1f5f9;
    }
    .card-title {
      font-size: 1.08rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* 7 DISTINCT HOVER COLOR ZONES */
    .glass-zone-step-1 {
      --zone-accent: #2563eb;
      --zone-bg-hover: #eff6ff;
      --zone-border-hover: #3b82f6;
      --zone-glow: rgba(37, 99, 235, 0.2);
    }
    .icon-tint-1 { background: #eff6ff; color: #1d4ed8; }

    .glass-zone-step-2 {
      --zone-accent: #4f46e5;
      --zone-bg-hover: #eef2ff;
      --zone-border-hover: #6366f1;
      --zone-glow: rgba(79, 70, 229, 0.2);
    }
    .icon-tint-2 { background: #eef2ff; color: #4338ca; }

    .glass-zone-step-3 {
      --zone-accent: #9333ea;
      --zone-bg-hover: #faf5ff;
      --zone-border-hover: #a855f7;
      --zone-glow: rgba(147, 51, 234, 0.2);
    }
    .icon-tint-3 { background: #faf5ff; color: #7e22ce; }

    .glass-zone-step-4 {
      --zone-accent: #0d9488;
      --zone-bg-hover: #f0fdfa;
      --zone-border-hover: #14b8a6;
      --zone-glow: rgba(13, 148, 136, 0.2);
    }
    .icon-tint-4 { background: #f0fdfa; color: #0f766e; }

    .glass-zone-step-5 {
      --zone-accent: #d97706;
      --zone-bg-hover: #fffbeb;
      --zone-border-hover: #f59e0b;
      --zone-glow: rgba(217, 119, 6, 0.2);
    }
    .icon-tint-5 { background: #fffbeb; color: #b45309; }

    .glass-zone-step-6 {
      --zone-accent: #059669;
      --zone-bg-hover: #f0fdf4;
      --zone-border-hover: #10b981;
      --zone-glow: rgba(16, 185, 129, 0.2);
    }
    .icon-tint-6 { background: #f0fdf4; color: #047857; }

    .glass-zone-step-7 {
      --zone-accent: #e11d48;
      --zone-bg-hover: #fff1f2;
      --zone-border-hover: #f43f5e;
      --zone-glow: rgba(225, 29, 72, 0.2);
    }
    .icon-tint-7 { background: #fff1f2; color: #be123c; }

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
      padding: 8px 11px;
      border: 1px solid var(--border);
      border-radius: 7px;
      font-size: 0.92rem;
      font-family: inherit;
      background: #fff;
      color: var(--text);
      transition: border-color 0.15s;
    }
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(30, 64, 175, 0.12);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 8px 15px;
      border-radius: 7px;
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all 0.18s;
      text-decoration: none;
      white-space: nowrap;
    }
    .btn:disabled { opacity: 0.55; cursor: not-allowed; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover:not(:disabled) { background: var(--primary-hover); }
    .btn-secondary { background: var(--secondary); color: #fff; }
    .btn-secondary:hover:not(:disabled) { background: #115e59; }
    .btn-success { background: var(--success); color: #fff; }
    .btn-success:hover:not(:disabled) { background: #166534; }
    .btn-accent { background: var(--accent); color: #fff; }
    .btn-accent:hover:not(:disabled) { background: #b45309; }
    .btn-danger { background: var(--danger); color: #fff; }
    .btn-outline {
      background: #fff;
      border-color: var(--border);
      color: var(--text);
    }
    .btn-outline:hover:not(:disabled) {
      border-color: var(--primary);
      color: var(--primary);
      background: #eff6ff;
    }
    .btn-ghost-light {
      background: rgba(255,255,255,0.14);
      color: #fff;
      border: 1px solid rgba(255,255,255,0.28);
    }
    .btn-ghost-light:hover { background: rgba(255,255,255,0.25); }
    .btn-sm { padding: 5px 10px; font-size: 0.8rem; }
    .btn-lg { padding: 11px 22px; font-size: 0.96rem; }

    /* Badges & Alerts */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 9px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 600;
    }
    .badge-blue { background: var(--primary-light); color: var(--primary); }
    .badge-teal { background: var(--secondary-light); color: var(--secondary); }
    .badge-amber { background: var(--accent-light); color: #92400e; }
    .badge-green { background: var(--success-light); color: var(--success); }
    .badge-red { background: var(--danger-light); color: var(--danger); }

    .alert {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 0.9rem;
      margin-bottom: 14px;
      border-left: 4px solid var(--primary);
      background: #eff6ff;
    }
    .alert-success { border-left-color: var(--success); background: var(--success-light); color: #14532d; }
    .alert-warn { border-left-color: var(--accent); background: var(--accent-light); color: #78350f; }
    .alert-danger { border-left-color: var(--danger); background: var(--danger-light); color: #7f1d1d; }

    /* Tables */
    .table-wrap {
      width: 100%;
      overflow-x: auto;
      border-radius: 8px;
      border: 1px solid var(--border);
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.88rem;
      background: #fff;
    }
    table.data-table th, table.data-table td {
      border: 1px solid var(--border);
      padding: 8px 10px;
      vertical-align: middle;
    }
    table.data-table th {
      background: #f8fafc;
      font-weight: 600;
      color: #334155;
    }
    .cell-input {
      width: 54px;
      text-align: center;
      padding: 4px;
      font-size: 0.86rem;
    }

    /* ====================================================================== */
    /* BẢNG MA TRẬN ĐỀ KIỂM TRA (STEP 2) - PHONG CÁCH BẢNG CHUẨN CÔNG VĂN 7991*/
    /* ====================================================================== */
    .matran-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 10px;
      background: #f8fafc;
      padding: 10px 14px;
      border-radius: 8px;
      border: 1px solid var(--border);
      margin-bottom: 12px;
    }
    .matran-toolbar-group {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }
    .matrix-table-wrap {
      width: 100%;
      overflow-x: auto;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #cbd5e1;
    }
    .matrix-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }
    .matrix-table th, .matrix-table td {
      border: 1px solid #cbd5e1;
      padding: 5px 3px;
      vertical-align: middle;
    }
    .matrix-table th {
      color: #fff;
      text-align: center;
      font-weight: 700;
    }
    .matrix-table th.th-sub {
      font-size: 11.5px;
    }
    .matrix-table th.th-level {
      font-size: 11px;
      padding: 4px 2px;
    }

    /* MÀU NỀN THEO DẢI CỘT MA TRẬN */
    .col-group-tn { background-color: #f0f9ff !important; }
    .col-group-tn.td-input-active { background-color: #e0f2fe !important; }
    .col-group-tn .input-num { border: 1.5px solid #38bdf8 !important; color: #0369a1 !important; }

    .col-group-ds { background-color: #faf5ff !important; }
    .col-group-ds.td-input-active { background-color: #f3e8ff !important; }
    .col-group-ds .input-num { border: 1.5px solid #c084fc !important; color: #7e22ce !important; }

    .col-group-tln { background-color: #fffbeb !important; }
    .col-group-tln.td-input-active { background-color: #fef3c7 !important; }
    .col-group-tln .input-num { border: 1.5px solid #fcd34d !important; color: #b45309 !important; }

    .col-group-tl { background-color: #f0fdf4 !important; }
    .col-group-tl.td-input-active { background-color: #dcfce7 !important; }
    .col-group-tl .input-num { border: 1.5px solid #4ade80 !important; color: #15803d !important; }

    .col-group-sum-md { background-color: #f8fafc !important; }

    /* Ô NHẬP LIỆU GỒM SỐ LƯỢNG VÀ MÃ CÂU */
    .input-cell-box {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      padding: 2px 0;
    }
    .matrix-table .input-num {
      width: 46px !important;
      height: 24px !important;
      text-align: center !important;
      font-weight: 700 !important;
      padding: 1px 0 !important;
      border-radius: 4px !important;
      outline: none !important;
      font-size: 12.5px !important;
      background: #fff !important;
      -moz-appearance: textfield !important;
      border: 1.5px solid #cbd5e1 !important;
      box-shadow: none !important;
      display: block !important;
    }
    .matrix-table .input-num::-webkit-outer-spin-button,
    .matrix-table .input-num::-webkit-inner-spin-button {
      -webkit-appearance: none !important;
      margin: 0 !important;
    }
    .matrix-table .input-macau {
      width: 46px !important;
      height: 19px !important;
      font-size: 10px !important;
      text-align: center !important;
      border: 1px dashed #94a3b8 !important;
      border-radius: 3px !important;
      background: #f8fafc !important;
      color: #334155 !important;
      font-weight: 600 !important;
      outline: none !important;
      padding: 0 1px !important;
      box-shadow: none !important;
      display: block !important;
    }
    .matrix-table .input-macau:focus, .matrix-table .input-num:focus {
      border-color: #2563eb !important;
      background: #ffffff !important;
      color: #1d4ed8 !important;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15) !important;
    }
    .input-cell-box.has-value .input-macau {
      color: #b91c1c !important;
      border-color: #f87171 !important;
      background-color: #ffffff !important;
      font-weight: 700 !important;
    }

    /* QUAN TRỌNG: ẨN CỘT TRẢ LỜI NGẮN KHI KHÔNG KÍCH HOẠT */
    .col-tln-hidden .col-tln {
      display: none !important;
    }

    /* FULLSCREEN CHO MA TRẬN BƯỚC 2 */
    .fullscreen-mode {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background: #f1f5f9 !important;
      z-index: 99999 !important;
      padding: 14px !important;
      overflow-y: auto !important;
      box-sizing: border-box !important;
    }
    .fullscreen-mode .matrix-table {
      font-size: 13.5px !important;
    }
    .fullscreen-mode .input-num {
      width: 50px !important;
      height: 26px !important;
      font-size: 13.5px !important;
    }
    .fullscreen-mode .input-macau {
      width: 50px !important;
      height: 20px !important;
      font-size: 11px !important;
    }
    .row-cd-divider td {
      border-top: 2.5px solid #1e3a8a !important;
    }

    /* Upload Zone */
    .upload-zone {
      border: 2px dashed #94a3b8;
      border-radius: 10px;
      padding: 20px;
      text-align: center;
      background: #f8fafc;
      cursor: pointer;
      transition: all 0.2s;
    }
    .upload-zone:hover {
      border-color: var(--primary);
      background: #eff6ff;
    }

    /* A4 Paper Preview */
    .a4-paper {
      background: #fff;
      max-width: 840px;
      margin: 0 auto;
      padding: 36px 44px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 6px 24px rgba(0,0,0,0.09);
      font-family: 'Times New Roman', Times, serif;
      font-size: 13.5pt;
      line-height: 1.45;
      color: #000;
    }
    .a4-header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      border-bottom: 1.5px solid #333;
      padding-bottom: 10px;
      margin-bottom: 14px;
      text-align: center;
    }

    /* Question Cards */
    .question-card {
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 12px;
      background: #fff;
    }
    .question-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dashed var(--border);
    }

    /* Step Footer Bar */
    .step-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
      padding-top: 16px;
      margin-top: 18px;
      border-top: 2px solid #e2e8f0;
    }

    /* Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 200;
      padding: 16px;
    }
    .modal-backdrop.open { display: flex; }
    .modal-box {
      background: #fff;
      border-radius: 12px;
      max-width: 680px;
      width: 100%;
      max-height: 88vh;
      overflow-y: auto;
      padding: 22px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.25);
    }
    .modal-box.modal-fullscreen {
      width: 96vw;
      max-width: 1440px;
      height: 94vh;
      max-height: 94vh;
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
    }
    .modal-fullscreen-table-wrap {
      flex: 1;
      overflow-y: auto;
      overflow-x: auto;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      margin: 10px 0;
    }
    .modal-matrix-input {
      width: 100%;
      padding: 6px 8px;
      font-size: 0.86rem;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      background: #fff;
    }
    .modal-matrix-input:focus {
      border-color: #2563eb;
      outline: none;
      box-shadow: 0 0 0 2px rgba(37,99,235,0.15);
    }
    input[type="number"].modal-matrix-num-input {
      width: 42px !important;
      height: 32px !important;
      text-align: center !important;
      padding: 0 !important;
      margin: 0 auto !important;
      display: block !important;
      font-size: 14px !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      border: 1.5px solid #cbd5e1 !important;
      border-radius: 6px !important;
      background: #ffffff !important;
      -webkit-appearance: none !important;
      -moz-appearance: textfield !important;
      appearance: none !important;
      box-sizing: border-box !important;
      line-height: 32px !important;
    }
    input[type="number"].modal-matrix-num-input::-webkit-outer-spin-button,
    input[type="number"].modal-matrix-num-input::-webkit-inner-spin-button {
      -webkit-appearance: none !important;
      display: none !important;
      margin: 0 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-mcq {
      background: #eff6ff !important;
      border-color: #2563eb !important;
      color: #1d4ed8 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-tf {
      background: #faf5ff !important;
      border-color: #7c3aed !important;
      color: #6d28d9 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-sa {
      background: #fffbeb !important;
      border-color: #d97706 !important;
      color: #b45309 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.has-val-essay {
      background: #f0fdf4 !important;
      border-color: #059669 !important;
      color: #047857 !important;
      font-weight: 900 !important;
    }
    input[type="number"].modal-matrix-num-input.is-zero {
      color: #94a3b8 !important;
      background: #f8fafc !important;
      border-color: #e2e8f0 !important;
      font-weight: 500 !important;
    }
    input[type="number"].modal-matrix-num-input:focus {
      border-color: #2563eb !important;
      background: #ffffff !important;
      color: #1d4ed8 !important;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.25) !important;
      outline: none !important;
    }

    /* Toast Notification */
    #toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1200;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .toast {
      background: #0f172a;
      color: #fff;
      padding: 12px 18px;
      border-radius: 9px;
      font-size: 0.88rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      border-left: 4px solid #38bdf8;
      max-width: 400px;
    }

    /* RESPONSIVE DESIGN */
    @media (max-width: 1024px) {
      .app-sidebar {
        width: 72px;
      }
      .app-sidebar .sidebar-heading-text,
      .app-sidebar .step-meta,
      .app-sidebar .sidebar-footer {
        display: none;
      }
      .app-sidebar .sidebar-step-item {
        justify-content: center;
        padding: 9px 0;
      }
      .sidebar-collapse-btn {
        display: none;
      }
      .main-viewport {
        padding: 16px 18px 60px 18px;
      }
      .grid-4 { grid-template-columns: repeat(2, 1fr); }
      .grid-3 { grid-template-columns: repeat(2, 1fr); }
    }

    @media (max-width: 768px) {
      .sidebar-mobile-toggle {
        display: flex;
      }
      .app-header {
        height: auto;
        padding: 10px 14px;
      }
      .header-inner {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }
      .header-actions {
        width: 100%;
        overflow-x: auto;
        padding-bottom: 4px;
        flex-wrap: nowrap;
      }
      .app-workspace {
        height: calc(100vh - 100px);
      }
      .app-sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 270px !important;
        transform: translateX(-100%);
        transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        z-index: 1050;
        box-shadow: 8px 0 30px rgba(0,0,0,0.25);
      }
      .app-sidebar.mobile-open {
        transform: translateX(0);
      }
      .app-sidebar.mobile-open .sidebar-heading-text,
      .app-sidebar.mobile-open .step-meta,
      .app-sidebar.mobile-open .sidebar-footer {
        display: block !important;
        opacity: 1 !important;
        max-width: none !important;
      }
      .app-sidebar.mobile-open .sidebar-step-item {
        justify-content: flex-start !important;
        padding: 9px 10px !important;
      }
      .main-viewport {
        padding: 12px 10px 50px 10px;
      }
      .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
      .a4-paper { padding: 18px 14px; font-size: 12pt; }
      .a4-header-grid { grid-template-columns: 1fr; gap: 8px; }
    }
`;

const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
html = html.substring(0, styleStart) + '<style>' + completeCleanCss + '  </style>' + html.substring(styleEnd);

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html with complete clean CSS!');

