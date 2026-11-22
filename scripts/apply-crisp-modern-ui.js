const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Replace the entire CSS block with Clean Modern High-Contrast & Vibrant Hover Styling
const cleanModernCss = `
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-light: #eff6ff;
      --secondary: #0f766e;
      --secondary-light: #f0fdfa;
      --accent: #d97706;
      --accent-light: #fffbeb;
      --success: #10b981;
      --success-light: #f0fdf4;
      --danger: #ef4444;
      --danger-light: #fff1f2;
      --bg: #f1f5f9;
      --card-bg: #ffffff;
      --text: #0f172a;
      --text-muted: #64748b;
      --border: #e2e8f0;
      --border-dark: #cbd5e1;
      --radius: 12px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    html, body {
      height: 100%;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
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
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
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

    /* Mobile Hamburger Button */
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
      transition: all 0.2s;
    }
    .sidebar-mobile-toggle:hover {
      background: rgba(255, 255, 255, 0.25);
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

    /* Mobile Backdrop */
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

    /* ====================================================================== */
    /* CLEAN MODERN PRO LEFT SIDEBAR                                          */
    /* ====================================================================== */
    .app-sidebar {
      width: 270px;
      flex-shrink: 0;
      height: 100%;
      background: #ffffff;
      border-right: 1px solid var(--border);
      box-shadow: 2px 0 10px rgba(15, 23, 42, 0.04);
      display: flex;
      flex-direction: column;
      transition: width 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      position: relative;
      z-index: 90;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Collapsed Sidebar */
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

    /* Sidebar Header */
    .sidebar-header {
      padding: 12px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--border);
      background: #f8fafc;
      min-height: 52px;
      flex-shrink: 0;
    }
    .sidebar-heading-text {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: opacity 0.2s ease;
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
      letter-spacing: 0.2px;
    }

    .sidebar-collapse-btn {
      background: #ffffff;
      border: 1px solid var(--border-dark);
      border-radius: 7px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
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

    /* Sidebar Navigation List */
    .sidebar-nav-list {
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 6px;
      flex: 1;
    }

    /* Sidebar Step Item */
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

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 10px 12px;
      border-top: 1px solid var(--border);
      background: #f8fafc;
      flex-shrink: 0;
    }
    .sidebar-footer-card {
      background: #ffffff;
      border-radius: 8px;
      padding: 7px 9px;
      border: 1px solid var(--border);
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

    /* ====================================================================== */
    /* RIGHT MAIN VIEWPORT                                                    */
    /* ====================================================================== */
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

    /* ====================================================================== */
    /* CLEAN HIGH-CONTRAST CARDS WITH VIBRANT HOVER COLOR CHANGE              */
    /* ====================================================================== */
    .card, .step-card {
      position: relative;
      background: #ffffff;
      border-radius: var(--radius);
      border: 1.5px solid var(--border);
      border-top: 4px solid var(--zone-accent, #2563eb);
      box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
      padding: 24px;
      margin-bottom: 22px;
      transition: transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1),
                  background-color 0.25s ease,
                  border-color 0.25s ease,
                  box-shadow 0.25s ease;
      overflow: visible;
    }

    /* HOVER STATE: CLEAR, VIBRANT, DISTINCT TINTED BACKGROUND & GLOW */
    .card:hover, .step-card:hover {
      transform: translateY(-4px);
      background-color: var(--zone-bg-hover, #eff6ff) !important;
      border-color: var(--zone-border-hover, #3b82f6) !important;
      border-top-color: var(--zone-accent, #2563eb) !important;
      box-shadow: 0 12px 28px var(--zone-glow, rgba(37, 99, 235, 0.16)), 0 4px 10px rgba(0, 0, 0, 0.04) !important;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
      gap: 10px;
    }
    .card-title {
      font-size: 1.1rem;
      font-weight: 700;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ====================================================================== */
    /* 7 DISTINCT & VIBRANT HOVER COLOR ZONES (MÀU RÕ RÀNG, DỄ PHÂN BIỆT)    */
    /* ====================================================================== */
    
    /* Zone 1: Bước 1 - Phân tích Tài liệu & Drive (Xanh Dương Rõ Rệt - Blue) */
    .glass-zone-step-1 {
      --zone-accent: #2563eb;
      --zone-bg-hover: #eff6ff;
      --zone-border-hover: #3b82f6;
      --zone-glow: rgba(37, 99, 235, 0.2);
    }
    .icon-tint-1 {
      background: #eff6ff;
      color: #1d4ed8;
      border-color: #bfdbfe;
    }

    /* Zone 2: Bước 2 - Lập Ma trận & Cấp độ (Tím Chàm Rõ Rệt - Indigo) */
    .glass-zone-step-2 {
      --zone-accent: #4f46e5;
      --zone-bg-hover: #eef2ff;
      --zone-border-hover: #6366f1;
      --zone-glow: rgba(79, 70, 229, 0.2);
    }
    .icon-tint-2 {
      background: #eef2ff;
      color: #4338ca;
      border-color: #c7d2fe;
    }

    /* Zone 3: Bước 3 - Bản Đặc tả YCCD (Tím Hoàng Gia Rõ Rệt - Purple) */
    .glass-zone-step-3 {
      --zone-accent: #9333ea;
      --zone-bg-hover: #faf5ff;
      --zone-border-hover: #a855f7;
      --zone-glow: rgba(147, 51, 234, 0.2);
    }
    .icon-tint-3 {
      background: #faf5ff;
      color: #7e22ce;
      border-color: #e9d5ff;
    }

    /* Zone 4: Bước 4 - Soạn Đề & Trộn (Xanh Ngọc Lục Bảo Rõ Rệt - Teal) */
    .glass-zone-step-4 {
      --zone-accent: #0d9488;
      --zone-bg-hover: #f0fdfa;
      --zone-border-hover: #14b8a6;
      --zone-glow: rgba(13, 148, 136, 0.2);
    }
    .icon-tint-4 {
      background: #f0fdfa;
      color: #0f766e;
      border-color: #99f6e4;
    }

    /* Zone 5: Bước 5 - Đáp án & QA (Vàng Hổ Phách Rõ Rệt - Amber) */
    .glass-zone-step-5 {
      --zone-accent: #d97706;
      --zone-bg-hover: #fffbeb;
      --zone-border-hover: #f59e0b;
      --zone-glow: rgba(217, 119, 6, 0.2);
    }
    .icon-tint-5 {
      background: #fffbeb;
      color: #b45309;
      border-color: #fde68a;
    }

    /* Zone 6: Bước 6 - Xuất File Word A4 (Xanh Lá Cây Tươi Rõ Rệt - Emerald) */
    .glass-zone-step-6 {
      --zone-accent: #059669;
      --zone-bg-hover: #f0fdf4;
      --zone-border-hover: #10b981;
      --zone-glow: rgba(16, 185, 129, 0.2);
    }
    .icon-tint-6 {
      background: #f0fdf4;
      color: #047857;
      border-color: #a7f3d0;
    }

    /* Zone 7: Bước 7 - Chấm Bài OMR Phiếu 2025 (Đỏ Hồng San Hô Rõ Rệt - Rose) */
    .glass-zone-step-7 {
      --zone-accent: #e11d48;
      --zone-bg-hover: #fff1f2;
      --zone-border-hover: #f43f5e;
      --zone-glow: rgba(225, 29, 72, 0.2);
    }
    .icon-tint-7 {
      background: #fff1f2;
      color: #be123c;
      border-color: #fecdd3;
    }

    /* ====================================================================== */
    /* HIGH-CONTRAST FORM INPUTS, TEXTAREAS & CONTROLS                        */
    /* ====================================================================== */
    .form-control, input[type="text"], input[type="number"], select, textarea {
      background: #ffffff;
      border: 1.5px solid var(--border-dark);
      border-radius: 8px;
      color: #0f172a;
      font-family: inherit;
      font-size: 0.9rem;
      padding: 9px 12px;
      transition: all 0.2s ease;
      width: 100%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }
    .form-control:focus, input[type="text"]:focus, select:focus, textarea:focus {
      background: #ffffff;
      border-color: #2563eb;
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
      outline: none;
    }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 5px;
    }
    .form-group {
      margin-bottom: 14px;
    }

    /* ====================================================================== */
    /* CLEAN MODERN SOLID BUTTONS                                             */
    /* ====================================================================== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 7px;
      padding: 8px 15px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.86rem;
      cursor: pointer;
      border: 1px solid var(--border-dark);
      background: #ffffff;
      color: #334155;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      transition: all 0.18s ease;
      user-select: none;
      text-decoration: none;
    }
    .btn:hover {
      background: #f8fafc;
      border-color: #94a3b8;
      color: #0f172a;
      transform: translateY(-1px);
      box-shadow: 0 3px 8px rgba(0,0,0,0.09);
    }
    .btn:active {
      transform: translateY(0);
      box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
      border-radius: 6px;
    }
    .btn-lg {
      padding: 11px 22px;
      font-size: 0.95rem;
      border-radius: 10px;
    }

    /* Solid Colorful Buttons */
    .btn-primary {
      background: #2563eb;
      color: #fff !important;
      border-color: #1d4ed8;
      box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);
    }
    .btn-primary:hover {
      background: #1d4ed8;
      border-color: #1e40af;
      box-shadow: 0 4px 10px rgba(37, 99, 235, 0.4);
      color: #fff !important;
    }
    .btn-success {
      background: #10b981;
      color: #fff !important;
      border-color: #059669;
      box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
    }
    .btn-success:hover {
      background: #059669;
      border-color: #047857;
      color: #fff !important;
    }
    .btn-accent {
      background: #d97706;
      color: #fff !important;
      border-color: #b45309;
      box-shadow: 0 2px 6px rgba(217, 119, 6, 0.3);
    }
    .btn-accent:hover {
      background: #b45309;
      border-color: #92400e;
      color: #fff !important;
    }
    .btn-danger {
      background: #ef4444;
      color: #fff !important;
      border-color: #dc2626;
      box-shadow: 0 2px 6px rgba(239, 68, 68, 0.3);
    }
    .btn-outline {
      background: #ffffff;
      border: 1.5px solid #cbd5e1;
      color: #475569;
    }
    .btn-ghost-light {
      background: rgba(255, 255, 255, 0.14);
      border: 1px solid rgba(255, 255, 255, 0.28);
      color: #f8fafc;
      box-shadow: none;
    }
    .btn-ghost-light:hover {
      background: rgba(255, 255, 255, 0.25);
      color: #fff;
    }

    /* Grid helpers */
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

    /* Tables in Clean Modern Pro */
    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #cbd5e1;
      background: #ffffff;
      margin-top: 10px;
    }
    th {
      background: #f1f5f9;
      padding: 10px 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 2px solid #cbd5e1;
      border-right: 1px solid #e2e8f0;
      text-align: left;
    }
    td {
      padding: 9px 12px;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: #f8fafc;
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-teal { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-green { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* Clean Modals */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      z-index: 1100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-box {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
    }

    /* Matrix Fullscreen Modal */
    .matrix-fullscreen-box {
      background: #ffffff;
      border-radius: 14px;
      border: 1px solid #cbd5e1;
      box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35);
      width: 96vw;
      max-width: 1540px;
      height: 92vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 0;
    }

    /* Modal Number Inputs */
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

    /* Word A4 Paper Preview */
    .a4-paper {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      box-shadow: 0 6px 20px rgba(0,0,0,0.12);
      padding: 40px 48px;
      max-width: 900px;
      margin: 20px auto;
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.35;
      color: #000;
    }
    .a4-header-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      margin-bottom: 20px;
      gap: 12px;
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

// Replace <style>...</style>
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
html = html.substring(0, styleStart) + '<style>' + cleanModernCss + '  </style>' + html.substring(styleEnd);
console.log('Step 1: CSS replaced with Clean High-Contrast Modern Pro styles.');

// 2. Add visual indicator in Section 6.2 for storage location on Drive D:
const s62Target = `<div class="card-title">💾 6.2. Lưu trữ, Nhân bản & Sao lưu Hồ sơ Đề kiểm tra</div>`;
const s62Replacement = `<div class="card-title">💾 6.2. Lưu trữ, Nhân bản & Sao lưu Hồ sơ Đề kiểm tra</div>
            <span class="badge badge-teal" style="font-size:0.78rem;">🔒 Lưu trữ an toàn tại Ổ D: (d:\\WEB-APP\\MT-DE-DA\\data\\profiles)</span>`;

if (html.includes(s62Target) && !html.includes('d:\\WEB-APP\\MT-DE-DA\\data\\profiles')) {
  html = html.replace(s62Target, s62Replacement);
  console.log('Step 2: Added safety badge to Section 6.2');
}

// 3. Add explicit storage info banner in profiles-modal
const profModalTarget = `<p style="font-size:0.88rem; color:var(--muted); margin-bottom:12px;">\n        Hồ sơ lưu trữ đề thi, ma trận, bản đặc tả và các mã đề đã tạo:`;
const profModalReplacement = `<div style="background:#e0f2fe; border:1px solid #7dd3fc; border-radius:8px; padding:9px 12px; margin-bottom:12px; font-size:0.82rem; color:#0369a1; display:flex; align-items:center; gap:8px;">
        <span style="font-size:1.1rem;">🔒</span>
        <div><strong>Vị trí lưu trữ dữ liệu an toàn trên máy:</strong> Thư mục <code>D:\\WEB-APP\\MT-DE-DA\\data\\profiles</code> (Toàn bộ dữ liệu nằm trên Ổ đĩa D, không nằm trên ổ C, không lo mất khi cài lại Win).</div>
      </div>\n      <p style="font-size:0.88rem; color:var(--muted); margin-bottom:12px;">\n        Hồ sơ lưu trữ đề thi, ma trận, bản đặc tả và các mã đề đã tạo:`;

if (html.includes(profModalTarget)) {
  html = html.replace(profModalTarget, profModalReplacement);
  console.log('Step 3: Added storage info banner in profiles modal');
}

// 4. Update saveCurrentProfile notification to explicitly show drive D path
html = html.replace(
  `showToast(\`Đã lưu hồ sơ "\${data.title}" thành công!\`, 'success');`,
  `showToast(\`Đã lưu hồ sơ "\${data.title}" an toàn vào Ổ D: [data/profiles/\${data.id || ''}.json]!\`, 'success');`
);
console.log('Step 4: Updated saveCurrentProfile toast notification');

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully updated index.html! New size:', html.length);

