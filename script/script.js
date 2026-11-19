// === 1. 引入 Firebase SDK（使用 v11 模組化 CDN） ===
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import {
    getFirestore,
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// 你的 Firebase 網頁應用程式設定（kskg-xmas）
const firebaseConfig = {
    apiKey: "AIzaSyBlmuvt0HNHIpHEZY_w3SUrf91-7ap2_Wg",
    authDomain: "kskg-xmas.firebaseapp.com",
    projectId: "kskg-xmas",
    storageBucket: "kskg-xmas.firebasestorage.app",
    messagingSenderId: "458088432186",
    appId: "1:458088432186:web:96a60b0f3ae3810489ab03",
    measurementId: "G-15R6388KW6"
};

// 初始化 Firebase 與 Analytics
const app = initializeApp(firebaseConfig);
try {
    getAnalytics(app);
} catch (err) {
    // 若瀏覽器阻擋分析腳本，不影響核心留言板運作
}

const db = getFirestore(app);
const wishesCollection = collection(db, "wishes");

// === 2. 狀態變數設定 ===
const ADMIN_PASSWORD = "676767"; // 管理員密碼（可自行修改）
const ITEMS_PER_PAGE = 6;      // 每頁顯示 6 張紙卡（2 條長線 × 每條 3 張）

let wishes = [];
let currentPage = 1;
let searchKeyword = "";
let isAdminMode = false;
let editingWishId = null;

// === 3. 取得 DOM 元素 ===
const wishLinesContainer = document.getElementById('wish-lines-container');
const paginationBar = document.getElementById('pagination-bar');
const searchInput = document.getElementById('search-input');

const openWriteBtn = document.getElementById('open-write-btn');
const closeWriteBtn = document.getElementById('close-write-btn');
const writeModal = document.getElementById('write-modal');
const wishForm = document.getElementById('wish-form');
const wishAuthorInput = document.getElementById('wish-author-input');
const wishContentInput = document.getElementById('wish-content-input');

const adminLockBtn = document.getElementById('admin-lock-btn');
const adminModal = document.getElementById('admin-modal');
const closeAdminBtn = document.getElementById('close-admin-btn');
const adminLoginForm = document.getElementById('admin-login-form');
const adminPwdInput = document.getElementById('admin-pwd-input');
const pwdErrorMsg = document.getElementById('pwd-error-msg');

const editModal = document.getElementById('edit-modal');
const closeEditBtn = document.getElementById('close-edit-btn');
const editForm = document.getElementById('edit-form');
const editAuthorInput = document.getElementById('edit-author-input');
const editContentInput = document.getElementById('edit-content-input');

// === 4. 即時監聽雲端資料庫（任何裝置新增、編輯、刪除都會自動更新） ===
const wishesQuery = query(wishesCollection, orderBy("createdAt", "desc"));

onSnapshot(wishesQuery, (snapshot) => {
    wishes = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
    }));
    renderApp();
}, (error) => {
    console.error("讀取雲端願望失敗：", error);
    wishLinesContainer.innerHTML = `<p class="empty-message">⚠️ 無法連線至雲端星光資料庫，請確認 Firestore Database 是否已建立並設為測試模式。</p>`;
});

// === 5. 核心畫面渲染函式 ===
function renderApp() {
    const filteredWishes = wishes.filter(wish => {
        const keyword = searchKeyword.toLowerCase();
        const content = (wish.content || "").toLowerCase();
        const author = (wish.author || "").toLowerCase();
        return content.includes(keyword) || author.includes(keyword);
    });

    const totalPages = Math.ceil(filteredWishes.length / ITEMS_PER_PAGE) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentWishes = filteredWishes.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    renderWishLines(currentWishes);
    renderPagination(totalPages, filteredWishes.length);
}

function renderWishLines(items) {
    wishLinesContainer.innerHTML = "";

    if (items.length === 0) {
        wishLinesContainer.innerHTML = `<p class="empty-message">✨ 這片星空中暫時找不到相關的願望，快來掛上第一張吧！</p>`;
        return;
    }

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
            const tiltClass = (rowIndex + cardIndex) % 2 === 0 ? 'tilt-left' : 'tilt-right';
            card.className = `paper-card ${tiltClass}`;

            const safeContent = escapeHTML(wish.content || "");
            const safeAuthor = escapeHTML(wish.author || "匿名星光");

            const adminControlsHTML = isAdminMode ? `
                <div class="admin-actions">
                    <button class="admin-action-btn edit-btn" data-action="edit" data-id="${wish.id}" title="編輯此留言">✎</button>
                    <button class="admin-action-btn delete-btn" data-action="delete" data-id="${wish.id}" title="刪除此留言">✕</button>
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

// 使用事件委派處理卡片上的編輯與刪除按鈕
wishLinesContainer.addEventListener('click', async (e) => {
    const btn = e.target.closest('.admin-action-btn');
    if (!btn || !isAdminMode) return;

    const action = btn.dataset.action;
    const id = btn.dataset.id;

    if (action === "delete") {
        if (confirm("確定要從星夜長線上取下並刪除這則願望嗎？")) {
            try {
                await deleteDoc(doc(db, "wishes", id));
            } catch (err) {
                alert("刪除失敗，請稍後再試。");
                console.error(err);
            }
        }
    } else if (action === "edit") {
        const targetWish = wishes.find(w => w.id === id);
        if (!targetWish) return;
        editingWishId = id;
        editAuthorInput.value = targetWish.author || "";
        editContentInput.value = targetWish.content || "";
        editModal.classList.remove('hidden');
    }
});

function renderPagination(totalPages, totalItems) {
    paginationBar.innerHTML = "";
    if (totalItems === 0) return;

    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '&lt;';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        currentPage--;
        renderApp();
    });
    paginationBar.appendChild(prevBtn);

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

// === 6. 搜尋與新增願望 ===
searchInput.addEventListener('input', (e) => {
    searchKeyword = e.target.value.trim();
    currentPage = 1;
    renderApp();
});

openWriteBtn.addEventListener('click', () => {
    wishForm.reset();
    writeModal.classList.remove('hidden');
});

closeWriteBtn.addEventListener('click', () => {
    writeModal.classList.add('hidden');
});

wishForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const author = wishAuthorInput.value.trim() || "匿名星光";
    const content = wishContentInput.value.trim();
    if (!content) return;

    try {
        await addDoc(wishesCollection, {
            author: author,
            content: content,
            createdAt: serverTimestamp()
        });

        searchKeyword = "";
        searchInput.value = "";
        currentPage = 1;
        writeModal.classList.add('hidden');
    } catch (err) {
        alert("送出願望時發生錯誤，請檢查網路或 Firebase 設定。");
        console.error(err);
    }
});

// === 7. 管理員模式（密碼驗證、編輯儲存） ===
adminLockBtn.addEventListener('click', () => {
    if (!isAdminMode) {
        adminLoginForm.reset();
        pwdErrorMsg.classList.add('hidden');
        adminModal.classList.remove('hidden');
        adminPwdInput.focus();
    } else {
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

closeEditBtn.addEventListener('click', () => {
    editModal.classList.add('hidden');
});

editForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!editingWishId) return;

    const updatedAuthor = editAuthorInput.value.trim() || "匿名星光";
    const updatedContent = editContentInput.value.trim();

    try {
        await updateDoc(doc(db, "wishes", editingWishId), {
            author: updatedAuthor,
            content: updatedContent
        });
        editModal.classList.add('hidden');
        editingWishId = null;
    } catch (err) {
        alert("儲存修改失敗，請稍後再試。");
        console.error(err);
    }
});

// 點擊彈窗外部關閉
[writeModal, adminModal, editModal].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
});

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
         
