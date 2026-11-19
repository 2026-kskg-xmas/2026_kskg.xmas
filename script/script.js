// === 1. 預設示範資料（共 14 筆，方便展示 3 頁分頁效果） ===
const DEFAULT_WISHES = [
    { id: 1, author: "小麥", content: "希望期末資訊專題能夠順利拿到高分，所有功能都一次跑通！" },
    { id: 2, author: "Alice", content: "Wishing everyone a peaceful and warm Christmas season!" },
    { id: 3, author: "匿名星光", content: "願家人與朋友在新的一年都健康平安、事事順心。" },
    { id: 4, author: "Bob", content: "Hope to pass all my finals without staying up too late!" },
    { id: 5, author: "聖誕小精靈", content: "每天都要開開心心，把所有的煩惱都留在今年！" },
    { id: 6, author: "StarGazer", content: "Peace on Earth, goodwill to all under this starry sky." },
    { id: 7, author: "夜空旅人", content: "希望明年能去夢寐以求的城市旅行，看看不同的風景。" },
    { id: 8, author: "Chloe", content: "May your days be merry and bright!" },
    { id: 9, author: "高二追夢人", content: "希望每次段考都能穩穩發揮，離理想的目標越來越近。" },
    { id: 10, author: "冬日暖陽", content: "即使在最冷的冬天，心裡也要保有溫暖的光。" },
    { id: 11, author: "Lucas", content: "Sending warm hugs to everyone who feels lonely tonight." },
    { id: 12, author: "熱音鍵盤手", content: "希望下次社團成發演出大成功，大家一起嗨翻全場！" },
    { id: 13, author: "流星許願者", content: "願世界少一點紛爭，多一點理解與溫柔。" },
    { id: 14, author: "麋鹿先生", content: "Merry Christmas! 祝看到這張卡片的你每天都有好心情！" }
];

// === 2. 狀態變數設定 ===
const STORAGE_KEY = "hang_a_wish_data_v1";
const ADMIN_PASSWORD = "1234"; // 管理員密碼
const ITEMS_PER_PAGE = 6;      // 每頁顯示 6 張紙卡（分為 2 條線，每條 3 張）

let wishes = loadWishes();
let currentPage = 1;
let searchKeyword = "";
let isAdminMode = false;
let editingWishId = null;

// === 3. 取得 DOM 元素 ===
const wishLinesContainer = document.getElementById('wish-lines-container');
const paginationBar = document.getElementById('pagination-bar');
const searchInput = document.getElementById('search-input');

// 寫下願望彈窗元素
const openWriteBtn = document.getElementById('open-write-btn');
const closeWriteBtn = document.getElementById('close-write-btn');
const writeModal = document.getElementById('write-modal');
const wishForm = document.getElementById('wish-form');
const wishAuthorInput = document.getElementById('wish-author-input');
const wishContentInput = document.getElementById('wish-content-input');

// 管理員登入彈窗元素
const adminLockBtn = document.getElementById('admin-lock-btn');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPwdInput = document.getElementById('admin-pwd-input');
const pwdErrorMsg = document.getElementById('pwd-error-msg');

// 管理員編輯彈窗元素
const editModal = document.getElementById('edit-modal');
const closeEditBtn = document.getElementById('close-edit-btn');
const editForm = document.getElementById('edit-form');
const editAuthorInput = document.getElementById('edit-author-input');
const editContentInput = document.getElementById('edit-content-input');

// === 4. 資料儲存與讀取（LocalStorage） ===
function loadWishes() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        return JSON.parse(saved);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_WISHES));
    return [...DEFAULT_WISHES];
}

function saveWishes() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(wishes));
}

// === 5. 核心畫面渲染函式 ===
function renderApp() {
    // 1) 根據搜尋關鍵字過濾資料
    const filteredWishes = wishes.filter(wish => {
        const keyword = searchKeyword.toLowerCase();
        return wish.content.toLowerCase().includes(keyword) || 
               wish.author.toLowerCase().includes(keyword);
    });

    // 2) 計算總頁數並修正目前頁碼
    const totalPages = Math.ceil(filteredWishes.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // 3) 取出當前頁面的 6 筆資料
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentWishes = filteredWishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // 4) 渲染長線與紙卡
    renderWishLines(currentWishes);

    // 5) 渲染分頁按鈕
    renderPagination(totalPages, filteredWishes.length);
}

function renderWishLines(items) {
    wishLinesContainer.innerHTML = "";

    // 若沒有任何資料（例如搜尋不到結果）
    if (items.length === 0) {
        wishLinesContainer.innerHTML = `<p class="empty-message">✨ 這片星空中暫時找不到相關的願望，試試其他關鍵字吧！</p>`;
        return;
    }

    // 將當前頁面的卡片分成兩排（每條長線最多 3 張）
    const rows = [
        items.slice(0, 3),
        items.slice(3, 6)
    ];

    rows.forEach((rowItems, rowIndex) => {
        if (rowItems.length === 0) return;

        const ropeRow = document.createElement('section');
        ropeRow.className = 'rope-row';

        const ropeLine = document.createElement('div');
        ropeLine.className = 'rope-line';
        ropeRow.appendChild(ropeLine);

        const cardsWrapper = document.createElement('div');
        cardsWrapper.className = 'cards-wrapper';

        rowItems.forEach((wish, cardIndex) => {
            const card = document.createElement('article');
            // 交錯加上向左或向右微傾斜效果
            const tiltClass = (rowIndex + cardIndex) % 2 === 0 ? 'tilt-left' : 'tilt-right';
            card.className = `paper-card ${tiltClass}`;

            // 安全跳脫 HTML 字元，防止 XSS 攻擊
            const safeContent = escapeHTML(wish.content);
            const safeAuthor = escapeHTML(wish.author);

            // 若處於管理員模式，顯示「編輯」與「刪除」按鈕
            const adminControlsHTML = isAdminMode ? `
                <div class="admin-actions">
                    <button class="admin-action-btn edit-btn" onclick="openEditModal(${wish.id})" title="編輯此留言">✎</button>
                    <button class="admin-action-btn delete-btn" onclick="deleteWish(${wish.id})" title="刪除此留言">✕</button>
                </div>
            ` : "";

            card.innerHTML = `
                <div class="wooden-clip"></div>
                ${adminControlsHTML}
                <p class="wish-content">${safeContent}</p>
                <span class="wish-author">— ${safeAuthor}</span>
            `;

            cardsWrapper.appendChild(card);
        });

        ropeRow.appendChild(cardsWrapper);
        wishLinesContainer.appendChild(ropeRow);
    });
}

function renderPagination(totalPages, totalItems) {
    paginationBar.innerHTML = "";
    if (totalItems === 0) return;

    // 上一頁按鈕
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        currentPage--;
        renderApp();
    });
    paginationBar.appendChild(prevBtn);

    // 頁碼數字按鈕
    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
        pageBtn.textContent = i;
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderApp();
        });
        paginationBar.appendChild(pageBtn);
    }

    // 下一頁按鈕
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '&gt;';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        currentPage++;
        renderApp();
    });
    paginationBar.appendChild(nextBtn);
}

// === 6. 事件監聽：搜尋、新增願望 ===
searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim();
    currentPage = 1; // 搜尋時自動回到第 1 頁
    renderApp();
});

openWriteBtn.addEventListener('click', () => {
    wishForm.reset();
    writeModal.classList.remove('hidden');
});

closeWriteBtn.addEventListener('click', () => {
    writeModal.classList.add('hidden');
});

wishForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const author = wishAuthorInput.value.trim() || "匿名星光";
    const content = wishContentInput.value.trim();

    if (!content) return;

    // 建立新願望並放到陣列最前面（最新掛上的願望出現在第 1 頁第一張）
    const newWish = {
        id: Date.now(),
        author: author,
        content: content
    };

    wishes.unshift(newWish);
    saveWishes();

    // 清空搜尋並跳回第 1 頁，讓使用者立刻看到自己剛掛上去的紙卡
    searchKeyword = "";
    searchInput.value = "";
    currentPage = 1;
    
    writeModal.classList.add('hidden');
    renderApp();
});

// === 7. 事件監聽：管理員模式（鎖頭驗證、編輯、刪除） ===
adminLockBtn.addEventListener('click', () => {
    if (!isAdminMode) {
        adminLoginForm.reset();
        pwdErrorMsg.classList.add('hidden');
        adminModal.classList.remove('hidden');
        adminPwdInput.focus();
    } else {
        // 退出管理員模式
        isAdminMode = false;
        adminLockBtn.classList.remove('unlocked');
        renderApp();
    }
});

closeAdminBtn.addEventListener('click', () => {
    adminModal.classList.add('hidden');
});

adminLoginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (adminPwdInput.value === ADMIN_PASSWORD) {
        isAdminMode = true;
        adminModal.classList.add('hidden');
        adminLockBtn.classList.add('unlocked');
        renderApp();
    } else {
        pwdErrorMsg.classList.remove('hidden');
    }
});

// 刪除留言功能（供紙卡上的 ✕ 按鈕呼叫）
window.deleteWish = function(id) {
    if (confirm("確定要從星夜長線上取下並刪除這則願望嗎？")) {
        wishes = wishes.filter(wish => wish.id !== id);
        saveWishes();
        renderApp();
    }
};

// 開啟編輯留言視窗（供紙卡上的 ✎ 按鈕呼叫）
window.openEditModal = function(id) {
    const targetWish = wishes.find(wish => wish.id === id);
    if (!targetWish) return;

    editingWishId = id;
    editAuthorInput.value = targetWish.author;
    editContentInput.value = targetWish.content;
    editModal.classList.remove('hidden');
};

closeEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const targetIndex = wishes.findIndex(wish => wish.id === editingWishId);
    if (targetIndex !== -1) {
        wishes[targetIndex].author = editAuthorInput.value.trim() || "匿名星光";
        wishes[targetIndex].content = editContentInput.value.trim();
        saveWishes();
        renderApp();
    }
    editModal.classList.add('hidden');
});

// 點擊彈窗外部背景時關閉彈窗
[writeModal, adminModal, editModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

// === 8. 輔助函式：防止 HTML 標籤注入 ===
function escapeHTML(str) {
    return str.replace(/[&<>"']/g, function(match) {
        const escapeMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return escapeMap[match];
    });
}

// 網頁載入完成時執行首次渲染
renderApp();
