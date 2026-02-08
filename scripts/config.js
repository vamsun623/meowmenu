// ========================================
// 喵喵豬豬早餐店 - 設定檔
// ========================================

const CONFIG = {
  // Google Apps Script Web App URL
  // 部署後請將此處替換為您的 Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbzC2IpQbWWcB1yRLuQXVtz5JU1ZVU0-44QuUFlDJJo1IGY6s7Nws4xaXbED4bTp9nCs/exec',

  // 特權使用者名單
  ADMIN_USERS: ['喵喵店長', '豬豬店長'],

  // 預設餐點分類
  DEFAULT_CATEGORIES: ['蛋餅', '鬆餅', '飲料'],

  // 預設菜單資料 (當 API 無法連線時使用)
  DEFAULT_MENU: [
    { id: 1, name: '原味蛋餅', price: 35, category: '蛋餅', image: '🥚', enabled: true },
    { id: 2, name: '起司蛋餅', price: 45, category: '蛋餅', image: '🧀', enabled: true },
    { id: 3, name: '玉米蛋餅', price: 45, category: '蛋餅', image: '🌽', enabled: true },
    { id: 4, name: '鮪魚蛋餅', price: 50, category: '蛋餅', image: '🐟', enabled: true },
    { id: 5, name: '培根蛋餅', price: 50, category: '蛋餅', image: '🥓', enabled: true },
    { id: 6, name: '原味鬆餅', price: 40, category: '鬆餅', image: '🧇', enabled: true },
    { id: 7, name: '巧克力鬆餅', price: 50, category: '鬆餅', image: '🍫', enabled: true },
    { id: 8, name: '蜂蜜鬆餅', price: 50, category: '鬆餅', image: '🍯', enabled: true },
    { id: 9, name: '奶油鬆餅', price: 45, category: '鬆餅', image: '🧈', enabled: true },
    { id: 10, name: '紅茶', price: 20, category: '飲料', image: '🍵', enabled: true },
    { id: 11, name: '奶茶', price: 30, category: '飲料', image: '🥛', enabled: true },
    { id: 12, name: '豆漿', price: 25, category: '飲料', image: '🫘', enabled: true },
    { id: 13, name: '咖啡', price: 35, category: '飲料', image: '☕', enabled: true },
    { id: 14, name: '柳橙汁', price: 40, category: '飲料', image: '🍊', enabled: true },
  ],

  // 領餐時間設定
  PICKUP_TIME: {
    START_HOUR: 6,   // 開始時間 6:00
    END_HOUR: 12,    // 結束時間 12:00
    INTERVAL: 10     // 間隔 10 分鐘
  }
};

// 檢查是否為管理員
function isAdmin(username) {
  return CONFIG.ADMIN_USERS.includes(username);
}

// 產生訂單編號
function generateOrderId() {
  return 'ORD' + Date.now().toString(36).toUpperCase();
}

// 格式化時間
function formatTime(date) {
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 格式化取餐時間（只顯示 HH:MM）
function formatPickupTime(timeValue) {
  if (!timeValue) return '--:--';

  // 如果已經是 HH:MM 格式，直接返回
  if (typeof timeValue === 'string' && /^\d{1,2}:\d{2}$/.test(timeValue)) {
    return timeValue;
  }

  // 如果是 ISO 日期格式或 Google Sheets 日期
  try {
    const date = new Date(timeValue);
    if (!isNaN(date.getTime())) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
  } catch (e) {
    // 解析失敗，返回原值
  }

  return String(timeValue);
}
