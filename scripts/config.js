// ========================================
// 喵喵豬豬早餐店 - 設定檔
// ========================================

const CONFIG = {
  // Google Apps Script Web App URL
  // 部署後請將此處替換為您的 Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycby-KgNq_Nw66QIu28Yn32Ts88pKMmJjh8hcPNy6v_ACAoTSmqz_e0T_Qs_1ly7Xjw0/exec',

  // 特權使用者名單
  ADMIN_USERS: ['喵喵店長', '0422'],

  // 預設餐點分類
  DEFAULT_CATEGORIES: ['套餐', '蛋餅', '鬆餅', '飲料', '其他'],

  // 預設菜單資料 (當 API 無法連線時使用)
  DEFAULT_MENU: [
    { id: 24, name: '雙餅聯盟', price: 13, category: '套餐', image: 'assets/images/d71c71cf-d6e8-40c6-98dd-90208ecb8d23.jpg', enabled: true },
    { id: 25, name: '三寶萌萌餐', price: 15, category: '套餐', image: 'assets/images/3cd159bb-bfc1-4a51-b971-ab03e73f885c.jpg', enabled: true },
    { id: 26, name: '療癒四重奏', price: 16, category: '套餐', image: 'assets/images/16019121-4fa9-4a27-bb68-bf133d7dbfed.jpg', enabled: true },
    { id: 18, name: '鬆餅拼盤', price: 15, category: '套餐', image: 'assets/images/22abc166-c04a-4b94-99bc-97adeb936439.jpg', enabled: true },
    { id: 1, name: '原味蛋餅', price: 3, category: '蛋餅', image: 'assets/images/3cd159bb-bfc1-4a51-b971-ab03e73f885c.jpg', enabled: true },
    { id: 3, name: '肉鬆蛋餅', price: 5, category: '蛋餅', image: 'assets/images/65185502-b57c-43b7-be1f-bd8e4bc6fe34.jpg', enabled: true },
    { id: 2, name: '起司蛋餅', price: 5, category: '蛋餅', image: 'assets/images/16019121-4fa9-4a27-bb68-bf133d7dbfed.jpg', enabled: true },
    { id: 4, name: '起司肉鬆蛋餅', price: 6, category: '蛋餅', image: 'assets/images/9ca174b8-b117-4b6c-9d75-f6795280df55.jpg', enabled: true },
    { id: 16, name: '超級起司蛋餅', price: 6, category: '蛋餅', image: 'assets/images/3cd159bb-bfc1-4a51-b971-ab03e73f885c.jpg', enabled: true },
    { id: 6, name: '原味鬆餅', price: 2, category: '鬆餅', image: 'assets/images/ed16511d-52d4-4f30-87fe-1551f0655b86.jpg', enabled: true },
    { id: 7, name: '巧克力鬆餅', price: 3, category: '鬆餅', image: 'assets/images/chocolate_waffle.png', enabled: true },
    { id: 8, name: '蜂蜜鬆餅', price: 2, category: '鬆餅', image: 'assets/images/711289d7-4ed1-4e54-9d0c-2173afb9dbcd.jpg', enabled: true },
    { id: 9, name: '起司鬆餅', price: 2, category: '鬆餅', image: 'assets/images/cheese_waffle.png', enabled: true },
    { id: 17, name: '蔓越莓鬆餅', price: 3, category: '鬆餅', image: 'assets/images/711289d7-4ed1-4e54-9d0c-2173afb9dbcd.jpg', enabled: true },
    { id: 22, name: '蘿蔔糕', price: 2, category: '其他', image: 'assets/images/17a0c9b2-7d60-4c65-bdea-2c606d816a1f.jpg', enabled: true },
    { id: 23, name: '蘿蔔糕加蛋', price: 3, category: '其他', image: 'assets/images/9ca2e7c8-a0e5-4b54-90b2-2540dbad853c.jpg', enabled: true },
    { id: 10, name: '冰牛奶', price: 2, category: '飲料', image: 'assets/images/cold_milk.png', enabled: true },
    { id: 11, name: '溫牛奶', price: 3, category: '飲料', image: 'assets/images/warm_milk.png', enabled: true },
    { id: 12, name: '熱牛奶', price: 3, category: '飲料', image: 'assets/images/hot_milk.png', enabled: true },
    { id: 13, name: '冰米漿', price: 2, category: '飲料', image: 'assets/images/cold_rice_milk.png', enabled: true },
    { id: 14, name: '溫米漿', price: 3, category: '飲料', image: 'assets/images/warm_rice_milk.png', enabled: true },
    { id: 15, name: '熱米漿', price: 3, category: '飲料', image: 'assets/images/hot_rice_milk.png', enabled: true },
    { id: 19, name: '冰米奶漿', price: 2, category: '飲料', image: 'assets/images/cold_rice_milk_blend.png', enabled: true },
    { id: 20, name: '溫米奶漿', price: 3, category: '飲料', image: 'assets/images/warm_rice_milk_blend.png', enabled: true },
    { id: 21, name: '熱米奶漿', price: 3, category: '飲料', image: 'assets/images/hot_rice_milk_blend.png', enabled: true }
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
