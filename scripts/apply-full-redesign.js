const fs = require('fs');

let html = fs.readFileSync('index.html', 'utf8');

// 1. Prepare New CSS
const newCss = `
    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --primary-light: #dbeafe;
      --secondary: #0f766e;
      --secondary-light: #ccfbf1;
      --accent: #d97706;
      --accent-light: #fef3c7;
      --success: #10b981;
      --success-light: #d1fae5;
      --danger: #ef4444;
      --danger-light: #fee2e2;
      --bg: #e8eef7;
      --card-bg: #ebf1f8;
      --text: #0f172a;
      --muted: #475569;
      --border: #cbd5e1;
      --radius: 14px;
      
      /* Neumorphism Shadows */
      --nm-flat-shadow: 7px 7px 18px rgba(166, 180, 204, 0.45), -7px -7px 18px rgba(255, 255, 255, 0.9);
      --nm-hover-shadow: 10px 12px 24px rgba(160, 175, 200, 0.52), -9px -9px 22px rgba(255, 255, 255, 0.95);
      --nm-inset-shadow: inset 3px 3px 6px rgba(166, 180, 204, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.88);
      --nm-pill-shadow: 4px 4px 10px rgba(166, 180, 204, 0.4), -4px -4px 10px rgba(255, 255, 255, 0.9);
      --nm-pill-pressed: inset 2px 2px 5px rgba(166, 180, 204, 0.5), inset -2px -2px 5px rgba(255, 255, 255, 0.9);
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
      height: 64px;
      background: linear-gradient(135deg, #091325 0%, #172d54 50%, #0d4a52 100%);
      color: #fff;
      padding: 0 20px;
      display: flex;
      align-items: center;
      z-index: 100;
      box-shadow: 0 4px 16px rgba(0,0,0,0.22);
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
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.06));
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 800;
      border: 1.5px solid rgba(255,255,255,0.35);
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .brand-title h1 {
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: 0.3px;
      color: #f8fafc;
    }
    .brand-title p {
      font-size: 0.76rem;
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
      border-radius: 9px;
      width: 36px;
      height: 36px;
      font-size: 1.15rem;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }
    .sidebar-mobile-toggle:hover {
      background: rgba(255, 255, 255, 0.25);
    }

    /* WORKSPACE BODY (SIDEBAR + MAIN VIEWPORT) */
    .app-workspace {
      flex: 1;
      display: flex;
      flex-direction: row;
      height: calc(100vh - 64px);
      overflow: hidden;
      position: relative;
    }

    /* Mobile Backdrop */
    .sidebar-backdrop {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.55);
      backdrop-filter: blur(4px);
      z-index: 1040;
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .sidebar-backdrop.active {
      display: block;
      opacity: 1;
    }

    /* ====================================================================== */
    /* 3D NEUMORPHIC LEFT SIDEBAR                                             */
    /* ====================================================================== */
    .app-sidebar {
      width: 276px;
      flex-shrink: 0;
      height: 100%;
      background: #ebf1f8;
      border-right: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: 6px 0 16px rgba(166, 180, 204, 0.3);
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      position: relative;
      z-index: 90;
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* Collapsed Sidebar */
    .app-sidebar.collapsed {
      width: 76px;
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
      padding: 10px 0;
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
      border-bottom: 1.5px solid rgba(210, 222, 235, 0.7);
      background: #e5edf5;
      min-height: 54px;
      flex-shrink: 0;
    }
    .sidebar-heading-text {
      display: flex;
      align-items: center;
      gap: 6px;
      white-space: nowrap;
      transition: opacity 0.25s ease;
    }
    .sidebar-title-badge {
      font-size: 0.65rem;
      font-weight: 800;
      letter-spacing: 0.8px;
      background: #2563eb;
      color: #fff;
      padding: 3px 6px;
      border-radius: 6px;
      box-shadow: 0 2px 6px rgba(37,99,235,0.35);
    }
    .sidebar-title-text {
      font-size: 0.82rem;
      font-weight: 800;
      color: #1e293b;
      letter-spacing: 0.3px;
    }

    .sidebar-collapse-btn {
      background: #ebf1f8;
      border: 1.5px solid rgba(255, 255, 255, 0.9);
      border-radius: 8px;
      width: 30px;
      height: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: #475569;
      box-shadow: 3px 3px 7px rgba(166, 180, 204, 0.45), -3px -3px 7px rgba(255, 255, 255, 0.9);
      transition: all 0.2s ease;
      flex-shrink: 0;
    }
    .sidebar-collapse-btn:hover {
      background: #dbeafe;
      color: #1d4ed8;
      transform: scale(1.05);
    }
    .sidebar-collapse-btn:active {
      box-shadow: var(--nm-pill-pressed);
    }
    .collapse-icon {
      display: inline-block;
      font-size: 0.7rem;
      transition: transform 0.3s ease;
    }

    /* Sidebar Navigation List */
    .sidebar-nav-list {
      padding: 10px 8px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1;
    }

    /* Sidebar Step Item Button */
    .sidebar-step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 9px 10px;
      border-radius: 12px;
      background: #ebf1f8;
      border: 1.5px solid transparent;
      cursor: pointer;
      text-align: left;
      transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
      position: relative;
      width: 100%;
      user-select: none;
    }
    .sidebar-step-item:hover {
      background: #f1f6fc;
      border-color: rgba(255, 255, 255, 0.95);
      box-shadow: 4px 4px 10px rgba(166, 180, 204, 0.35), -3px -3px 8px rgba(255, 255, 255, 0.9);
      transform: translateX(2px);
    }
    .sidebar-step-item.active {
      background: #e2ebf7;
      border-color: rgba(255, 255, 255, 0.95);
      box-shadow: inset 3px 3px 6px rgba(166, 180, 204, 0.45), inset -3px -3px 6px rgba(255, 255, 255, 0.9);
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
      box-shadow: 0 0 8px rgba(37, 99, 235, 0.6);
    }

    .step-icon-wrap {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
      background: #e2eaf5;
      box-shadow: 3px 3px 7px rgba(166, 180, 204, 0.4), -3px -3px 7px rgba(255, 255, 255, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.8);
      transition: all 0.25s ease;
    }
    .sidebar-step-item:hover .step-icon-wrap {
      transform: scale(1.05);
    }
    .sidebar-step-item.active .step-icon-wrap {
      box-shadow: 2px 2px 7px rgba(37, 99, 235, 0.35);
      border-color: #3b82f6;
    }

    .step-icon {
      font-size: 1.1rem;
    }
    .step-number-dot {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: #475569;
      color: #fff;
      font-size: 0.62rem;
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
      font-size: 0.84rem;
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
      font-size: 0.71rem;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }

    /* Sidebar Footer */
    .sidebar-footer {
      padding: 10px 12px;
      border-top: 1.5px solid rgba(210, 222, 235, 0.7);
      background: #e5edf5;
      flex-shrink: 0;
    }
    .sidebar-footer-card {
      background: #ebf1f8;
      border-radius: 9px;
      padding: 7px 9px;
      box-shadow: var(--nm-inset-shadow);
      border: 1px solid rgba(200, 215, 230, 0.5);
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
    /* NEUMORPHIC 3D & GORILLA GLASS CARDS & SECTIONS                         */
    /* ====================================================================== */
    .card, .step-card {
      position: relative;
      background: var(--card-bg);
      border-radius: var(--radius);
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      box-shadow: var(--nm-flat-shadow);
      padding: 24px;
      margin-bottom: 24px;
      transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                  box-shadow 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
                  background 0.3s ease,
                  border-color 0.3s ease;
      overflow: hidden;
    }

    /* Gorilla Glass Specular Sheen Layer */
    .card::before, .step-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 48%;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.45) 0%, rgba(255, 255, 255, 0.06) 65%, transparent 100%);
      pointer-events: none;
      border-radius: var(--radius) var(--radius) 0 0;
      opacity: 0.75;
      transition: opacity 0.3s ease;
    }

    /* Gorilla Glass Hover Effect with 3D Lift & Zone Color Tint Glow */
    .card:hover, .step-card:hover {
      transform: translateY(-4px) scale(1.002);
      background-color: var(--zone-bg-hover, #f0f5fc);
      border-color: var(--zone-border-hover, rgba(59, 130, 246, 0.5));
      box-shadow: 
        12px 14px 28px rgba(160, 175, 200, 0.5),
        -10px -10px 24px rgba(255, 255, 255, 0.95),
        0 0 25px var(--zone-glow, rgba(59, 130, 246, 0.22));
    }
    .card:hover::before, .step-card:hover::before {
      opacity: 1;
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 1.5px solid rgba(210, 222, 235, 0.6);
      flex-wrap: wrap;
      gap: 10px;
    }
    .card-title {
      font-size: 1.12rem;
      font-weight: 700;
      color: #1e293b;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* ====================================================================== */
    /* 7 DISTINCT GORILLA GLASS COLOR TINT ZONES                              */
    /* ====================================================================== */
    
    /* Zone 1: Bước 1 - Phân tích Tài liệu & Drive Bank (Sapphire Blue) */
    .glass-zone-step-1 {
      --zone-accent: #2563eb;
      --zone-accent-light: #dbeafe;
      --zone-bg-hover: rgba(235, 244, 255, 0.96);
      --zone-border-hover: rgba(59, 130, 246, 0.55);
      --zone-glow: rgba(59, 130, 246, 0.25);
    }
    .icon-tint-1 {
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(59, 130, 246, 0.08));
      color: #1d4ed8;
    }

    /* Zone 2: Bước 2 - Lập Ma trận & Tỷ lệ Mức độ (Deep Indigo) */
    .glass-zone-step-2 {
      --zone-accent: #4f46e5;
      --zone-accent-light: #e0e7ff;
      --zone-bg-hover: rgba(238, 242, 255, 0.96);
      --zone-border-hover: rgba(99, 102, 241, 0.55);
      --zone-glow: rgba(99, 102, 241, 0.25);
    }
    .icon-tint-2 {
      background: linear-gradient(135deg, rgba(79, 70, 229, 0.16), rgba(99, 102, 241, 0.08));
      color: #4338ca;
    }

    /* Zone 3: Bước 3 - Bản Đặc tả Yêu cầu cần đạt (Royal Purple) */
    .glass-zone-step-3 {
      --zone-accent: #9333ea;
      --zone-accent-light: #f3e8ff;
      --zone-bg-hover: rgba(250, 245, 255, 0.96);
      --zone-border-hover: rgba(168, 85, 247, 0.55);
      --zone-glow: rgba(168, 85, 247, 0.25);
    }
    .icon-tint-3 {
      background: linear-gradient(135deg, rgba(147, 51, 234, 0.16), rgba(168, 85, 247, 0.08));
      color: #7e22ce;
    }

    /* Zone 4: Bước 4 - Soạn Đề & Trộn Mã đề (Ocean Teal) */
    .glass-zone-step-4 {
      --zone-accent: #0d9488;
      --zone-accent-light: #ccfbf1;
      --zone-bg-hover: rgba(240, 253, 250, 0.96);
      --zone-border-hover: rgba(20, 184, 166, 0.55);
      --zone-glow: rgba(20, 184, 166, 0.25);
    }
    .icon-tint-4 {
      background: linear-gradient(135deg, rgba(13, 148, 136, 0.16), rgba(20, 184, 166, 0.08));
      color: #0f766e;
    }

    /* Zone 5: Bước 5 - Đáp án & Đối soát QA (Warm Amber) */
    .glass-zone-step-5 {
      --zone-accent: #d97706;
      --zone-accent-light: #fef3c7;
      --zone-bg-hover: rgba(255, 251, 235, 0.96);
      --zone-border-hover: rgba(245, 158, 11, 0.55);
      --zone-glow: rgba(245, 158, 11, 0.25);
    }
    .icon-tint-5 {
      background: linear-gradient(135deg, rgba(217, 119, 6, 0.16), rgba(245, 158, 11, 0.08));
      color: #b45309;
    }

    /* Zone 6: Bước 6 - Xuất File Word A4 Chuẩn BGD (Emerald Green) */
    .glass-zone-step-6 {
      --zone-accent: #059669;
      --zone-accent-light: #d1fae5;
      --zone-bg-hover: rgba(236, 253, 245, 0.96);
      --zone-border-hover: rgba(16, 185, 129, 0.55);
      --zone-glow: rgba(16, 185, 129, 0.25);
    }
    .icon-tint-6 {
      background: linear-gradient(135deg, rgba(16, 185, 129, 0.16), rgba(5, 150, 105, 0.08));
      color: #047857;
    }

    /* Zone 7: Bước 7 - Chấm Bài OMR Phiếu 2025 & Báo cáo (Crimson Rose) */
    .glass-zone-step-7 {
      --zone-accent: #e11d48;
      --zone-accent-light: #ffe4e6;
      --zone-bg-hover: rgba(255, 241, 242, 0.96);
      --zone-border-hover: rgba(244, 63, 94, 0.55);
      --zone-glow: rgba(244, 63, 94, 0.25);
    }
    .icon-tint-7 {
      background: linear-gradient(135deg, rgba(225, 29, 72, 0.16), rgba(244, 63, 94, 0.08));
      color: #be123c;
    }

    /* ====================================================================== */
    /* NEUMORPHIC INPUTS, TEXTAREAS & CONTROLS                                */
    /* ====================================================================== */
    .form-control, input[type="text"], input[type="number"], select, textarea {
      background: #e2eaf4;
      border: 1.5px solid rgba(200, 215, 232, 0.7);
      border-radius: 10px;
      box-shadow: var(--nm-inset-shadow);
      color: #1e293b;
      font-family: inherit;
      font-size: 0.9rem;
      padding: 9px 13px;
      transition: all 0.2s ease;
      width: 100%;
    }
    .form-control:focus, input[type="text"]:focus, select:focus, textarea:focus {
      background: #ebf2fa;
      border-color: #2563eb;
      box-shadow: inset 2px 2px 5px rgba(166, 180, 204, 0.35), 0 0 0 3px rgba(37, 99, 235, 0.18);
      outline: none;
    }
    .form-label {
      display: block;
      font-size: 0.85rem;
      font-weight: 700;
      color: #334155;
      margin-bottom: 6px;
    }
    .form-group {
      margin-bottom: 14px;
    }

    /* ====================================================================== */
    /* NEUMORPHIC 3D TACTILE BUTTONS                                          */
    /* ====================================================================== */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 9px 16px;
      border-radius: 11px;
      font-weight: 700;
      font-size: 0.88rem;
      cursor: pointer;
      border: 1.5px solid rgba(255, 255, 255, 0.85);
      background: linear-gradient(145deg, #f2f7fd, #dfe8f4);
      color: #334155;
      box-shadow: var(--nm-pill-shadow);
      transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1);
      user-select: none;
      text-decoration: none;
    }
    .btn:hover {
      transform: translateY(-2px);
      box-shadow: 6px 7px 14px rgba(166, 180, 204, 0.52), -5px -5px 12px rgba(255, 255, 255, 0.95);
      color: #0f172a;
    }
    .btn:active {
      transform: translateY(1px);
      box-shadow: var(--nm-pill-pressed);
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.8rem;
      border-radius: 8px;
    }
    .btn-lg {
      padding: 12px 24px;
      font-size: 1rem;
      border-radius: 14px;
    }

    /* Vibrant Buttons */
    .btn-primary {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: #fff !important;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 4px 6px 14px rgba(37, 99, 235, 0.35), -2px -2px 8px rgba(255, 255, 255, 0.25);
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%);
      box-shadow: 6px 8px 18px rgba(37, 99, 235, 0.45);
      color: #fff !important;
    }
    .btn-success {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: #fff !important;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 4px 6px 14px rgba(16, 185, 129, 0.35), -2px -2px 8px rgba(255, 255, 255, 0.25);
    }
    .btn-success:hover {
      background: linear-gradient(135deg, #059669 0%, #047857 100%);
      box-shadow: 6px 8px 18px rgba(16, 185, 129, 0.45);
      color: #fff !important;
    }
    .btn-accent {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #fff !important;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 4px 6px 14px rgba(217, 119, 6, 0.35), -2px -2px 8px rgba(255, 255, 255, 0.25);
    }
    .btn-accent:hover {
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
      box-shadow: 6px 8px 18px rgba(217, 119, 6, 0.45);
      color: #fff !important;
    }
    .btn-danger {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: #fff !important;
      border: 1px solid rgba(255, 255, 255, 0.3);
      box-shadow: 4px 6px 14px rgba(239, 68, 68, 0.35), -2px -2px 8px rgba(255, 255, 255, 0.25);
    }
    .btn-outline {
      background: #ebf1f8;
      border: 1.5px solid #94a3b8;
      color: #475569;
    }
    .btn-ghost-light {
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.25);
      color: #f8fafc;
      box-shadow: none;
    }
    .btn-ghost-light:hover {
      background: rgba(255, 255, 255, 0.22);
      color: #fff;
    }

    /* Grid helpers */
    .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

    /* Tables in Neumorphism */
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 4px 4px 12px rgba(166, 180, 204, 0.35), -4px -4px 12px rgba(255, 255, 255, 0.85);
      background: #f1f6fc;
      margin-top: 10px;
    }
    th {
      background: #e2eaf5;
      padding: 10px 12px;
      font-size: 0.85rem;
      font-weight: 700;
      color: #1e293b;
      border-bottom: 2px solid rgba(200, 215, 230, 0.8);
      text-align: left;
    }
    td {
      padding: 9px 12px;
      font-size: 0.85rem;
      color: #334155;
      border-bottom: 1px solid rgba(210, 222, 235, 0.5);
    }
    tr:last-child td {
      border-bottom: none;
    }
    tr:hover td {
      background: rgba(255, 255, 255, 0.6);
    }

    /* Badges */
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 0.76rem;
      font-weight: 700;
    }
    .badge-primary { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-teal { background: #ccfbf1; color: #0f766e; border: 1px solid #99f6e4; }
    .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
    .badge-green { background: #d1fae5; color: #065f46; border: 1px solid #a7f3d0; }
    .badge-red { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

    /* Modals with Gorilla Glass & Neumorphism */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1100;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    .modal-box {
      background: #ebf1f8;
      border-radius: 18px;
      border: 1.5px solid rgba(255, 255, 255, 0.9);
      box-shadow: 16px 20px 42px rgba(0, 0, 0, 0.28), -8px -8px 24px rgba(255, 255, 255, 0.7);
      max-width: 900px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      padding: 24px;
    }

    /* Matrix Fullscreen Modal */
    .matrix-fullscreen-box {
      background: #ebf1f8;
      border-radius: 20px;
      border: 1.5px solid rgba(255, 255, 255, 0.95);
      box-shadow: 20px 24px 50px rgba(0, 0, 0, 0.35);
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
      box-shadow: 8px 12px 28px rgba(0,0,0,0.12), -4px -4px 15px rgba(255,255,255,0.8);
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
      border-radius: 10px;
      font-size: 0.88rem;
      box-shadow: 0 6px 20px rgba(0,0,0,0.25);
      border-left: 4px solid #38bdf8;
      max-width: 400px;
    }

    /* RESPONSIVE DESIGN ACROSS ALL DEVICES */
    @media (max-width: 1024px) {
      .app-sidebar {
        width: 76px;
      }
      .app-sidebar .sidebar-heading-text,
      .app-sidebar .step-meta,
      .app-sidebar .sidebar-footer {
        display: none;
      }
      .app-sidebar .sidebar-step-item {
        justify-content: center;
        padding: 10px 0;
      }
      .sidebar-collapse-btn {
        display: none;
      }
      .main-viewport {
        padding: 18px 20px 60px 20px;
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
        padding: 12px 14px;
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
        height: calc(100vh - 105px);
      }
      .app-sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: 276px !important;
        transform: translateX(-100%);
        transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
        z-index: 1050;
        box-shadow: 10px 0 35px rgba(0,0,0,0.3);
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
        padding: 14px 12px 50px 12px;
      }
      .grid-4, .grid-3, .grid-2 { grid-template-columns: 1fr; }
      .a4-paper { padding: 18px 14px; font-size: 12pt; }
      .a4-header-grid { grid-template-columns: 1fr; gap: 8px; }
    }
`;

// Replace <style>...</style>
const styleStart = html.indexOf('<style>');
const styleEnd = html.indexOf('</style>') + 8;
html = html.substring(0, styleStart) + '<style>' + newCss + '  </style>' + html.substring(styleEnd);
console.log('Step 1: CSS replaced successfully.');

// 2. Prepare New Layout: Header + Sidebar + Viewport
const newAppStructureStart = `  <div class="app-layout" id="app-layout">
    <!-- TOP HEADER -->
    <header class="app-header">
      <div class="header-inner">
        <div class="brand">
          <button class="sidebar-mobile-toggle" id="btn-mobile-sidebar-toggle" onclick="toggleSidebar()" aria-label="Menu" title="Mở danh mục 7 bước">
            ☰
          </button>
          <div class="brand-icon">AI</div>
          <div class="brand-title">
            <h1>AI RA ĐỀ KIỂM TRA TỰ ĐỘNG - CẤP THPT</h1>
            <p>Phân tích Tài liệu → Lập Ma trận → Bản Đặc tả → Soạn Đề → Đáp án → Xuất Word A4 (GDPT 2018 - CV 7991)</p>
          </div>
        </div>
        <div class="header-actions">
          <button class="btn btn-ghost-light btn-sm" onclick="openDriveBankModal()" style="border-color:#38bdf8; background:rgba(56,189,248,0.2);" title="Ngân hàng câu hỏi bóc tách từ Google Drive">☁️ Ngân hàng Google Drive (804 câu)</button>
          <span id="ai-status-badge" class="badge badge-teal">⚡ Bộ máy Tri thức & AI Sẵn sàng</span>
          <button class="btn btn-ghost-light btn-sm" onclick="openProfilesModal()">🗂️ Hồ sơ đã lưu</button>
          <button class="btn btn-ghost-light btn-sm" onclick="openAiConfigModal()">🔑 Cấu hình AI (Server)</button>
          <button class="btn btn-accent btn-sm" onclick="saveCurrentProfile()">💾 Lưu Hồ sơ</button>
        </div>
      </div>
    </header>

    <!-- MOBILE BACKDROP -->
    <div class="sidebar-backdrop" id="sidebar-backdrop" onclick="toggleSidebar(false)"></div>

    <!-- BODY WORKSPACE -->
    <div class="app-workspace" id="app-workspace">
      <!-- LEFT 7-STEP SIDEBAR -->
      <aside class="app-sidebar" id="app-sidebar">
        <!-- Sidebar Header / Collapse Button -->
        <div class="sidebar-header">
          <div class="sidebar-heading-text">
            <span class="sidebar-title-badge">QUY TRÌNH</span>
            <span class="sidebar-title-text">7 BƯỚC KHÉP KÍN</span>
          </div>
          <button class="sidebar-collapse-btn" id="btn-sidebar-collapse" onclick="toggleSidebar()" title="Thu nhỏ / Mở rộng Sidebar">
            <span class="collapse-icon">◀</span>
          </button>
        </div>

        <!-- 7 Steps Navigation List -->
        <div class="sidebar-nav-list" role="navigation">
          <button class="sidebar-step-item active" id="nav-step-1" onclick="goToStep(1)" title="Bước 1: Phân tích Tài liệu & Ngân hàng Google Drive">
            <div class="step-icon-wrap icon-tint-1">
              <span class="step-icon">📄</span>
              <span class="step-number-dot">1</span>
            </div>
            <div class="step-meta">
              <div class="step-title">1. Phân tích tài liệu</div>
              <div class="step-desc">Tài liệu, Ma trận & Drive</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-2" onclick="goToStep(2)" title="Bước 2: Lập Ma trận & Tỷ lệ Mức độ">
            <div class="step-icon-wrap icon-tint-2">
              <span class="step-icon">📊</span>
              <span class="step-number-dot">2</span>
            </div>
            <div class="step-meta">
              <div class="step-title">2. Lập Ma trận</div>
              <div class="step-desc">Cấu trúc, Cấp độ & Điểm</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-3" onclick="goToStep(3)" title="Bước 3: Bản Đặc tả & Yêu cầu cần đạt">
            <div class="step-icon-wrap icon-tint-3">
              <span class="step-icon">📑</span>
              <span class="step-number-dot">3</span>
            </div>
            <div class="step-meta">
              <div class="step-title">3. Bản đặc tả</div>
              <div class="step-desc">Yêu cầu cần đạt (YCCD)</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-4" onclick="goToStep(4)" title="Bước 4: Soạn Đề thi & Trộn Mã đề">
            <div class="step-icon-wrap icon-tint-4">
              <span class="step-icon">📝</span>
              <span class="step-number-dot">4</span>
            </div>
            <div class="step-meta">
              <div class="step-title">4. Soạn Đề & Trộn</div>
              <div class="step-desc">Đề thi, Mã đề & Hoán vị</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-5" onclick="goToStep(5)" title="Bước 5: Tạo Đáp án & Đối soát QA">
            <div class="step-icon-wrap icon-tint-5">
              <span class="step-icon">🔑</span>
              <span class="step-number-dot">5</span>
            </div>
            <div class="step-meta">
              <div class="step-title">5. Đáp án & QA</div>
              <div class="step-desc">Biểu điểm & Đối soát</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-6" onclick="goToStep(6)" title="Bước 6: Xuất File Word A4 Chuẩn BGD">
            <div class="step-icon-wrap icon-tint-6">
              <span class="step-icon">🖨️</span>
              <span class="step-number-dot">6</span>
            </div>
            <div class="step-meta">
              <div class="step-title">6. Xuất Word A4</div>
              <div class="step-desc">Font A4 & Bảng phương án</div>
            </div>
          </button>

          <button class="sidebar-step-item" id="nav-step-7" onclick="goToStep(7)" title="Bước 7: Chấm Bài OMR Phiếu 2025 & Báo cáo">
            <div class="step-icon-wrap icon-tint-7">
              <span class="step-icon">🎯</span>
              <span class="step-number-dot">7</span>
            </div>
            <div class="step-meta">
              <div class="step-title">7. Chấm OMR & Báo cáo</div>
              <div class="step-desc">Phiếu 2025, Lưu vết & Drive</div>
            </div>
          </button>
        </div>

        <!-- Sidebar Footer -->
        <div class="sidebar-footer">
          <div class="sidebar-footer-card">
            <div class="footer-card-row">
              <span>Chuẩn cấu trúc:</span> <strong>BGD 2025</strong>
            </div>
            <div class="footer-card-row">
              <span>Mặc định trộn:</span> <strong>4 Đề chuẩn</strong>
            </div>
          </div>
        </div>
      </aside>

      <!-- RIGHT MAIN VIEWPORT -->
      <main class="main-viewport" id="main-viewport">
        <div class="content-container">
`;

// Locate original header to main container start
const origHeaderStart = html.indexOf('<header class="app-header">');
const origMainStart = html.indexOf('<main class="container">');
const origMainTagEnd = origMainStart + '<main class="container">'.length;

// Replace from header start to main tag end
html = html.substring(0, origHeaderStart) + newAppStructureStart + html.substring(origMainTagEnd);
console.log('Step 2: Header, Sidebar, and Viewport Opening replaced.');

// 3. Close the new layout wrappers at </main>
const origMainEnd = html.indexOf('</main>');
const newAppStructureEnd = `        </div>
      </main>
    </div>
  </div>`;
html = html.substring(0, origMainEnd) + newAppStructureEnd + html.substring(origMainEnd + 7);
console.log('Step 3: Closing main viewport & layout wrappers updated.');

// 4. Add Gorilla Glass zone classes to step-1 through step-7
html = html.replace('id="step-1" class="step-section"', 'id="step-1" class="step-section glass-zone-step-1"');
html = html.replace('id="step-2" class="step-section"', 'id="step-2" class="step-section glass-zone-step-2"');
html = html.replace('id="step-3" class="step-section"', 'id="step-3" class="step-section glass-zone-step-3"');
html = html.replace('id="step-4" class="step-section"', 'id="step-4" class="step-section glass-zone-step-4"');
html = html.replace('id="step-5" class="step-section"', 'id="step-5" class="step-section glass-zone-step-5"');
html = html.replace('id="step-6" class="step-section"', 'id="step-6" class="step-section glass-zone-step-6"');
html = html.replace('class="step-card" id="step-7"', 'class="step-card glass-zone-step-7" id="step-7"');
html = html.replace('id="step-7" class="step-card"', 'id="step-7" class="step-card glass-zone-step-7"');
console.log('Step 4: Gorilla Glass zone classes added to sections 1 to 7.');

// 5. Update goToStep function and add toggleSidebar function in <script>
const newJsFunctions = `
    // =========================================================================
    // SIDEBAR TOGGLE & NAVIGATION MANAGEMENT
    // =========================================================================
    function toggleSidebar(forceState) {
      const sidebar = document.getElementById('app-sidebar');
      const backdrop = document.getElementById('sidebar-backdrop');
      if (!sidebar) return;

      const isMobile = window.innerWidth <= 768;
      if (isMobile) {
        const shouldOpen = (forceState !== undefined) ? forceState : !sidebar.classList.contains('mobile-open');
        if (shouldOpen) {
          sidebar.classList.add('mobile-open');
          if (backdrop) backdrop.classList.add('active');
        } else {
          sidebar.classList.remove('mobile-open');
          if (backdrop) backdrop.classList.remove('active');
        }
      } else {
        const isCollapsed = sidebar.classList.toggle('collapsed', (forceState !== undefined) ? !forceState : undefined);
        try { localStorage.setItem('agy_sidebar_collapsed', isCollapsed ? 'true' : 'false'); } catch (e) {}
      }
    }

    // Restore sidebar collapsed preference on load
    document.addEventListener('DOMContentLoaded', function() {
      try {
        if (window.innerWidth > 1024 && localStorage.getItem('agy_sidebar_collapsed') === 'true') {
          const sidebar = document.getElementById('app-sidebar');
          if (sidebar) sidebar.classList.add('collapsed');
        }
      } catch (e) {}
    });

    function goToStep(stepNum) {
      appState.currentStep = stepNum;
      for (let i = 1; i <= 7; i++) {
        const sec = document.getElementById(\`step-\${i}\`);
        const btn = document.getElementById(\`nav-step-\${i}\`);
        if (sec) sec.style.display = (i === stepNum) ? 'block' : 'none';
        if (btn) {
          btn.classList.toggle('active', i === stepNum);
          if (i < stepNum) btn.classList.add('completed');
          else btn.classList.remove('completed');
        }
      }
      // Auto-close sidebar on mobile after selecting a step
      if (window.innerWidth <= 768) {
        toggleSidebar(false);
      }
      // Scroll main viewport to top smoothly
      const viewport = document.getElementById('main-viewport');
      if (viewport) {
        viewport.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }

      if (stepNum === 2) renderMatrixTable();
      if (stepNum === 3) renderSpecTable();
      if (stepNum === 4) renderExamStep();
      if (stepNum === 5) renderAnswersStep();
      if (stepNum === 6) renderExportStep();
      if (stepNum === 7 && typeof renderOmrStep === 'function') renderOmrStep();
    }
`;

// Locate existing goToStep function in JS
const origGoToStepIdx = html.indexOf('function goToStep(stepNum) {');
if (origGoToStepIdx > -1) {
  // Find end of original goToStep function
  const endOfOrigFn = html.indexOf('// =========================================================================', origGoToStepIdx + 100);
  const closingBraceIdx = (endOfOrigFn > -1) ? endOfOrigFn : html.indexOf('function ', origGoToStepIdx + 50);
  
  html = html.substring(0, origGoToStepIdx) + newJsFunctions + '\n    ' + html.substring(closingBraceIdx);
  console.log('Step 5: goToStep updated and toggleSidebar injected.');
} else {
  console.warn('Warning: Could not find original goToStep function to replace!');
}

fs.writeFileSync('index.html', html, 'utf8');
console.log('Successfully wrote updated index.html! New size:', html.length);

