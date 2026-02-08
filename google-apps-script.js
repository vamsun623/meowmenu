// ========================================
// 喵喵豬豬早餐店 - Google Apps Script
// ========================================
// 
// 部署步驟：
// 1. 開啟 Google Apps Script (https://script.google.com)
// 2. 建立新專案
// 3. 將此程式碼貼上
// 4. 修改下方的 SPREADSHEET_ID 為您的試算表 ID
// 5. 點選「部署」→「新增部署作業」
// 6. 選擇「網頁應用程式」
// 7. 執行身分：我
// 8. 誰可以存取：所有人
// 9. 點選「部署」並複製網址
// 10. 將網址貼到 config.js 的 API_URL
//
// ========================================

// 請修改為您的 Google 試算表 ID
// 試算表 ID 可從網址取得：https://docs.google.com/spreadsheets/d/[這裡是ID]/edit
const SPREADSHEET_ID = '您的試算表ID';

// 試算表名稱
const SHEETS = {
    ORDERS: '訂單',
    MENU: '菜單',
    CATEGORIES: '分類'
};

// ========================================
// 初始化試算表
// ========================================

function initSpreadsheet() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // 建立訂單表
    let ordersSheet = ss.getSheetByName(SHEETS.ORDERS);
    if (!ordersSheet) {
        ordersSheet = ss.insertSheet(SHEETS.ORDERS);
        ordersSheet.getRange('A1:H1').setValues([[
            '訂單編號', '顧客姓名', '訂購內容', '總金額', '領餐時間', '備註', '訂單狀態', '建立時間'
        ]]);
        ordersSheet.getRange('A1:H1').setFontWeight('bold');
    }

    // 建立菜單表
    let menuSheet = ss.getSheetByName(SHEETS.MENU);
    if (!menuSheet) {
        menuSheet = ss.insertSheet(SHEETS.MENU);
        menuSheet.getRange('A1:F1').setValues([[
            '餐點編號', '餐點名稱', '價格', '分類', '圖示', '啟用'
        ]]);
        menuSheet.getRange('A1:F1').setFontWeight('bold');

        // 新增預設菜單
        const defaultMenu = [
            [1, '原味蛋餅', 35, '蛋餅', '🥚', true],
            [2, '起司蛋餅', 45, '蛋餅', '🧀', true],
            [3, '玉米蛋餅', 45, '蛋餅', '🌽', true],
            [4, '鮪魚蛋餅', 50, '蛋餅', '🐟', true],
            [5, '培根蛋餅', 50, '蛋餅', '🥓', true],
            [6, '原味鬆餅', 40, '鬆餅', '🧇', true],
            [7, '巧克力鬆餅', 50, '鬆餅', '🍫', true],
            [8, '蜂蜜鬆餅', 50, '鬆餅', '🍯', true],
            [9, '奶油鬆餅', 45, '鬆餅', '🧈', true],
            [10, '紅茶', 20, '飲料', '🍵', true],
            [11, '奶茶', 30, '飲料', '🥛', true],
            [12, '豆漿', 25, '飲料', '🫘', true],
            [13, '咖啡', 35, '飲料', '☕', true],
            [14, '柳橙汁', 40, '飲料', '🍊', true],
        ];
        menuSheet.getRange(2, 1, defaultMenu.length, 6).setValues(defaultMenu);
    }

    // 建立分類表
    let categoriesSheet = ss.getSheetByName(SHEETS.CATEGORIES);
    if (!categoriesSheet) {
        categoriesSheet = ss.insertSheet(SHEETS.CATEGORIES);
        categoriesSheet.getRange('A1').setValue('分類名稱');
        categoriesSheet.getRange('A1').setFontWeight('bold');
        categoriesSheet.getRange('A2:A4').setValues([['蛋餅'], ['鬆餅'], ['飲料']]);
    }

    return '初始化完成！';
}

// ========================================
// Web App 入口
// ========================================

function doGet(e) {
    return ContentService
        .createTextOutput(JSON.stringify({ success: true, message: '喵喵豬豬早餐店 API 運作中！' }))
        .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
    try {
        const data = JSON.parse(e.postData.contents);
        const action = data.action;

        let result;

        switch (action) {
            case 'getOrders':
                result = getOrders();
                break;
            case 'createOrder':
                result = createOrder(data.order);
                break;
            case 'updateOrderStatus':
                result = updateOrderStatus(data.orderId, data.status);
                break;
            case 'getMenu':
                result = getMenu();
                break;
            case 'addMenuItem':
                result = addMenuItem(data.item);
                break;
            case 'updateMenuItem':
                result = updateMenuItem(data.item);
                break;
            case 'deleteMenuItem':
                result = deleteMenuItem(data.itemId);
                break;
            case 'getCategories':
                result = getCategories();
                break;
            case 'addCategory':
                result = addCategory(data.category);
                break;
            case 'deleteCategory':
                result = deleteCategory(data.category);
                break;
            case 'updateCategoryOrder':
                result = updateCategoryOrder(data.categories);
                break;
            default:
                result = { success: false, error: '未知的操作' };
        }

        return ContentService
            .createTextOutput(JSON.stringify(result))
            .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ success: false, error: error.message }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

// ========================================
// 訂單相關函式
// ========================================

function getOrders() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
        return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 8).getValues();
    const orders = data.map(row => ({
        id: row[0],
        customer: row[1],
        items: JSON.parse(row[2]),
        total: row[3],
        pickupTime: row[4],
        note: row[5],
        status: row[6],
        createdAt: row[7]
    }));

    // 最新的訂單在前面
    orders.reverse();

    return { success: true, data: orders };
}

function createOrder(order) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);

    sheet.appendRow([
        order.id,
        order.customer,
        JSON.stringify(order.items),
        order.total,
        order.pickupTime,
        order.note || '',
        order.status,
        order.createdAt
    ]);

    return { success: true, data: order };
}

function updateOrderStatus(orderId, status) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.ORDERS);
    const lastRow = sheet.getLastRow();

    for (let i = 2; i <= lastRow; i++) {
        if (sheet.getRange(i, 1).getValue() === orderId) {
            sheet.getRange(i, 7).setValue(status);
            return { success: true };
        }
    }

    return { success: false, error: '找不到訂單' };
}

// ========================================
// 菜單相關函式
// ========================================

function getMenu() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MENU);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
        return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    const menu = data.map(row => ({
        id: row[0],
        name: row[1],
        price: row[2],
        category: row[3],
        image: row[4],
        enabled: row[5] === true || row[5] === 'TRUE' || row[5] === 'true'
    }));

    return { success: true, data: menu };
}

function addMenuItem(item) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MENU);
    const lastRow = sheet.getLastRow();

    // 取得最大 ID
    let maxId = 0;
    if (lastRow >= 2) {
        const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
        maxId = Math.max(...ids.map(row => row[0] || 0));
    }

    const newId = maxId + 1;
    item.id = newId;

    sheet.appendRow([
        newId,
        item.name,
        item.price,
        item.category,
        item.image || '🍴',
        item.enabled !== false
    ]);

    return { success: true, data: item };
}

function updateMenuItem(item) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MENU);
    const lastRow = sheet.getLastRow();

    for (let i = 2; i <= lastRow; i++) {
        if (sheet.getRange(i, 1).getValue() === item.id) {
            sheet.getRange(i, 2, 1, 5).setValues([[
                item.name,
                item.price,
                item.category,
                item.image,
                item.enabled
            ]]);
            return { success: true };
        }
    }

    return { success: false, error: '找不到餐點' };
}

function deleteMenuItem(itemId) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.MENU);
    const lastRow = sheet.getLastRow();

    for (let i = 2; i <= lastRow; i++) {
        if (sheet.getRange(i, 1).getValue() === itemId) {
            sheet.deleteRow(i);
            return { success: true };
        }
    }

    return { success: false, error: '找不到餐點' };
}

// ========================================
// 分類相關函式
// ========================================

function getCategories() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CATEGORIES);
    const lastRow = sheet.getLastRow();

    if (lastRow < 2) {
        return { success: true, data: [] };
    }

    const data = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    const categories = data.map(row => row[0]).filter(c => c);

    return { success: true, data: categories };
}

function addCategory(category) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CATEGORIES);

    // 檢查是否已存在
    const existing = getCategories();
    if (existing.data.includes(category)) {
        return { success: false, error: '分類已存在' };
    }

    sheet.appendRow([category]);
    return { success: true };
}

function deleteCategory(category) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CATEGORIES);
    const lastRow = sheet.getLastRow();

    for (let i = 2; i <= lastRow; i++) {
        if (sheet.getRange(i, 1).getValue() === category) {
            sheet.deleteRow(i);
            return { success: true };
        }
    }

    return { success: false, error: '找不到分類' };
}

function updateCategoryOrder(categories) {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.CATEGORIES);

    // 清除原有分類 (保留標題)
    const lastRow = sheet.getLastRow();
    if (lastRow >= 2) {
        sheet.deleteRows(2, lastRow - 1);
    }

    // 寫入新排序的分類
    const rows = categories.map(c => [c]);
    if (rows.length > 0) {
        sheet.getRange(2, 1, rows.length, 1).setValues(rows);
    }

    return { success: true };
}
