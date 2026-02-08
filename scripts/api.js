// ========================================
// 喵喵豬豬早餐店 - API 串接模組
// ========================================

const API = {
    // 檢查 API 是否可用
    isAvailable() {
        return CONFIG.API_URL && CONFIG.API_URL.length > 0;
    },

    // 通用請求方法
    async request(action, data = {}) {
        if (!this.isAvailable()) {
            console.log('API 未設定，使用本地資料');
            return null;
        }

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                redirect: 'follow',
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                },
                body: JSON.stringify({ action, ...data })
            });

            if (!response.ok) {
                throw new Error('API 請求失敗');
            }

            const text = await response.text();
            try {
                return JSON.parse(text);
            } catch {
                console.error('JSON 解析失敗:', text);
                return null;
            }
        } catch (error) {
            console.error('API 錯誤:', error);
            return null;
        }
    },

    // ==================== 訂單相關 ====================

    // 取得所有訂單
    async getOrders() {
        const result = await this.request('getOrders');
        if (result && result.success) {
            return result.data;
        }
        // 如果 API 失敗，返回本地儲存的訂單
        return LocalStorage.getOrders();
    },

    // 新增訂單
    async createOrder(order) {
        const result = await this.request('createOrder', { order });
        if (result && result.success) {
            return result.data;
        }
        // 如果 API 失敗，儲存到本地
        return LocalStorage.saveOrder(order);
    },

    // 更新訂單狀態
    async updateOrderStatus(orderId, status) {
        const result = await this.request('updateOrderStatus', { orderId, status });
        if (result && result.success) {
            return true;
        }
        // 如果 API 失敗，更新本地
        return LocalStorage.updateOrderStatus(orderId, status);
    },

    // ==================== 菜單相關 ====================

    // 取得菜單
    async getMenu() {
        const result = await this.request('getMenu');
        if (result && result.success) {
            return result.data;
        }
        // 如果 API 失敗，返回本地菜單
        return LocalStorage.getMenu();
    },

    // 新增菜單項目
    async addMenuItem(item) {
        const result = await this.request('addMenuItem', { item });
        if (result && result.success) {
            return result.data;
        }
        return LocalStorage.addMenuItem(item);
    },

    // 更新菜單項目
    async updateMenuItem(item) {
        const result = await this.request('updateMenuItem', { item });
        if (result && result.success) {
            return true;
        }
        return LocalStorage.updateMenuItem(item);
    },

    // 刪除菜單項目
    async deleteMenuItem(itemId) {
        const result = await this.request('deleteMenuItem', { itemId });
        if (result && result.success) {
            return true;
        }
        return LocalStorage.deleteMenuItem(itemId);
    },

    // 更新菜單排序
    async updateMenuOrder(menuIds) {
        // 永遠更新本地儲存以保持同步
        LocalStorage.updateMenuOrder(menuIds);

        const result = await this.request('updateMenuOrder', { menuIds });
        return result && result.success;
    },

    // ==================== 分類相關 ====================

    // 取得分類
    async getCategories() {
        const result = await this.request('getCategories');
        if (result && result.success) {
            return result.data;
        }
        return LocalStorage.getCategories();
    },

    // 新增分類
    async addCategory(category) {
        const result = await this.request('addCategory', { category });
        if (result && result.success) {
            return true;
        }
        return LocalStorage.addCategory(category);
    },

    // 刪除分類
    async deleteCategory(category) {
        const result = await this.request('deleteCategory', { category });
        if (result && result.success) {
            return true;
        }
        return LocalStorage.deleteCategory(category);
    },

    // 更新分類排序
    async updateCategoryOrder(categories) {
        // 永遠更新本地儲存以保持同步
        LocalStorage.updateCategoryOrder(categories);

        const result = await this.request('updateCategoryOrder', { categories });
        return result && result.success;
    }
};

// ========================================
// 本地儲存模組 (當 API 無法使用時的備援)
// ========================================

const LocalStorage = {
    KEYS: {
        ORDERS: 'meowmenu_orders',
        MENU: 'meowmenu_menu',
        CATEGORIES: 'meowmenu_categories'
    },

    // 初始化本地資料
    init() {
        if (!localStorage.getItem(this.KEYS.MENU)) {
            localStorage.setItem(this.KEYS.MENU, JSON.stringify(CONFIG.DEFAULT_MENU));
        }
        if (!localStorage.getItem(this.KEYS.CATEGORIES)) {
            localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(CONFIG.DEFAULT_CATEGORIES));
        }
        if (!localStorage.getItem(this.KEYS.ORDERS)) {
            localStorage.setItem(this.KEYS.ORDERS, JSON.stringify([]));
        }
    },

    // ==================== 訂單 ====================

    getOrders() {
        const data = localStorage.getItem(this.KEYS.ORDERS);
        return data ? JSON.parse(data) : [];
    },

    saveOrder(order) {
        const orders = this.getOrders();
        orders.unshift(order);
        localStorage.setItem(this.KEYS.ORDERS, JSON.stringify(orders));
        return order;
    },

    updateOrderStatus(orderId, status) {
        const orders = this.getOrders();
        const index = orders.findIndex(o => o.id === orderId);
        if (index !== -1) {
            orders[index].status = status;
            localStorage.setItem(this.KEYS.ORDERS, JSON.stringify(orders));
            return true;
        }
        return false;
    },

    // ==================== 菜單 ====================

    getMenu() {
        const data = localStorage.getItem(this.KEYS.MENU);
        return data ? JSON.parse(data) : CONFIG.DEFAULT_MENU;
    },

    addMenuItem(item) {
        const menu = this.getMenu();
        const maxId = menu.reduce((max, m) => Math.max(max, m.id), 0);
        item.id = maxId + 1;
        menu.push(item);
        localStorage.setItem(this.KEYS.MENU, JSON.stringify(menu));
        return item;
    },

    updateMenuItem(item) {
        const menu = this.getMenu();
        const index = menu.findIndex(m => m.id === item.id);
        if (index !== -1) {
            menu[index] = item;
            localStorage.setItem(this.KEYS.MENU, JSON.stringify(menu));
            return true;
        }
        return false;
    },

    deleteMenuItem(itemId) {
        const menu = this.getMenu();
        const filtered = menu.filter(m => m.id !== itemId);
        localStorage.setItem(this.KEYS.MENU, JSON.stringify(filtered));
        return true;
    },

    updateMenuOrder(menuIds) {
        const menu = this.getMenu();
        const sortedMenu = menuIds.map(id => menu.find(m => m.id === id)).filter(Boolean);
        localStorage.setItem(this.KEYS.MENU, JSON.stringify(sortedMenu));
        return true;
    },

    // ==================== 分類 ====================

    getCategories() {
        const data = localStorage.getItem(this.KEYS.CATEGORIES);
        return data ? JSON.parse(data) : CONFIG.DEFAULT_CATEGORIES;
    },

    addCategory(category) {
        const categories = this.getCategories();
        if (!categories.includes(category)) {
            categories.push(category);
            localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
        }
        return true;
    },

    deleteCategory(category) {
        const categories = this.getCategories();
        const filtered = categories.filter(c => c !== category);
        localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(filtered));
        return true;
    },

    updateCategoryOrder(categories) {
        localStorage.setItem(this.KEYS.CATEGORIES, JSON.stringify(categories));
        return true;
    }
};
