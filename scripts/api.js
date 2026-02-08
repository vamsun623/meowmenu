// 喵喵豬豬早餐店 - API 串接模組
// ========================================

const API_VERSION = '1.0.2'; // 與 GAS 版本對應

const API = {
    // 追蹤是否有正在進行的更新動作
    pendingUpdates: new Set(),

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

    // 紀錄日誌到控制台
    log(message, data) {
        console.log(`[API] ${message}`, data || '');
    },

    // ==================== 訂單相關 ====================

    // 取得所有訂單
    async getOrders() {
        const result = await this.request('getOrders');
        if (result && result.success) {
            // 同步到本地儲存
            localStorage.setItem(LocalStorage.KEYS.ORDERS, JSON.stringify(result.data));
            return result.data;
        }
        return LocalStorage.getOrders();
    },

    // 新增訂單
    async createOrder(order) {
        // 先更新本地以確保即時性
        LocalStorage.saveOrder(order);

        const result = await this.request('createOrder', { order });
        return result && result.success ? result.data : order;
    },

    // 更新訂單狀態
    async updateOrderStatus(orderId, status) {
        // 先更新本地
        LocalStorage.updateOrderStatus(orderId, status);

        const result = await this.request('updateOrderStatus', { orderId, status });
        return result && result.success;
    },

    // ==================== 菜單相關 ====================

    // 取得菜單
    async getMenu() {
        const result = await this.request('getMenu');
        if (result && result.success) {
            // 同步到本地儲存
            localStorage.setItem(LocalStorage.KEYS.MENU, JSON.stringify(result.data));
            return result.data;
        }
        return LocalStorage.getMenu();
    },

    // 新增菜單項目
    async addMenuItem(item) {
        // 先更新本地
        const localItem = LocalStorage.addMenuItem(item);

        const result = await this.request('addMenuItem', { item: localItem });
        return result && result.success ? result.data : localItem;
    },

    // 更新菜單項目
    async updateMenuItem(item) {
        // 先更新本地
        LocalStorage.updateMenuItem(item);

        const result = await this.request('updateMenuItem', { item });
        return result && result.success;
    },

    // 刪除菜單項目
    async deleteMenuItem(itemId) {
        // 先更新本地
        LocalStorage.deleteMenuItem(itemId);

        const result = await this.request('deleteMenuItem', { itemId });
        return result && result.success;
    },

    // 更新菜單排序
    async updateMenuOrder(menuIds) {
        this.log('更新菜單排序', menuIds);
        // 永遠先更新本地儲存以保持同步
        LocalStorage.updateMenuOrder(menuIds);

        const result = await this.request('updateMenuOrder', { menuIds });
        this.log('更新菜單排序結果', result);
        return result && result.success;
    },

    // ==================== 分類相關 ====================

    // 取得所有分類
    async getCategories() {
        const result = await this.request('getCategories');
        if (result && result.success) {
            // 如果目前沒有正在進行的排序更新，才同步到本地儲存
            if (!this.pendingUpdates.has('updateCategoryOrder')) {
                this.log('同步伺服器分類到本地', result.data);
                localStorage.setItem(LocalStorage.KEYS.CATEGORIES, JSON.stringify(result.data));
            }
            return result.data;
        }
        return LocalStorage.getCategories();
    },

    // 檢查伺服器連線與版本
    async checkSession() {
        const result = await this.request('checkVersion');
        if (result && result.success) {
            this.log('伺服器連線正常', result);
            return result;
        }
        return null;
    },

    // 比對版本並警告
    async validateVersion() {
        const info = await this.checkSession();
        if (info) {
            if (info.version !== API_VERSION) {
                console.warn(`[API] 版本不符！前端: ${API_VERSION}, 伺服器: ${info.version}。請重新部署 GAS！`);
                return { valid: false, info };
            }
            return { valid: true, info };
        }
        return { valid: false, info: null };
    },

    // 新增分類
    async addCategory(category) {
        // 先更新本地
        LocalStorage.addCategory(category);

        const result = await this.request('addCategory', { category });
        return result && result.success;
    },

    // 刪除分類
    async deleteCategory(category) {
        // 先更新本地
        LocalStorage.deleteCategory(category);

        const result = await this.request('deleteCategory', { category });
        return result && result.success;
    },

    // 更新分類排序
    async updateCategoryOrder(categories) {
        this.log('更新分類排序', categories);
        this.pendingUpdates.add('updateCategoryOrder');

        // 永遠先更新本地儲存以保持同步
        LocalStorage.updateCategoryOrder(categories);

        try {
            const result = await this.request('updateCategoryOrder', { categories });
            this.log('更新分類排序結果', result);
            return result && result.success;
        } finally {
            // 延遲一點點再移除 pending，確保其他 sync 動作不會太快插進來
            setTimeout(() => this.pendingUpdates.delete('updateCategoryOrder'), 1000);
        }
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
