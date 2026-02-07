# 🐱🐷 喵喵豬豬早餐店點餐系統

可愛風格的線上點餐系統，支援：
- 顧客線上點餐
- 訂單狀態管理
- 菜單管理（拖曳排序、圖片選擇）
- Google 試算表資料庫
- 響應式手機版面

## 🚀 快速開始

1. 複製專案
2. 設定 Google Apps Script（詳見下方）
3. 部署到 GitHub Pages

## 📋 管理員功能

以「喵喵」或「豬豬」登入可使用：
- 菜單管理：新增/編輯/刪除/排序餐點
- 訂單管理：標記送餐完成或取消訂單
- 分類管理

## 🔗 連結 Google 試算表

1. 建立 Google 試算表
2. 開啟 [Google Apps Script](https://script.google.com)
3. 貼上 `google-apps-script.js` 內容
4. 修改 SPREADSHEET_ID 為您的試算表 ID
5. 執行 `initSpreadsheet` 初始化
6. 部署為網頁應用程式
7. 將網址填入 `scripts/config.js` 的 API_URL

## 📁 專案結構

```
meowmenu/
├── index.html          # 主頁面
├── styles/
│   └── main.css        # 樣式檔
├── scripts/
│   ├── config.js       # 設定檔
│   ├── api.js          # API 模組
│   └── app.js          # 主程式
├── assets/
│   └── images/         # 圖片資料夾
└── google-apps-script.js  # Apps Script 程式碼
```

## 📱 螢幕截圖

手機與電腦皆可使用，自動適應螢幕大小。

---

Made with ❤️ by 喵喵豬豬早餐店
