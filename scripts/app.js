// ========================================
// 喵喵豬豬早餐店 - 主程式邏輯
// ========================================

// 全域狀態
const State = {
    currentUser: null,
    isAdmin: false,
    currentPage: 'order',
    cart: [],
    menu: [],
    orders: [],
    categories: [],
    availableImages: [],
    selectedCategory: 'all',
    orderFilter: 'pending',
    isSubmitting: false,  // 防止重複送出
    processingOrders: new Set()  // 正在處理的訂單 ID
};

// DOM 元素快取
const DOM = {};

// 食物相關表情符號列表
const FOOD_EMOJIS = [
    '🍳', '🥚', '🧀', '🥓', '🌽', '🐟', '🥬', '🍅', '🧅', '🥒',
    '🧇', '🥞', '🍞', '🥐', '🥖', '🥨', '🥯', '🧈', '🍯', '🥜',
    '🥛', '🍵', '☕', '🧃', '🥤', '🍊', '🍋', '🍎', '🍌', '🍓',
    '🍴', '🍽️', '🥢', '🥡', '🍙', '🍘', '🍚', '🍜', '🍝', '🍲'
];

// ========================================
// 初始化
// ========================================

// 資料同步 Promise 定義
let apiSyncPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    initDOM();
    initEventListeners();
    LocalStorage.init();

    // 1. 執行版本連線檢測 (最優先，攸關登入介面顯示)
    performVersionCheck();

    // 2. 立即從本地載入資料 (樂觀載入，不等待網路)
    loadLocalData();

    // 3. 背景與 API 同步最新資料
    apiSyncPromise = syncDataWithAPI();

    // 載入上次儲存的姓名
    const savedName = localStorage.getItem('meowmenu_username');
    if (savedName) {
        DOM.loginInput.value = savedName;
    }

    // 自動「喵」一聲 (處理自動播放限制)
    const triggerAutoMeow = () => {
        AudioManager.play('meow').then(() => {
            console.log('[Audio] 自動播放成功');
            cleanupListeners();
        }).catch(err => {
            console.log('[Audio] 等待使用者互動以播放');
        });
    };

    const cleanupListeners = () => {
        document.removeEventListener('click', triggerAutoMeow);
        document.removeEventListener('keydown', triggerAutoMeow);
    };

    // 掛載降級方案
    document.addEventListener('click', triggerAutoMeow, { once: true });
    document.addEventListener('keydown', triggerAutoMeow, { once: true });

    // 嘗試立即播
    triggerAutoMeow();
});

function initDOM() {
    DOM.loginContainer = document.getElementById('loginContainer');
    DOM.appContainer = document.getElementById('appContainer');
    DOM.loginInput = document.getElementById('loginInput');
    DOM.loginBtn = document.getElementById('loginBtn');
    DOM.loginError = document.getElementById('loginError');
    DOM.userDisplay = document.getElementById('userDisplay');
    DOM.navBtns = document.querySelectorAll('.nav-btn');
    DOM.menuNavBtn = document.getElementById('menuNavBtn');
    DOM.pages = document.querySelectorAll('.page');
    DOM.categoryTabs = document.getElementById('categoryTabs');
    DOM.menuGrid = document.getElementById('menuGrid');
    DOM.cartItems = document.getElementById('cartItems');
    DOM.cartTotal = document.getElementById('cartTotal');
    DOM.cartCheckoutBtn = document.getElementById('cartCheckoutBtn');
    DOM.ordersList = document.getElementById('ordersList');
    DOM.ordersFilter = document.getElementById('ordersFilter');
    DOM.checkoutModal = document.getElementById('checkoutModal');
    DOM.editMenuModal = document.getElementById('editMenuModal');
    DOM.successModal = document.getElementById('successModal');
    DOM.categoriesList = document.getElementById('categoriesList');
    DOM.menuTableBody = document.getElementById('menuTableBody');
    DOM.menuCardsMobile = document.getElementById('menuCardsMobile');
    DOM.menuCategorySelect = document.getElementById('menuCategorySelect');
    DOM.editMenuCategory = document.getElementById('editMenuCategory');
    DOM.emojiPickerArea = document.getElementById('emojiPickerArea');
    DOM.imagePickerArea = document.getElementById('imagePickerArea');
    DOM.editEmojiPickerArea = document.getElementById('editEmojiPickerArea');
    DOM.editImagePickerArea = document.getElementById('editImagePickerArea');
    DOM.addCategoryBtn = document.getElementById('addCategoryBtn');
    DOM.newCategoryInput = document.getElementById('newCategoryInput');
}

function initEventListeners() {
    // 登入
    DOM.loginBtn.addEventListener('click', () => {
        AudioManager.play('click');
        handleLogin();
    });
    DOM.loginInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // 導覽
    DOM.navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            if (page === 'menu' && !State.isAdmin) {
                return; // 非管理員無法進入菜單管理
            }
            switchPage(page);
        });
    });

    // 結帳按鈕
    DOM.cartCheckoutBtn.addEventListener('click', () => {
        AudioManager.play('click');
        showCheckoutModal();
    });

    // 訂單篩選
    DOM.ordersFilter.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-btn')) {
            AudioManager.play('click');
            State.orderFilter = e.target.dataset.filter;
            updateOrdersFilter();
            renderOrders();
        }
    });

    // 彈窗關閉
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                AudioManager.play('click');
                closeModal(modal);
            }
        });
    });

    // 結帳表單
    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);

    // 新增餐點表單
    document.getElementById('addMenuForm').addEventListener('submit', handleAddMenuItem);

    // 編輯餐點表單
    document.getElementById('editMenuForm').addEventListener('submit', handleEditMenuItem);

    // 新增分類
    DOM.addCategoryBtn.addEventListener('click', () => {
        AudioManager.play('click');
        handleAddCategory();
    });
    document.getElementById('newCategoryInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddCategory();
        }
    });

    // 分類標籤點擊 (委派)
    DOM.categoryTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.category-tab');
        if (tab) {
            State.selectedCategory = tab.dataset.category;
            renderCategoryTabs();
            renderMenuItems();
        }
    });

    // 圖片選擇器切換
    document.querySelectorAll('.image-picker-options').forEach(container => {
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('image-picker-btn')) {
                const type = e.target.dataset.type;
                const target = e.target.dataset.target || 'add';
                switchImagePickerType(type, target);

                // 更新按鈕狀態
                container.querySelectorAll('.image-picker-btn').forEach(btn => {
                    btn.classList.toggle('active', btn === e.target);
                });
            }
        });
    });
}

// 只從本地快取或預設值載入資料 (這非常快)
function loadLocalData() {
    State.menu = LocalStorage.getMenu();
    State.categories = LocalStorage.getCategories();
    State.orders = LocalStorage.getOrders();
    // 圖片清單暫時只能異步 fetch，但我們放在這裡嘗試觸發
    loadAvailableImages();
}

// 與 API 同步最新資料 (背景執行)
async function syncDataWithAPI() {
    try {
        const [menu, categories, orders] = await Promise.all([
            API.getMenu(),
            API.getCategories(),
            API.getOrders()
        ]);

        // 檢查是否真的有變化，避免不必要的渲染
        const isMenuChanged = JSON.stringify(State.menu) !== JSON.stringify(menu);
        const isCategoriesChanged = JSON.stringify(State.categories) !== JSON.stringify(categories);
        const isOrdersChanged = JSON.stringify(State.orders) !== JSON.stringify(orders);

        if (!isMenuChanged && !isCategoriesChanged && !isOrdersChanged) {
            console.log('[Sync] 無資料變化，略過更新');
            return true; // 資料無變化
        }

        console.log('[Sync] 偵測到資料變化:', { isMenuChanged, isCategoriesChanged, isOrdersChanged });

        if (isCategoriesChanged) {
            console.log('[Sync] 分類順序變化:', { old: State.categories, new: categories });
        }

        State.menu = menu;
        State.categories = categories;
        State.orders = orders;

        // 如果已經進入應用程式頁面且有變動，則更新 UI
        if (State.currentUser) {
            if (State.currentPage === 'order' && (isMenuChanged || isCategoriesChanged)) {
                renderOrderPage();
            }
            if (State.currentPage === 'orders' && isOrdersChanged) {
                renderOrders();
            }
            if (State.isAdmin && State.currentPage === 'menu' && (isMenuChanged || isCategoriesChanged)) {
                renderMenuManagement();
            }
        }

        return true;
    } catch (error) {
        console.error('API 同步失敗:', error);
        return false;
    }
}

async function loadInitialData() {
    // 此函式保留給需要強制完全載入的地方
    loadLocalData();
    return await syncDataWithAPI();
}

// ========================================
// 圖片選擇器功能
// ========================================

async function loadAvailableImages() {
    // 嘗試載入 assets/images 資料夾中的圖片
    // 由於前端無法直接列出資料夾內容，我們使用一個圖片清單檔案
    try {
        const response = await fetch('assets/images/images.json');
        if (response.ok) {
            State.availableImages = await response.json();
        }
    } catch (e) {
        // 如果沒有圖片清單檔案，使用空陣列
        State.availableImages = [];
    }
}

function switchImagePickerType(type, target = 'add') {
    const emojiArea = target === 'edit' ? DOM.editEmojiPickerArea : DOM.emojiPickerArea;
    const imageArea = target === 'edit' ? DOM.editImagePickerArea : DOM.imagePickerArea;

    if (type === 'emoji') {
        emojiArea.style.display = 'grid';
        imageArea.style.display = 'none';
        renderEmojiPicker(target);
    } else {
        emojiArea.style.display = 'none';
        imageArea.style.display = 'flex';
        renderImagePicker(target);
    }
}

function renderEmojiPicker(target = 'add') {
    const area = target === 'edit' ? DOM.editEmojiPickerArea : DOM.emojiPickerArea;
    const inputId = target === 'edit' ? 'editMenuImage' : 'menuItemImage';
    const currentValue = document.getElementById(inputId).value;

    area.innerHTML = FOOD_EMOJIS.map(emoji => `
    <button type="button" class="emoji-picker-item ${currentValue === emoji ? 'selected' : ''}" 
            data-emoji="${emoji}" data-target="${target}">
      ${emoji}
    </button>
  `).join('');

    area.querySelectorAll('.emoji-picker-item').forEach(btn => {
        btn.addEventListener('click', () => selectEmoji(btn.dataset.emoji, btn.dataset.target));
    });
}

function selectEmoji(emoji, target = 'add') {
    const inputId = target === 'edit' ? 'editMenuImage' : 'menuItemImage';
    document.getElementById(inputId).value = emoji;
    renderEmojiPicker(target);
}

function renderImagePicker(target = 'add') {
    const area = target === 'edit' ? DOM.editImagePickerArea : DOM.imagePickerArea;
    const inputId = target === 'edit' ? 'editMenuImage' : 'menuItemImage';
    const currentValue = document.getElementById(inputId).value;

    if (State.availableImages.length === 0) {
        area.innerHTML = `
      <div class="image-picker-empty">
        <p>📁 尚無可用圖片</p>
        <p style="font-size: 12px;">請將圖片放入 assets/images 資料夾<br>並更新 images.json 檔案</p>
      </div>
    `;
        return;
    }

    area.innerHTML = State.availableImages.map(img => `
    <img src="assets/images/${img}" 
         class="image-preview-item ${currentValue === 'assets/images/' + img ? 'selected' : ''}"
         data-image="assets/images/${img}" 
         data-target="${target}"
         alt="${img}">
  `).join('');

    area.querySelectorAll('.image-preview-item').forEach(item => {
        item.addEventListener('click', () => selectImage(item.dataset.image, item.dataset.target));
    });
}

function selectImage(imagePath, target = 'add') {
    const inputId = target === 'edit' ? 'editMenuImage' : 'menuItemImage';
    document.getElementById(inputId).value = imagePath;
    renderImagePicker(target);
}

// ========================================
// 登入處理
// ========================================

async function handleLogin() {
    AudioManager.play('click');
    const name = DOM.loginInput.value.trim();

    if (!name) {
        showLoginError('請輸入您的姓名！');
        return;
    }

    // 儲存姓名到 localStorage
    localStorage.setItem('meowmenu_username', name);

    State.currentUser = name;
    State.isAdmin = isAdmin(name);

    // 更新 UI
    DOM.userDisplay.textContent = name + (State.isAdmin ? ' 👑' : '');

    // 顯示/隱藏菜單管理按鈕
    if (State.isAdmin) {
        DOM.menuNavBtn.style.display = 'block';
    } else {
        DOM.menuNavBtn.style.display = 'none';
    }

    AudioManager.play('meow');
    setTimeout(() => AudioManager.play('success'), 200);

    // 切換到主應用程式 (秒進，不等待 API)
    DOM.loginContainer.style.display = 'none';
    DOM.appContainer.classList.add('show');

    // 重設分類為全部，確保餐點正確顯示
    State.selectedCategory = 'all';

    // 立即使用本地資料渲染
    renderOrderPage();
    renderOrdersPage();
    if (State.isAdmin) {
        renderMenuManagement();
    }
}

// 執行系統版本與連線檢測
function performVersionCheck() {
    API.validateVersion().then(({ valid, info }) => {
        const statusEl = document.getElementById('versionStatus');
        if (statusEl) {
            statusEl.classList.remove('loading-text');
            if (valid) {
                statusEl.innerHTML = '✅ 連線正常';
                statusEl.style.color = 'green';
            } else if (info && !info.success) {
                statusEl.innerHTML = `❌ 錯誤: ${info.error || '未知錯誤'}`;
                statusEl.style.color = 'red';
            } else if (info) {
                statusEl.innerHTML = `⚠️ 版本 (${info.version}) 不符`;
                statusEl.style.color = 'orange';
                alert('⚠️ 偵測到系統版本不符。請聯繫管理員確保 Google Scripts 已重新部署為 v' + API_VERSION);
            } else {
                statusEl.innerHTML = '❌ 伺服器連線失敗';
                statusEl.style.color = 'red';
            }
        }
    });
}

function showLoginError(message) {
    DOM.loginError.textContent = message;
    DOM.loginError.classList.add('show');
    setTimeout(() => {
        DOM.loginError.classList.remove('show');
    }, 3000);
}

// ========================================
// 頁面切換
// ========================================

function switchPage(pageName) {
    AudioManager.play('click');
    State.currentPage = pageName;

    DOM.navBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === pageName);
    });

    DOM.pages.forEach(page => {
        page.classList.toggle('active', page.id === pageName + 'Page');
    });

    // 刷新對應頁面資料
    if (pageName === 'orders') {
        renderOrders();
    } else if (pageName === 'menu') {
        renderMenuManagement();
    }
}

// ========================================
// 點餐頁面
// ========================================

function renderOrderPage() {
    // 確保默認顯示全部餐點
    if (!State.selectedCategory) {
        State.selectedCategory = 'all';
    }
    renderCategoryTabs();
    renderMenuItems();
    renderCart();
}

function renderCategoryTabs() {
    const allCategories = ['all', ...State.categories];

    DOM.categoryTabs.innerHTML = allCategories.map(cat => `
    <button class="category-tab ${State.selectedCategory === cat ? 'active' : ''}" 
            data-category="${cat}">
      ${cat === 'all' ? '🍽️ 全部' : getCategoryEmoji(cat) + ' ' + cat}
    </button>
  `).join('');
}

function getCategoryEmoji(category) {
    const emojis = {
        '蛋餅': '🥚',
        '鬆餅': '🧇',
        '飲料': '🥤'
    };
    return emojis[category] || '🍴';
}

function renderMenuItems() {
    const filteredMenu = State.menu.filter(item => {
        if (!item.enabled) return false;
        if (State.selectedCategory === 'all') return true;
        return item.category === State.selectedCategory;
    });

    if (filteredMenu.length === 0) {
        DOM.menuGrid.innerHTML = `
      <div class="orders-empty" style="grid-column: 1/-1;">
        <div class="orders-empty-icon">🍽️</div>
        <p>目前沒有餐點</p>
      </div>
    `;
        return;
    }

    DOM.menuGrid.innerHTML = filteredMenu.map(item => {
        const cartItem = State.cart.find(c => c.id === item.id);
        const quantity = cartItem ? cartItem.quantity : 0;
        const imageHtml = getItemImageHtml(item.image);

        return `
      <div class="menu-item" data-id="${item.id}">
        <div class="menu-item-image">${imageHtml}</div>
        <div class="menu-item-info">
          <div class="menu-item-name">${item.name}</div>
          <div class="menu-item-price">$${item.price}</div>
          <div class="menu-item-controls">
            <button class="quantity-btn" onclick="updateCart(${item.id}, -1)" ${quantity === 0 ? 'disabled' : ''}>−</button>
            <span class="quantity-display">${quantity}</span>
            <button class="quantity-btn" onclick="updateCart(${item.id}, 1)">+</button>
          </div>
        </div>
      </div>
    `;
    }).join('');
}

function getItemImageHtml(image) {
    if (!image) return '🍴';
    if (image.startsWith('assets/')) {
        return `<img src="${image}" alt="餐點圖片" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
    return image;
}

function updateCart(itemId, change) {
    const menuItem = State.menu.find(m => m.id === itemId);
    if (!menuItem) return;

    const cartIndex = State.cart.findIndex(c => c.id === itemId);

    if (cartIndex === -1) {
        if (change > 0) {
            State.cart.push({
                id: menuItem.id,
                name: menuItem.name,
                price: menuItem.price,
                quantity: 1
            });
        }
    } else {
        State.cart[cartIndex].quantity += change;
        if (State.cart[cartIndex].quantity <= 0) {
            State.cart.splice(cartIndex, 1);
        }
    }

    if (change > 0) {
        AudioManager.play('add');
    } else {
        AudioManager.play('remove');
    }

    renderMenuItems();
    renderCart();
}

function removeFromCart(itemId) {
    State.cart = State.cart.filter(c => c.id !== itemId);
    renderMenuItems();
    renderCart();
}

function renderCart() {
    if (State.cart.length === 0) {
        DOM.cartItems.innerHTML = `
      <div class="cart-empty">
        <p>🛒 購物車是空的</p>
        <p>快來選購美味餐點吧！</p>
      </div>
    `;
        DOM.cartTotal.textContent = '$0';
        DOM.cartCheckoutBtn.disabled = true;
        return;
    }

    const total = State.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    DOM.cartItems.innerHTML = State.cart.map(item => `
    <div class="cart-item">
      <div>
        <span class="cart-item-name">${item.name}</span>
        <span class="cart-item-qty">x${item.quantity}</span>
      </div>
      <div>
        <span class="cart-item-price">$${item.price * item.quantity}</span>
        <button class="cart-item-remove" onclick="removeFromCart(${item.id})">✕</button>
      </div>
    </div>
  `).join('');

    DOM.cartTotal.textContent = '$' + total;
    DOM.cartCheckoutBtn.disabled = false;
}

// ========================================
// 結帳處理
// ========================================

function showCheckoutModal() {
    if (State.cart.length === 0) return;

    // 生成時間選項
    const hourSelect = document.getElementById('pickupHour');
    const minuteSelect = document.getElementById('pickupMinute');

    hourSelect.innerHTML = '';
    minuteSelect.innerHTML = '';

    for (let h = CONFIG.PICKUP_TIME.START_HOUR; h <= CONFIG.PICKUP_TIME.END_HOUR; h++) {
        hourSelect.innerHTML += `<option value="${h}">${h.toString().padStart(2, '0')}</option>`;
    }

    for (let m = 0; m < 60; m += CONFIG.PICKUP_TIME.INTERVAL) {
        minuteSelect.innerHTML += `<option value="${m}">${m.toString().padStart(2, '0')}</option>`;
    }

    // 設定預設時間為目前時間後 20 分鐘
    const now = new Date();
    const defaultTime = new Date(now.getTime() + 20 * 60000);
    const hour = Math.max(CONFIG.PICKUP_TIME.START_HOUR, Math.min(CONFIG.PICKUP_TIME.END_HOUR, defaultTime.getHours()));
    const minute = Math.floor(defaultTime.getMinutes() / 10) * 10;

    hourSelect.value = hour;
    minuteSelect.value = minute;

    // 清空備註
    document.getElementById('orderNote').value = '';

    openModal(DOM.checkoutModal);
}

async function handleCheckout(e) {
    e.preventDefault();

    // 防止重複送出
    if (State.isSubmitting) return;
    State.isSubmitting = true;

    // 禁用按鈕
    const submitBtn = e.target.querySelector('button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '處理中...';
    }

    try {
        const hour = document.getElementById('pickupHour').value;
        const minute = document.getElementById('pickupMinute').value;
        const note = document.getElementById('orderNote').value.trim();

        const order = {
            id: generateOrderId(),
            customer: State.currentUser,
            items: [...State.cart],
            total: State.cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
            pickupTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
            note: note,
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        // 儲存訂單
        await API.createOrder(order);
        State.orders.unshift(order);

        // 清空購物車
        State.cart = [];
        renderMenuItems();
        renderCart();

        // 關閉結帳視窗
        closeModal(DOM.checkoutModal);

        // 顯示成功訊息
        AudioManager.play('success');
        showSuccessMessage('🎉 點餐成功！', `您的訂單 ${order.id} 已成立，請於 ${order.pickupTime} 前來取餐！`);
    } finally {
        // 恢復狀態
        State.isSubmitting = false;
        if (submitBtn) {
            AudioManager.play('click');
            submitBtn.disabled = false;
            submitBtn.textContent = '確認送出';
        }
    }
}

// ========================================
// 訂單管理頁面
// ========================================

function renderOrdersPage() {
    renderOrders();
}

function updateOrdersFilter() {
    DOM.ordersFilter.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === State.orderFilter);
    });
}

async function renderOrders() {
    // 重新載入訂單
    State.orders = await API.getOrders();

    const filteredOrders = State.orders.filter(order => {
        if (State.orderFilter === 'all') return true;
        return order.status === State.orderFilter;
    });

    if (filteredOrders.length === 0) {
        DOM.ordersList.innerHTML = `
      <div class="orders-empty">
        <div class="orders-empty-icon">📋</div>
        <p>目前沒有訂單</p>
      </div>
    `;
        return;
    }

    DOM.ordersList.innerHTML = filteredOrders.map(order => {
        const statusClass = order.status === 'delivered' ? 'delivered' :
            order.status === 'cancelled' ? 'cancelled' : '';
        const statusText = order.status === 'delivered' ? '已送餐' :
            order.status === 'cancelled' ? '已取消' : '未送餐';
        const statusBadgeClass = order.status === 'delivered' ? 'delivered' :
            order.status === 'cancelled' ? 'cancelled' : 'pending';

        return `
      <div class="order-card ${statusClass}">
        <div class="order-header">
          <div>
            <div class="order-id">${order.id}</div>
            <div class="order-customer">👤 ${order.customer}</div>
          </div>
          <div class="order-time">
            <div class="order-pickup-time">🕐 ${formatPickupTime(order.pickupTime)} 取餐</div>
            <div class="order-created-time">${formatTime(new Date(order.createdAt))}</div>
          </div>
          <span class="order-status ${statusBadgeClass}">${statusText}</span>
        </div>
        
        <div class="order-items">
          ${order.items.map(item => `
            <div class="order-item-row">
              <span>${item.name} x${item.quantity}</span>
              <span>$${item.price * item.quantity}</span>
            </div>
          `).join('')}
        </div>

        ${order.note ? `
          <div class="order-note">
            <span class="order-note-label">備註：</span>
            ${order.note}
          </div>
        ` : ''}

        <div class="order-total">
          總計：$${order.total}
        </div>

        ${State.isAdmin && order.status === 'pending' ? `
          <div class="order-actions">
            <button class="btn btn-success" onclick="updateOrderStatus('${order.id}', 'delivered')">
              ✓ 送餐完成
            </button>
            <button class="btn btn-danger" onclick="updateOrderStatus('${order.id}', 'cancelled')">
              ✕ 取消訂單
            </button>
          </div>
        ` : ''}

        ${!State.isAdmin && order.status === 'pending' && order.customer === State.currentUser ? `
          <div class="order-actions">
            <button class="btn btn-danger" onclick="cancelMyOrder('${order.id}')">
              ✕ 取消我的訂單
            </button>
          </div>
        ` : ''}
      </div>
    `;
    }).join('');
}

async function updateOrderStatus(orderId, status) {
    // 防止重複點擊
    if (State.processingOrders.has(orderId)) return;
    State.processingOrders.add(orderId);

    // 樂觀更新：立即更新 UI
    const order = State.orders.find(o => o.id === orderId);
    if (order) {
        order.status = status;
    }
    renderOrders();

    const message = status === 'delivered' ? '訂單已標記為送餐完成！' : '訂單已取消！';
    showSuccessMessage(status === 'delivered' ? '✅' : '❌', message);

    // 背景同步到 API
    try {
        await API.updateOrderStatus(orderId, status);
    } catch (error) {
        console.error('API 更新失敗:', error);
    } finally {
        State.processingOrders.delete(orderId);
    }
}

// 顧客取消自己的訂單
async function cancelMyOrder(orderId) {
    // 防止重複點擊
    if (State.processingOrders.has(orderId)) return;

    const order = State.orders.find(o => o.id === orderId);
    if (!order) return;

    // 確認是自己的訂單
    if (order.customer !== State.currentUser) {
        alert('您只能取消自己的訂單！');
        return;
    }

    // 確認是未送餐狀態
    if (order.status !== 'pending') {
        alert('只能取消未送餐的訂單！');
        return;
    }

    if (!confirm('確定要取消這筆訂單嗎？')) return;

    State.processingOrders.add(orderId);

    // 樂觀更新：立即更新 UI
    order.status = 'cancelled';
    renderOrders();
    AudioManager.play('error');
    showSuccessMessage('❌', '您的訂單已取消！');

    // 背景同步到 API
    try {
        await API.updateOrderStatus(orderId, 'cancelled');
    } catch (error) {
        console.error('API 更新失敗:', error);
    } finally {
        State.processingOrders.delete(orderId);
    }
}

// ========================================
// 菜單管理頁面
// ========================================

async function renderMenuManagement() {
    State.categories = await API.getCategories();
    State.menu = await API.getMenu();

    renderCategoriesManagement();
    renderCategorySelects();
    renderMenuTable();
    renderMenuCardsMobile();
    renderEmojiPicker('add');
    renderEmojiPicker('edit');
}

function renderCategoriesManagement() {
    DOM.categoriesList.innerHTML = State.categories.map((cat, index) => `
    <span class="category-tag" draggable="true" data-index="${index}">
      <span class="drag-handle">☰</span>
      ${getCategoryEmoji(cat)} ${cat}
      <button class="category-tag-remove" onclick="event.stopPropagation(); deleteCategory('${cat}')">✕</button>
    </span>
  `).join('');

    initCategoryDragAndDrop();
}

function renderCategorySelects() {
    const options = State.categories.map(cat => `
    <option value="${cat}">${cat}</option>
  `).join('');

    DOM.menuCategorySelect.innerHTML = options;
    DOM.editMenuCategory.innerHTML = options;
}

function renderMenuTable() {
    DOM.menuTableBody.innerHTML = State.menu.map((item, index) => {
        const imageHtml = getItemImageHtml(item.image);
        return `
    <tr draggable="true" data-id="${item.id}" data-index="${index}">
      <td><span class="drag-handle">☰</span></td>
      <td>
        <div class="menu-table-image">${imageHtml}</div>
      </td>
      <td>${item.name}</td>
      <td>${item.category}</td>
      <td>$${item.price}</td>
      <td>
        <label class="toggle-switch">
          <input type="checkbox" ${item.enabled ? 'checked' : ''} 
                 onchange="toggleMenuItem(${item.id}, this.checked)">
          <span class="toggle-slider"></span>
        </label>
      </td>
      <td>
        <div class="menu-table-actions">
          <button class="btn btn-primary" onclick="editMenuItem(${item.id})">編輯</button>
          <button class="btn btn-danger" onclick="deleteMenuItem(${item.id})">刪除</button>
        </div>
      </td>
    </tr>
  `;
    }).join('');

    // 初始化拖曳排序
    initDragAndDrop();
}

function renderMenuCardsMobile() {
    DOM.menuCardsMobile.innerHTML = State.menu.map((item, index) => {
        const imageHtml = getItemImageHtml(item.image);
        return `
    <div class="menu-card-item" draggable="true" data-id="${item.id}" data-index="${index}">
      <span class="drag-handle">☰</span>
      <div class="item-image">${imageHtml}</div>
      <div class="item-info">
        <div class="item-name">${item.name}</div>
        <div class="item-meta">
          <span>${item.category}</span> · 
          <span class="item-price">$${item.price}</span>
        </div>
      </div>
      <div class="item-actions">
        <button class="btn btn-primary" onclick="editMenuItem(${item.id})">編輯</button>
      </div>
    </div>
  `;
    }).join('');

    // 初始化手機版拖曳排序
    initMobileDragAndDrop();
}

// ========================================
// 拖曳排序功能
// ========================================

let draggedItem = null;

function initDragAndDrop() {
    const rows = DOM.menuTableBody.querySelectorAll('tr');

    rows.forEach(row => {
        row.addEventListener('dragstart', handleDragStart);
        row.addEventListener('dragend', handleDragEnd);
        row.addEventListener('dragover', handleDragOver);
        row.addEventListener('dragenter', handleDragEnter);
        row.addEventListener('dragleave', handleDragLeave);
        row.addEventListener('drop', handleDrop);
    });
}

function initMobileDragAndDrop() {
    const cards = DOM.menuCardsMobile.querySelectorAll('.menu-card-item');

    cards.forEach(card => {
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
        card.addEventListener('drop', handleDrop);
    });
}

// 分類拖曳
function initCategoryDragAndDrop() {
    const tags = DOM.categoriesList.querySelectorAll('.category-tag');

    tags.forEach(tag => {
        tag.addEventListener('dragstart', handleCategoryDragStart);
        tag.addEventListener('dragend', handleCategoryDragEnd);
        tag.addEventListener('dragover', handleCategoryDragOver);
        tag.addEventListener('dragenter', handleCategoryDragEnter);
        tag.addEventListener('dragleave', handleCategoryDragLeave);
        tag.addEventListener('drop', handleCategoryDrop);
    });
}

function handleCategoryDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleCategoryDragEnd(e) {
    this.classList.remove('dragging');
    DOM.categoriesList.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleCategoryDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleCategoryDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleCategoryDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleCategoryDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this === draggedItem) return;

    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // 重新排序分類
    const cat = State.categories.splice(fromIndex, 1)[0];
    State.categories.splice(toIndex, 0, cat);

    // 更新排序到 API
    try {
        const success = await API.updateCategoryOrder(State.categories);

        if (success) {
            showSuccessMessage('✅', '分類順序已更新並儲存！');
        } else {
            alert('⚠️ 警告：無法同步到伺服器。您的順序已暫存在本地，但重新登入可能會遺失。請檢查網路或 GAS 部署！');
        }
    } catch (err) {
        console.error('更新排序異常:', err);
    }

    // 重新渲染相關 UI
    renderCategoriesManagement();
    renderCategorySelects();
    renderCategoryTabs();
}

function handleDragStart(e) {
    draggedItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', this.dataset.index);
}

function handleDragEnd(e) {
    this.classList.remove('dragging');
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDragEnter(e) {
    e.preventDefault();
    if (this !== draggedItem) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (this === draggedItem) return;

    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // 重新排序菜單
    const item = State.menu.splice(fromIndex, 1)[0];
    State.menu.splice(toIndex, 0, item);

    // 更新排序到 API
    await API.updateMenuOrder(State.menu.map(m => m.id));

    // 重新渲染
    renderMenuTable();
    renderMenuCardsMobile();
    renderOrderPage();

    showSuccessMessage('✅', '餐點順序已更新！');
}

// ========================================
// 菜單管理操作
// ========================================

async function handleAddCategory() {
    const input = document.getElementById('newCategoryInput');
    const category = input.value.trim();

    if (!category) return;
    if (State.categories.includes(category)) {
        alert('此分類已存在！');
        return;
    }

    AudioManager.play('click');
    await API.addCategory(category);
    State.categories.push(category);
    input.value = '';

    renderCategoriesManagement();
    renderCategorySelects();
    renderCategoryTabs();
}

async function deleteCategory(category) {
    if (!confirm(`確定要刪除分類「${category}」嗎？\n注意：此分類下的餐點不會被刪除。`)) return;

    AudioManager.play('error');
    await API.deleteCategory(category);
    State.categories = State.categories.filter(c => c !== category);

    renderCategoriesManagement();
    renderCategorySelects();
    renderCategoryTabs();
}

async function handleAddMenuItem(e) {
    e.preventDefault();

    const name = document.getElementById('menuItemName').value.trim();
    const price = parseInt(document.getElementById('menuItemPrice').value);
    const category = document.getElementById('menuCategorySelect').value;
    const image = document.getElementById('menuItemImage').value || '🍴';

    if (!name || !price || !category) {
        alert('請填寫完整資訊！');
        return;
    }

    const newItem = {
        name,
        price,
        category,
        image,
        enabled: true
    };

    AudioManager.play('click');
    const created = await API.addMenuItem(newItem);
    State.menu.push(created);

    // 清空表單
    document.getElementById('addMenuForm').reset();
    document.getElementById('menuItemImage').value = '🍴';
    renderEmojiPicker('add');

    renderMenuTable();
    renderMenuCardsMobile();
    renderOrderPage();

    showSuccessMessage('✅', `餐點「${name}」新增成功！`);
}

function editMenuItem(itemId) {
    const item = State.menu.find(m => m.id === itemId);
    if (!item) return;

    document.getElementById('editMenuId').value = item.id;
    document.getElementById('editMenuName').value = item.name;
    document.getElementById('editMenuPrice').value = item.price;
    document.getElementById('editMenuCategory').value = item.category;
    document.getElementById('editMenuImage').value = item.image || '🍴';

    renderEmojiPicker('edit');

    openModal(DOM.editMenuModal);
}

async function handleEditMenuItem(e) {
    e.preventDefault();

    const id = parseInt(document.getElementById('editMenuId').value);
    const name = document.getElementById('editMenuName').value.trim();
    const price = parseInt(document.getElementById('editMenuPrice').value);
    const category = document.getElementById('editMenuCategory').value;
    const image = document.getElementById('editMenuImage').value || '🍴';

    const item = State.menu.find(m => m.id === id);
    if (!item) return;

    item.name = name;
    item.price = price;
    item.category = category;
    item.image = image;

    AudioManager.play('click');
    await API.updateMenuItem(item);

    closeModal(DOM.editMenuModal);
    renderMenuTable();
    renderMenuCardsMobile();
    renderOrderPage();

    showSuccessMessage('✅', `餐點「${name}」已更新！`);
}

async function toggleMenuItem(itemId, enabled) {
    const item = State.menu.find(m => m.id === itemId);
    if (!item) return;

    item.enabled = enabled;
    await API.updateMenuItem(item);
    renderOrderPage();
}

async function deleteMenuItem(itemId) {
    const item = State.menu.find(m => m.id === itemId);
    if (!item) return;

    if (!confirm(`確定要刪除餐點「${item.name}」嗎？`)) return;

    AudioManager.play('error');
    await API.deleteMenuItem(itemId);
    State.menu = State.menu.filter(m => m.id !== itemId);

    renderMenuTable();
    renderMenuCardsMobile();
    renderOrderPage();

    showSuccessMessage('🗑️', `餐點「${item.name}」已刪除！`);
}

// ========================================
// 彈窗處理
// ========================================

function openModal(modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
}

function closeModal(modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
}

function showSuccessMessage(icon, text) {
    const modal = DOM.successModal;
    modal.querySelector('.success-icon').textContent = icon;
    modal.querySelector('.success-text').textContent = text;

    modal.classList.add('show');

    setTimeout(() => {
        modal.classList.remove('show');
    }, 2500);
}

// 關閉編輯彈窗
function closeEditModal() {
    AudioManager.play('click');
    closeModal(DOM.editMenuModal);
}

// 關閉結帳彈窗
function closeCheckoutModal() {
    AudioManager.play('click');
    closeModal(DOM.checkoutModal);
}
