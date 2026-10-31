/**
 * app.js - Logic điều khiển toàn bộ ứng dụng web CoiPhim
 */

// Trạng thái ứng dụng
let currentCategory = "all";
let currentSearch = "";
let currentSort = "default";
let currentRankingPeriod = "today"; // today, month, season
let activeMovieId = null;
let currentRatingValue = 5; // Giá trị sao được chọn mặc định
let currentPage = 1; // Trang hiện tại
const MOVIES_PER_PAGE = 12; // Hiển thị 12 phim / trang theo yêu cầu mới

// ==========================================================================
// 1. MÀN HÌNH CHUYỂN CẢNH (SPLASH SCREEN)
// ==========================================================================
function initSplashScreen() {
    if (window.hidePageLoading) {
        window.hidePageLoading(350);
        return;
    }
    const splashScreen = document.getElementById("splash-screen");
    if (!splashScreen) return;
    setTimeout(() => {
        splashScreen.classList.add("fade-out");
    }, 350);
}

// ==========================================================================
// 2. CHẾ ĐỘ SÁNG / TỐI (DARK / LIGHT THEME)
// ==========================================================================
function initTheme() {
    const savedTheme = localStorage.getItem("coiphim_theme") || "dark";
    setTheme(savedTheme, false);

    const themeToggleBtn = document.getElementById("theme-toggle-btn");
    if (themeToggleBtn) {
        themeToggleBtn.addEventListener("click", () => {
            const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
            const newTheme = currentTheme === "dark" ? "light" : "dark";
            setTheme(newTheme, true);
        });
    }
}

function setTheme(theme, notify = false) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("coiphim_theme", theme);

    const themeIcon = document.getElementById("theme-icon");
    if (themeIcon) {
        if (theme === "dark") {
            themeIcon.className = "fa-solid fa-sun";
            themeIcon.title = "Chuyển sang Chế độ Sáng";
        } else {
            themeIcon.className = "fa-solid fa-moon";
            themeIcon.title = "Chuyển sang Chế độ Tối";
        }
    }

    if (notify) {
        showToast(`Đã chuyển sang giao diện ${theme === "dark" ? "Tối" : "Sáng"}`, "info");
    }
}

// ==========================================================================
// 3. CẬP NHẬT GIAO DIỆN HEADER & AUTH STATE
// ==========================================================================
function updateHeaderAuthUI() {
    const user = getCurrentUser();
    const btnOpenLogin = document.getElementById("btn-open-login");
    const userProfileMenu = document.getElementById("user-profile-menu");
    const btnAdminNav = document.getElementById("btn-admin-nav");
    const headerUserAvatar = document.getElementById("header-user-avatar");
    const headerUserName = document.getElementById("header-user-name");
    const headerUserRole = document.getElementById("header-user-role");
    const dropdownAdminItem = document.getElementById("dropdown-admin-item");
    const dropdownAdminDivider = document.getElementById("dropdown-admin-divider");

    if (user) {
        // Đã đăng nhập
        if (btnOpenLogin) btnOpenLogin.style.display = "none";
        if (userProfileMenu) userProfileMenu.style.display = "block";

        if (headerUserAvatar) headerUserAvatar.src = user.avatar;
        if (headerUserName) headerUserName.textContent = user.fullName || user.username;

        if (headerUserRole) {
            if (user.role === "admin") {
                headerUserRole.textContent = "Admin";
                headerUserRole.className = "user-role-badge role-admin";
            } else {
                headerUserRole.textContent = "Thành viên";
                headerUserRole.className = "user-role-badge role-user";
            }
        }

        // Kiểm tra quyền Admin
        if (user.role === "admin") {
            if (btnAdminNav) btnAdminNav.style.display = "inline-flex";
            if (dropdownAdminItem) dropdownAdminItem.style.display = "flex";
            if (dropdownAdminDivider) dropdownAdminDivider.style.display = "block";
        } else {
            if (btnAdminNav) btnAdminNav.style.display = "none";
            if (dropdownAdminItem) dropdownAdminItem.style.display = "none";
            if (dropdownAdminDivider) dropdownAdminDivider.style.display = "none";
        }
    } else {
        // Khách vãng lai (Chưa đăng nhập)
        if (btnOpenLogin) btnOpenLogin.style.display = "inline-flex";
        if (userProfileMenu) userProfileMenu.style.display = "none";
        if (btnAdminNav) btnAdminNav.style.display = "none";
        if (dropdownAdminItem) dropdownAdminItem.style.display = "none";
        if (dropdownAdminDivider) dropdownAdminDivider.style.display = "none";
    }

    // Đồng bộ trạng thái đăng nhập cho Trợ lý AI The Watcher
    if (typeof window.updateWatcherAuthState === "function") {
        window.updateWatcherAuthState();
    }

    // Đồng bộ trạng thái đăng nhập cho Mobile Drawer
    if (typeof window.updateMobileDrawerAuth === "function") {
        window.updateMobileDrawerAuth();
    }
}

// ==========================================================================
// 4. BANNER CHÍNH: CHUYỂN TIẾP TOP 10 LƯỢT XEM TRONG NGÀY (2.5 GIÂY/SLIDE)
//    & BANNER PHỤ: CHUYỂN TIẾP NGẪU NHIÊN CÁC PHIM TRONG CƠ SỞ DỮ LIỆU (2.5 GIÂY)
// ==========================================================================
let heroTop10Movies = [];
let heroCurrentIndex = 0;
let heroSliderTimer = null;
let heroIsPlaying = true;

// Khởi tạo hoặc cập nhật Slider Top 10 trong ngày
function renderHero() {
    initHeroTop10Slider();
}

function initHeroTop10Slider() {
    const movies = getMovies();
    if (!movies || movies.length === 0) return;

    // Sắp xếp theo lượt xem trong ngày (viewsToday) giảm dần và lấy Top 10
    heroTop10Movies = [...movies]
        .sort((a, b) => (b.viewsToday || 0) - (a.viewsToday || 0))
        .slice(0, 10);

    if (heroTop10Movies.length === 0) return;

    // Đảm bảo chỉ mục không vượt quá số lượng
    if (heroCurrentIndex >= heroTop10Movies.length) {
        heroCurrentIndex = 0;
    }

    // Hiển thị slide hiện tại
    renderHeroSlide(heroCurrentIndex);

    // Bắt đầu chu trình tự động chuyển mỗi 2.5 giây (2500ms)
    startHeroSlider();
}

function renderHeroSlide(index) {
    if (!heroTop10Movies || heroTop10Movies.length === 0) return;
    const movie = heroTop10Movies[index];
    if (!movie) return;

    const heroBanner = document.getElementById("hero-banner");
    const heroContentBox = document.getElementById("hero-content-box");
    const heroRankBadge = document.getElementById("hero-rank-badge");
    const heroTitle = document.getElementById("hero-title");
    const heroQuality = document.getElementById("hero-quality");
    const heroCategory = document.getElementById("hero-category");
    const heroRating = document.getElementById("hero-rating");
    const heroYear = document.getElementById("hero-year");
    const heroDuration = document.getElementById("hero-duration");
    const heroViews = document.getElementById("hero-views");
    const heroDescription = document.getElementById("hero-description");
    const heroWatchBtn = document.getElementById("hero-watch-btn");
    const heroInfoBtn = document.getElementById("hero-info-btn");

    // Hiệu ứng mượt mà khi đổi slide
    if (heroContentBox) {
        heroContentBox.classList.add("slide-change");
        setTimeout(() => {
            heroContentBox.classList.remove("slide-change");
        }, 180);
    }

    // Cập nhật background banner
    if (heroBanner && (movie.banner || movie.poster)) {
        heroBanner.style.backgroundImage = `url('${movie.banner || movie.poster}')`;
    }

    // Cập nhật Badge thứ hạng trong ngày
    if (heroRankBadge) {
        // Biểu tượng nổi bật màu vàng ánh kim rực rỡ, cân đối hoàn hảo chính giữa
        let iconHtml = `<i class="fa-solid fa-fire" style="color: #facc15; text-shadow: 0 0 8px rgba(250, 204, 21, 0.6);"></i>`;
        if (index === 0) {
            iconHtml = `<i class="fa-solid fa-crown" style="color: #facc15; text-shadow: 0 0 8px rgba(250, 204, 21, 0.6);"></i>`;
        }

        heroRankBadge.innerHTML = `${iconHtml}<span>Top ${index + 1} Hôm Nay</span>`;
    }

    if (heroTitle) heroTitle.textContent = movie.title;
    if (heroQuality) heroQuality.textContent = movie.quality;
    if (heroCategory) heroCategory.textContent = movie.categoryName;
    if (heroRating) heroRating.textContent = movie.rating.toFixed(1);
    if (heroYear) heroYear.textContent = movie.year;
    if (heroDuration) heroDuration.textContent = movie.duration;
    if (heroViews) heroViews.textContent = (movie.viewsToday || 0).toLocaleString("vi-VN");
    if (heroDescription) heroDescription.textContent = movie.description;

    // Gán nút xem phim chuyển thẳng tới trang xem phim watch.html
    if (heroWatchBtn) {
        heroWatchBtn.onclick = () => {
            if (window.navigateToPage) {
                window.navigateToPage(`watch.html?id=${movie.id}`, "Đang tải vui lòng chờ");
            } else {
                window.location.href = `watch.html?id=${movie.id}`;
            }
        };
    }
    if (heroInfoBtn) {
        heroInfoBtn.onclick = () => openMovieDetailModal(movie.id);
    }
}

function startHeroSlider() {
    stopHeroSlider();
    heroIsPlaying = true;

    // Tự động chuyển slide sau mỗi 2.5 giây (2500ms)
    heroSliderTimer = setInterval(() => {
        nextHeroSlide();
    }, 2500);
}

function stopHeroSlider() {
    if (heroSliderTimer) {
        clearInterval(heroSliderTimer);
        heroSliderTimer = null;
    }
    heroIsPlaying = false;
}

function nextHeroSlide() {
    if (heroTop10Movies.length === 0) return;
    heroCurrentIndex = (heroCurrentIndex + 1) % heroTop10Movies.length;
    renderHeroSlide(heroCurrentIndex);
}

function prevHeroSlide() {
    if (heroTop10Movies.length === 0) return;
    heroCurrentIndex = (heroCurrentIndex - 1 + heroTop10Movies.length) % heroTop10Movies.length;
    renderHeroSlide(heroCurrentIndex);
}

// ==========================================================================
// 4.2. BANNER PHỤ: CHUYỂN TIẾP NGẪU NHIÊN CÁC PHIM TRONG CƠ SỞ DỮ LIỆU (2.5 GIÂY)
// ==========================================================================
let subBannerTimer = null;
let currentRandomMovieId = null;

function initSubBannerRandom() {
    // Chạy ngẫu nhiên lần đầu
    rollRandomSubMovie();

    // Tự động chuyển ngẫu nhiên liên tiếp sau mỗi 2.5 giây (2500ms)
    if (subBannerTimer) clearInterval(subBannerTimer);
    subBannerTimer = setInterval(() => {
        rollRandomSubMovie();
    }, 2500);

    // Gán nút đổi ngẫu nhiên thủ công
    const btnRoll = document.getElementById("btn-sub-roll");
    if (btnRoll) {
        btnRoll.onclick = (e) => {
            e.stopPropagation();
            rollRandomSubMovie(true);
            // Reset nhịp chuyển ngẫu nhiên 2.5s
            clearInterval(subBannerTimer);
            subBannerTimer = setInterval(rollRandomSubMovie, 2500);
        };
    }
}

function rollRandomSubMovie(isManual = false) {
    const movies = getMovies();
    if (!movies || movies.length === 0) return;

    // Chọn ngẫu nhiên 1 phim khác với phim hiện tại
    const candidates = movies.filter(m => m.id !== currentRandomMovieId);
    const pool = candidates.length > 0 ? candidates : movies;
    const randomIndex = Math.floor(Math.random() * pool.length);
    const movie = pool[randomIndex];

    currentRandomMovieId = movie.id;

    const card = document.getElementById("sub-banner-card");
    const posterEl = document.getElementById("sub-banner-poster");
    const catEl = document.getElementById("sub-banner-category");
    const yearEl = document.getElementById("sub-banner-year");
    const ratingEl = document.getElementById("sub-banner-rating");
    const titleEl = document.getElementById("sub-banner-title");
    const descEl = document.getElementById("sub-banner-desc");
    const btnWatch = document.getElementById("btn-sub-watch");
    const diceIcon = document.getElementById("sub-banner-dice-icon");

    // Hiệu ứng xúc xắc xoay
    if (diceIcon) {
        diceIcon.classList.remove("rolling");
        void diceIcon.offsetWidth;
        diceIcon.classList.add("rolling");
    }

    // Hiệu ứng animation card
    if (card) {
        card.classList.remove("shuffle-anim");
        void card.offsetWidth;
        card.classList.add("shuffle-anim");
    }

    // Cập nhật thông tin phim ngẫu nhiên
    if (posterEl) posterEl.src = movie.poster;
    if (catEl) catEl.textContent = movie.categoryName;
    if (yearEl) yearEl.textContent = movie.year;
    if (ratingEl) ratingEl.textContent = movie.rating.toFixed(1);
    if (titleEl) titleEl.textContent = movie.title;
    if (descEl) descEl.textContent = movie.description;

    // Click xem phim
    if (card) {
        card.onclick = () => openMovieDetailModal(movie.id);
    }
    if (btnWatch) {
        btnWatch.onclick = (e) => {
            e.stopPropagation();
            window.location.href = `watch.html?id=${movie.id}`;
        };
    }
}

// ==========================================================================
// 5. BẢNG XẾP HẠNG PHIM THEO LƯỢT XEM (NGÀY, THÁNG, MÙA)
// ==========================================================================
function renderRanking(period = currentRankingPeriod) {
    currentRankingPeriod = period;
    const movies = [...getMovies()];

    // Xác định trường dữ liệu lượt xem theo thời gian
    let viewKey = "viewsToday";
    let periodText = "hôm nay";
    if (period === "month") {
        viewKey = "viewsMonth";
        periodText = "tháng này";
    } else if (period === "season") {
        viewKey = "viewsSeason";
        periodText = "mùa này";
    }

    // Sắp xếp giảm dần theo lượt xem
    movies.sort((a, b) => (b[viewKey] || 0) - (a[viewKey] || 0));

    // Cập nhật trạng thái active cho tab nút bấm
    document.querySelectorAll(".ranking-tab-btn").forEach(btn => {
        if (btn.getAttribute("data-period") === period) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Render Top 3
    const top3Grid = document.getElementById("ranking-top3-grid");
    if (top3Grid) {
        const top3Movies = movies.slice(0, 3);
        top3Grid.innerHTML = top3Movies.map((movie, index) => {
            const rankNum = index + 1;
            const rankClass = `rank-${rankNum}`;
            const viewsFormatted = (movie[viewKey] || 0).toLocaleString("vi-VN");

            return `
                <div class="top3-card ${rankClass}" onclick="openMoviePlayer('${movie.id}')">
                    <span class="top-badge-number">#${rankNum}</span>
                    <img src="${movie.poster}" alt="${movie.title}" class="top3-poster" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                    <div class="top3-info">
                        <h4 class="top3-title" title="${movie.title}">${movie.title}</h4>
                        <div class="top3-category"><i class="fa-solid fa-tags"></i> ${movie.categoryName}</div>
                        <div class="top3-views">
                            <i class="fa-solid fa-eye"></i> ${viewsFormatted} xem
                        </div>
                    </div>
                </div>
            `;
        }).join("");
    }

    // Render Rank 4 đến 10
    const restList = document.getElementById("ranking-rest-list");
    if (restList) {
        const restMovies = movies.slice(3, 10);
        restList.innerHTML = restMovies.map((movie, index) => {
            const rankNum = index + 4;
            const viewsFormatted = (movie[viewKey] || 0).toLocaleString("vi-VN");

            return `
                <div class="rank-row-item" onclick="openMoviePlayer('${movie.id}')">
                    <div class="rank-row-num">${rankNum}</div>
                    <img src="${movie.poster}" alt="${movie.title}" class="rank-row-poster" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                    <div class="rank-row-details">
                        <div class="rank-row-title" title="${movie.title}">${movie.title}</div>
                        <div class="rank-row-views">${viewsFormatted} lượt xem</div>
                    </div>
                </div>
            `;
        }).join("");
    }
}

// Chuyển đổi tab xếp hạng
function switchRankingPeriod(period) {
    renderRanking(period);
}

// ==========================================================================
// 6. BỘ LỌC THỂ LOẠI (HEADER FILTER DROPDOWN)
// ==========================================================================
const CATEGORY_ICONS = {
    "all": "fa-solid fa-layer-group",
    "action": "fa-solid fa-fire",
    "sci-fi": "fa-solid fa-rocket",
    "romance": "fa-solid fa-heart",
    "horror": "fa-solid fa-ghost",
    "animation": "fa-solid fa-wand-magic-sparkles",
    "comedy": "fa-solid fa-face-laugh-squint",
    "period": "fa-solid fa-scroll",
    "thriller": "fa-solid fa-masks-theater"
};

function renderHeaderFilter() {
    const categories = getCategories();
    const dropdown = document.getElementById("header-filter-dropdown");
    const labelEl = document.getElementById("header-filter-label");
    const filterBtn = document.getElementById("header-filter-btn");
    const filterWrap = document.getElementById("header-filter-wrap");

    // Cập nhật nhãn của mục Thể Loại trên header (đồng bộ với Bảng Xếp Hạng & Danh Sách Phim)
    const activeCat = categories.find(c => c.id === currentCategory);
    if (labelEl) {
        if (currentCategory === "all" || !activeCat) {
            labelEl.textContent = "Thể Loại";
            if (filterBtn) filterBtn.classList.remove("active");
            if (filterWrap) filterWrap.classList.remove("active");
        } else {
            labelEl.textContent = `${activeCat.name}`;
            if (filterBtn) filterBtn.classList.add("active");
            if (filterWrap) filterWrap.classList.add("active");
        }
    }

    if (!dropdown) return;

    dropdown.innerHTML = `
        <div class="dropdown-category-header">
            <span class="dropdown-category-title">
                <i class="fa-solid fa-shapes"></i> Thể Loại Phim
            </span>
            <span class="dropdown-category-count">${categories.length} thể loại</span>
        </div>
        <div class="dropdown-category-grid">
            ${categories.map(cat => {
                const isActive = cat.id === currentCategory;
                const iconClass = CATEGORY_ICONS[cat.id] || "fa-solid fa-film";

                return `
                    <button class="header-filter-item ${isActive ? 'active' : ''}" type="button" onclick="filterByCategory('${cat.id}')">
                        <i class="${iconClass}"></i>
                        <span>${cat.name}</span>
                        ${isActive ? '<i class="fa-solid fa-check header-filter-item-check"></i>' : ''}
                    </button>
                `;
            }).join("")}
        </div>
    `;
}

// Giữ lại hàm renderCategoryPills để tương thích với các hàm admin
function renderCategoryPills() {
    renderHeaderFilter();
}

function filterByCategory(categoryId) {
    currentCategory = categoryId;
    currentPage = 1; // Reset về trang 1 khi chuyển thể loại
    renderHeaderFilter();
    renderMoviesGrid();

    // Đóng dropdown sau khi chọn
    const wrap = document.getElementById("header-filter-wrap");
    if (wrap) wrap.classList.remove("open");

    // Cuộn nhẹ tới danh sách phim
    const catalogSection = document.getElementById("catalog-section");
    if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: "smooth" });
    }
}

// ==========================================================================
// 7. LƯỚI PHIM (MOVIE GRID) & TÌM KIẾM & PHÂN TRANG (10 PHIM / TRANG)
// ==========================================================================
function renderMoviesGrid() {
    let movies = [...getMovies()];
    const grid = document.getElementById("movies-grid");
    const countEl = document.getElementById("catalog-count");
    if (!grid) return;

    // Lọc theo thể loại
    if (currentCategory !== "all") {
        movies = movies.filter(m => m.category === currentCategory);
    }

    // Lọc theo từ khóa tìm kiếm (search realtime)
    if (currentSearch.trim() !== "") {
        const term = currentSearch.trim().toLowerCase();
        movies = movies.filter(m => 
            m.title.toLowerCase().includes(term) ||
            (m.originalTitle && m.originalTitle.toLowerCase().includes(term)) ||
            (m.actors && m.actors.toLowerCase().includes(term)) ||
            (m.director && m.director.toLowerCase().includes(term))
        );
    }

    // Sắp xếp
    if (currentSort === "views") {
        movies.sort((a, b) => (b.viewsToday || 0) - (a.viewsToday || 0));
    } else if (currentSort === "rating") {
        movies.sort((a, b) => b.rating - a.rating);
    } else if (currentSort === "newest") {
        movies.sort((a, b) => b.year - a.year);
    }

    // Tính toán phân trang: hiển thị 12 phim / trang
    const totalFiltered = movies.length;
    const totalPages = Math.ceil(totalFiltered / MOVIES_PER_PAGE) || 1;

    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    // Đã loại bỏ phần chú thích số lượng phim và vị trí trang theo yêu cầu
    if (countEl) {
        countEl.textContent = "";
        countEl.style.display = "none";
    }

    if (totalFiltered === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                <i class="fa-solid fa-film" style="font-size: 48px; color: var(--color-gold); margin-bottom: 16px;"></i>
                <h3>Không tìm thấy phim phù hợp!</h3>
                <p>Thử tìm kiếm với từ khóa khác hoặc chuyển danh mục.</p>
            </div>
        `;
        renderPagination(0, 1, 1, 0, 0);
        return;
    }

    // Cắt danh sách 12 phim cho trang hiện tại
    const startIndex = (currentPage - 1) * MOVIES_PER_PAGE;
    const pagedMovies = movies.slice(startIndex, startIndex + MOVIES_PER_PAGE);

    // Render danh sách 12 phim
    grid.innerHTML = pagedMovies.map(movie => {
        return `
            <div class="movie-card" onclick="openMoviePlayer('${movie.id}')">
                <div class="movie-poster-wrap">
                    <img src="${movie.poster}" alt="${movie.title}" class="movie-poster-img" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                    <div class="card-badges">
                        <span class="badge-quality-small">${movie.quality}</span>
                    </div>
                    <div class="card-rating-badge">
                        <i class="fa-solid fa-star"></i> ${movie.rating.toFixed(1)}
                    </div>
                    <div class="poster-play-overlay">
                        <div class="play-circle-btn">
                            <i class="fa-solid fa-play"></i>
                        </div>
                    </div>
                </div>
                <div class="movie-details">
                    <h3 class="movie-title" title="${movie.title}">${movie.title}</h3>
                    <div class="movie-original-title">${movie.originalTitle || movie.title}</div>
                    <div class="movie-meta-bar">
                        <span class="movie-cat-tag">${movie.categoryName}</span>
                        <span><i class="fa-regular fa-clock"></i> ${movie.duration}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    // Render thanh phân trang
    renderPagination(totalFiltered, totalPages, currentPage, startIndex, pagedMovies.length);
}

// Hàm render thanh điều khiển phân trang (12 phim / trang)
function renderPagination(totalFiltered, totalPages, curPage, startIndex, pageCount) {
    const paginationWrapper = document.getElementById("pagination-wrapper");
    const paginationControls = document.getElementById("pagination-controls");
    const paginationInfo = document.getElementById("pagination-info");

    if (!paginationWrapper || !paginationControls) return;

    if (totalFiltered <= MOVIES_PER_PAGE) {
        paginationWrapper.style.display = "none";
        paginationControls.innerHTML = "";
        return;
    }

    paginationWrapper.style.display = "flex";

    // Ẩn chú thích nếu còn tồn tại
    if (paginationInfo) {
        paginationInfo.style.display = "none";
    }

    // Tạo các nút phân trang
    let btnsHtml = "";

    // Nút Trang Trước (Prev)
    btnsHtml += `
        <button class="page-btn" ${curPage === 1 ? 'disabled' : ''} onclick="goToPage(${curPage - 1})" title="Trang trước">
            <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

    // Tính toán danh sách các mục phân trang (gồm trang đầu, trang hiện tại, trang kế tiếp, dấu '...' và trang cuối)
    const paginationItems = getPaginationItems(curPage, totalPages);

    paginationItems.forEach(item => {
        if (item === "...") {
            btnsHtml += `<span class="page-ellipsis">...</span>`;
        } else {
            btnsHtml += `
                <button class="page-btn ${item === curPage ? 'active' : ''}" onclick="goToPage(${item})" title="Trang ${item}">
                    ${item}
                </button>
            `;
        }
    });

    // Nút Trang Sau (Next)
    btnsHtml += `
        <button class="page-btn" ${curPage === totalPages ? 'disabled' : ''} onclick="goToPage(${curPage + 1})" title="Trang tiếp theo">
            <i class="fa-solid fa-chevron-right"></i>
        </button>
    `;

    paginationControls.innerHTML = btnsHtml;
}

// Hàm tính toán các trang cần hiển thị: Trang đầu, trang hiện tại & trang tiếp theo, dấu ba chấm '...', và trang cuối
function getPaginationItems(curPage, totalPages) {
    if (totalPages <= 3) {
        return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pagesSet = new Set();
    // Luôn hiển thị trang 1 và trang cuối cùng
    pagesSet.add(1);
    pagesSet.add(totalPages);

    // Trang hiện tại
    pagesSet.add(curPage);

    // Trang tiếp theo (nếu chưa vượt quá trang cuối)
    if (curPage + 1 <= totalPages) {
        pagesSet.add(curPage + 1);
    }

    // Nếu đang ở trang cuối cùng, thêm trang liền trước
    if (curPage === totalPages && curPage - 1 >= 1) {
        pagesSet.add(curPage - 1);
    }

    const sortedPages = Array.from(pagesSet).sort((a, b) => a - b);
    const result = [];

    for (let i = 0; i < sortedPages.length; i++) {
        if (i > 0) {
            const diff = sortedPages[i] - sortedPages[i - 1];
            if (diff > 1) {
                result.push("...");
            }
        }
        result.push(sortedPages[i]);
    }

    return result;
}

// Chuyển trang
function goToPage(page) {
    currentPage = page;
    renderMoviesGrid();

    // Cuộn nhẹ lên đầu kho phim
    const catalogSection = document.getElementById("catalog-section");
    if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: "smooth" });
    }
}

// ==========================================================================
// 8. MODAL CHI TIẾT PHIM (MÔ TẢ, ĐÁNH GIÁ, COMMENT & NÚT XEM PHIM)
//    - Khi click thẻ phim: hiện modal chi tiết kèm nút Xem Phim
//    - Khi bấm nút Xem Phim: load sang trang xem phim mới watch.html?id=...
// ==========================================================================
function openMoviePlayer(movieId) {
    openMovieDetailModal(movieId);
}

function openMovieDetailModal(movieId) {
    const movies = getMovies();
    const movie = movies.find(m => m.id === movieId);
    if (!movie) return;

    activeMovieId = movieId;

    const playerModal = document.getElementById("player-modal");
    const modalHero = document.getElementById("modal-detail-hero");
    const posterImg = document.getElementById("detail-modal-poster");
    const titleEl = document.getElementById("player-movie-title");
    const originalTitleEl = document.getElementById("player-movie-original");
    const directorEl = document.getElementById("detail-modal-director");
    const actorsEl = document.getElementById("detail-modal-actors");
    const descEl = document.getElementById("player-movie-description");
    const tagsEl = document.getElementById("player-movie-tags");
    const btnWatchNow = document.getElementById("btn-modal-watch-now");
    const btnShare = document.getElementById("btn-modal-share");

    if (modalHero) {
        modalHero.style.backgroundImage = `url('${movie.banner || movie.poster}')`;
    }
    if (posterImg) {
        posterImg.src = movie.poster;
        posterImg.alt = movie.title;
    }
    if (titleEl) titleEl.textContent = movie.title;
    if (originalTitleEl) originalTitleEl.textContent = movie.originalTitle || movie.title;
    if (directorEl) directorEl.textContent = movie.director || "Đang cập nhật";
    if (actorsEl) actorsEl.textContent = movie.actors || "Đang cập nhật";
    if (descEl) descEl.textContent = movie.description;

    if (tagsEl) {
        tagsEl.innerHTML = `
            <span class="tag-item highlight-gold"><i class="fa-solid fa-star"></i> ${movie.rating.toFixed(1)} / 5</span>
            <span class="tag-item"><i class="fa-solid fa-tags"></i> ${movie.categoryName}</span>
            <span class="tag-item"><i class="fa-regular fa-calendar"></i> ${movie.year}</span>
            <span class="tag-item"><i class="fa-regular fa-clock"></i> ${movie.duration}</span>
            <span class="tag-item"><i class="fa-solid fa-tv"></i> ${movie.quality}</span>
            <span class="tag-item"><i class="fa-solid fa-eye"></i> ${(movie.viewsToday || 0).toLocaleString("vi-VN")} lượt xem</span>
        `;
    }

    // NÚT BẤM XEM PHIM: Chuyển sang trang xem phim mới watch.html
    if (btnWatchNow) {
        btnWatchNow.onclick = () => {
            if (window.navigateToPage) {
                window.navigateToPage(`watch.html?id=${movie.id}`, "Đang tải vui lòng chờ");
            } else {
                window.location.href = `watch.html?id=${movie.id}`;
            }
        };
    }

    // Nút Chia sẻ
    if (btnShare) {
        btnShare.onclick = () => {
            const currentUrl = window.location.href;
            const watchUrl = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1) + `watch.html?id=${movie.id}`;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(watchUrl).then(() => {
                    showToast("Đã sao chép liên kết xem phim vào bộ nhớ tạm!", "success");
                }).catch(() => {
                    prompt("Sao chép liên kết xem phim:", watchUrl);
                });
            } else {
                prompt("Sao chép liên kết xem phim:", watchUrl);
            }
        };
    }

    // Thiết lập vùng bình luận & đánh giá theo quyền
    setupCommentSection(movie);

    // Hiển thị modal
    if (playerModal) {
        playerModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }
}

function closeMoviePlayer() {
    const playerModal = document.getElementById("player-modal");
    if (playerModal) {
        playerModal.classList.remove("open");
        document.body.style.overflow = "";
    }
    activeMovieId = null;
}

// Cấu hình khu vực bình luận & đánh giá theo quyền
function setupCommentSection(movie) {
    const authWarningBox = document.getElementById("auth-warning-box");
    const commentFormBox = document.getElementById("comment-form-box");
    const commentCounter = document.getElementById("player-comment-counter");
    const commentCurrentAvatar = document.getElementById("comment-current-avatar");

    const comments = movie.comments || [];
    if (commentCounter) {
        commentCounter.textContent = `(${comments.length})`;
    }

    // Kiểm tra đăng nhập
    if (isLoggedIn()) {
        const user = getCurrentUser();
        if (authWarningBox) authWarningBox.style.display = "none";
        if (commentFormBox) {
            commentFormBox.style.display = "flex";
            if (commentCurrentAvatar) commentCurrentAvatar.src = user.avatar;
        }
    } else {
        if (authWarningBox) authWarningBox.style.display = "flex";
        if (commentFormBox) commentFormBox.style.display = "none";
    }

    // Render danh sách bình luận
    renderCommentsList(comments);
}

function renderCommentsList(comments) {
    const listContainer = document.getElementById("comments-list-container");
    if (!listContainer) return;

    if (!comments || comments.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align: center; padding: 20px; color: var(--text-secondary); font-size: 13.5px;">
                Chưa có bình luận nào cho phim này. Hãy là người đầu tiên để lại cảm nghĩ và đánh giá!
            </div>
        `;
        return;
    }

    const users = (typeof getUsers === "function") ? getUsers() : [];
    const userMap = new Map(users.map(u => [(u.username || "").toLowerCase(), u]));

    listContainer.innerHTML = comments.map(c => {
        let starsHtml = "";
        const rating = c.rating || 5;
        for (let i = 1; i <= 5; i++) {
            if (i <= rating) {
                starsHtml += `<i class="fa-solid fa-star"></i> `;
            } else {
                starsHtml += `<i class="fa-regular fa-star" style="color: var(--color-platinum-border);"></i> `;
            }
        }

        const userRecord = userMap.get((c.username || "").toLowerCase());
        const displayFullName = userRecord ? userRecord.fullName : (c.fullName || c.username || "Thành viên");
        const displayRole = userRecord ? userRecord.role : (c.role || "user");
        const displayAvatar = (userRecord && userRecord.avatar) ? userRecord.avatar : (c.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');

        const roleBadge = displayRole === "admin" 
            ? `<span class="user-role-badge role-admin" style="font-size: 9px; margin-left: 6px;">ADMIN</span>`
            : "";

        return `
            <div class="comment-item">
                <img src="${displayAvatar}" alt="${displayFullName}" class="comment-avatar">
                <div class="comment-body">
                    <div class="comment-meta">
                        <span class="comment-author">${displayFullName} ${roleBadge}</span>
                        <span class="comment-time">${c.createdAt || "Vừa xong"}</span>
                        <div class="comment-stars">${starsHtml}</div>
                    </div>
                    <div class="comment-text">${escapeHtml(c.text)}</div>
                </div>
            </div>
        `;
    }).join("");
}

// Xử lý gửi bình luận & đánh giá sao
function handleCommentSubmit() {
    if (!isLoggedIn()) {
        showToast("Vui lòng đăng nhập để bình luận và đánh giá phim!", "error");
        openAuthModal("login");
        return;
    }

    const commentTextInput = document.getElementById("comment-text-input");
    const text = commentTextInput ? commentTextInput.value.trim() : "";

    if (!text) {
        showToast("Vui lòng nhập nội dung bình luận của bạn!", "error");
        return;
    }

    if (!activeMovieId) return;

    const movies = getMovies();
    const movie = movies.find(m => m.id === activeMovieId);
    if (!movie) return;

    const user = getCurrentUser();

    // Tạo bình luận mới
    const newComment = {
        id: "c_" + Date.now(),
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        avatar: user.avatar,
        text: text,
        rating: currentRatingValue,
        createdAt: "Vừa xong"
    };

    if (!movie.comments) movie.comments = [];
    movie.comments.unshift(newComment);

    // Tính lại rating trung bình của phim
    const oldRating = movie.rating || 5;
    const oldCount = movie.ratingCount || 100;
    const newCount = oldCount + 1;
    const updatedRating = Math.round(((oldRating * oldCount + currentRatingValue) / newCount) * 10) / 10;
    movie.rating = updatedRating;
    movie.ratingCount = newCount;

    saveMovies(movies);

    // Cập nhật giao diện
    commentTextInput.value = "";
    setupCommentSection(movie);
    renderMoviesGrid();
    renderHero();

    showToast(`Đã gửi bình luận và đánh giá ${currentRatingValue} sao thành công!`, "success");
}

// ==========================================================================
// 9. MODAL ĐĂNG NHẬP / ĐĂNG KÝ
// ==========================================================================
function openAuthModal(tab = "login") {
    const authModal = document.getElementById("auth-modal");
    if (!authModal) return;

    switchAuthTab(tab);
    authModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeAuthModal() {
    const authModal = document.getElementById("auth-modal");
    if (authModal) {
        authModal.classList.remove("open");
        document.body.style.overflow = "";
    }
}

function switchAuthTab(tab) {
    const tabLoginBtn = document.getElementById("tab-login-btn");
    const tabRegisterBtn = document.getElementById("tab-register-btn");
    const formLogin = document.getElementById("form-login");
    const formRegister = document.getElementById("form-register");

    if (tab === "login") {
        if (tabLoginBtn) tabLoginBtn.classList.add("active");
        if (tabRegisterBtn) tabRegisterBtn.classList.remove("active");
        if (formLogin) formLogin.style.display = "block";
        if (formRegister) formRegister.style.display = "none";
    } else {
        if (tabLoginBtn) tabLoginBtn.classList.remove("active");
        if (tabRegisterBtn) tabRegisterBtn.classList.add("active");
        if (formLogin) formLogin.style.display = "none";
        if (formRegister) formRegister.style.display = "block";
    }
}

// ==========================================================================
// 10. BẢNG QUẢN TRỊ ADMIN (ADMIN PANEL)
//     - CHỈ TÀI KHOẢN ADMIN MỚI ĐƯỢC PHÉP TRUY CẬP
// ==========================================================================
function openAdminModal() {
    if (!isAdmin()) {
        showToast("Chỉ tài khoản Quản trị viên (Admin) mới có quyền truy cập!", "error");
        return;
    }

    const adminModal = document.getElementById("admin-modal");
    if (!adminModal) return;

    populateCategoryDropdowns();
    renderAdminMoviesTable();
    renderAdminCategoriesList();
    switchAdminTab("form");

    adminModal.classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeAdminModal() {
    const adminModal = document.getElementById("admin-modal");
    if (adminModal) {
        adminModal.classList.remove("open");
        document.body.style.overflow = "";
    }
    resetMovieForm();
}

function switchAdminTab(tab) {
    const tabAddBtn = document.getElementById("admin-tab-add-btn");
    const tabListBtn = document.getElementById("admin-tab-list-btn");
    const tabCatBtn = document.getElementById("admin-tab-cat-btn");

    const formWrap = document.getElementById("admin-tab-movie-form-wrap");
    const listWrap = document.getElementById("admin-tab-movie-list-wrap");
    const catWrap = document.getElementById("admin-tab-category-wrap");

    if (tabAddBtn) tabAddBtn.classList.remove("active");
    if (tabListBtn) tabListBtn.classList.remove("active");
    if (tabCatBtn) tabCatBtn.classList.remove("active");

    if (formWrap) formWrap.style.display = "none";
    if (listWrap) listWrap.style.display = "none";
    if (catWrap) catWrap.style.display = "none";

    if (tab === "form") {
        if (tabAddBtn) tabAddBtn.classList.add("active");
        if (formWrap) formWrap.style.display = "block";
    } else if (tab === "list") {
        if (tabListBtn) tabListBtn.classList.add("active");
        if (listWrap) listWrap.style.display = "block";
        renderAdminMoviesTable();
    } else if (tab === "category") {
        if (tabCatBtn) tabCatBtn.classList.add("active");
        if (catWrap) catWrap.style.display = "block";
        renderAdminCategoriesList();
    }
}

// Đổ dữ liệu Categories vào dropdown của form Thêm Phim
function populateCategoryDropdowns() {
    const categories = getCategories();
    const select = document.getElementById("m-category");
    if (!select) return;

    select.innerHTML = categories
        .filter(c => c.id !== "all")
        .map(c => `<option value="${c.id}">${c.name}</option>`)
        .join("");
}

// Render bảng danh sách phim trong admin
function renderAdminMoviesTable() {
    const movies = getMovies();
    const tbody = document.getElementById("admin-movies-tbody");
    if (!tbody) return;

    tbody.innerHTML = movies.map(m => {
        return `
            <tr>
                <td><img src="${m.poster}" alt="${m.title}" class="admin-table-thumb" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';"></td>
                <td><strong>${escapeHtml(m.title)}</strong><br><small style="color: var(--text-secondary);">${escapeHtml(m.originalTitle || '')}</small></td>
                <td><span class="movie-cat-tag">${escapeHtml(m.categoryName)}</span></td>
                <td>${m.year}</td>
                <td>${(m.viewsToday || 0).toLocaleString("vi-VN")}</td>
                <td><i class="fa-solid fa-star" style="color: var(--color-gold);"></i> ${m.rating.toFixed(1)}</td>
                <td>
                    <div class="admin-action-btns">
                        <button class="btn-admin-edit" onclick="handleEditMovie('${m.id}')">
                            <i class="fa-solid fa-pen-to-square"></i> Sửa
                        </button>
                        <button class="btn-admin-delete" onclick="handleDeleteMovie('${m.id}')">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
}

// Bắt đầu sửa phim
function handleEditMovie(movieId) {
    const movies = getMovies();
    const movie = movies.find(m => m.id === movieId);
    if (!movie) return;

    switchAdminTab("form");

    // Điền dữ liệu vào form
    document.getElementById("admin-movie-id").value = movie.id;
    document.getElementById("m-title").value = movie.title;
    document.getElementById("m-original-title").value = movie.originalTitle || "";
    document.getElementById("m-category").value = movie.category;
    document.getElementById("m-year").value = movie.year;
    document.getElementById("m-duration").value = movie.duration;
    document.getElementById("m-quality").value = movie.quality;
    document.getElementById("m-director").value = movie.director || "";
    document.getElementById("m-actors").value = movie.actors || "";
    document.getElementById("m-poster").value = movie.poster;
    document.getElementById("m-banner").value = movie.banner || "";
    document.getElementById("m-videourl").value = movie.videoUrl || "";
    document.getElementById("m-trailerurl").value = movie.trailerUrl || "";
    document.getElementById("m-description").value = movie.description;

    const btnSave = document.getElementById("btn-save-movie");
    const btnCancel = document.getElementById("btn-cancel-edit");
    if (btnSave) btnSave.innerHTML = `<i class="fa-solid fa-check"></i> Cập Nhật Phim (Lưu Lại)`;
    if (btnCancel) btnCancel.style.display = "inline-block";
}

function resetMovieForm() {
    const form = document.getElementById("admin-movie-form");
    if (form) form.reset();

    const idInput = document.getElementById("admin-movie-id");
    if (idInput) idInput.value = "";

    const btnSave = document.getElementById("btn-save-movie");
    const btnCancel = document.getElementById("btn-cancel-edit");
    if (btnSave) btnSave.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Lưu Thông Tin Phim`;
    if (btnCancel) btnCancel.style.display = "none";
}

// Xóa phim
function handleDeleteMovie(movieId) {
    if (!isAdmin()) {
        showToast("Bạn không có quyền thực hiện thao tác này!", "error");
        return;
    }

    const movies = getMovies();
    const movie = movies.find(m => m.id === movieId);
    if (!movie) return;

    if (confirm(`Bạn có chắc chắn muốn xóa bộ phim "${movie.title}" không?`)) {
        const updatedMovies = movies.filter(m => m.id !== movieId);
        saveMovies(updatedMovies);

        renderAdminMoviesTable();
        renderMoviesGrid();
        renderRanking();
        renderHero();

        showToast(`Đã xóa phim "${movie.title}" thành công!`, "success");
    }
}

// Xử lý lưu form phim (Thêm mới hoặc Cập nhật)
function handleSaveMovieSubmit(e) {
    e.preventDefault();

    if (!isAdmin()) {
        showToast("Chỉ tài khoản Admin mới được thêm hoặc sửa phim!", "error");
        return;
    }

    const movieId = document.getElementById("admin-movie-id").value;
    const title = document.getElementById("m-title").value.trim();
    const originalTitle = document.getElementById("m-original-title").value.trim();
    const categoryId = document.getElementById("m-category").value;
    const year = parseInt(document.getElementById("m-year").value) || 2024;
    const duration = document.getElementById("m-duration").value.trim();
    const quality = document.getElementById("m-quality").value;
    const director = document.getElementById("m-director").value.trim();
    const actors = document.getElementById("m-actors").value.trim();
    const poster = document.getElementById("m-poster").value.trim();
    const banner = document.getElementById("m-banner").value.trim() || poster;
    const videoUrl = document.getElementById("m-videourl").value.trim() || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    const trailerUrl = document.getElementById("m-trailerurl").value.trim() || "https://www.youtube.com/embed/Way9Dexny3w";
    const description = document.getElementById("m-description").value.trim();

    const categories = getCategories();
    const matchedCategory = categories.find(c => c.id === categoryId);
    const categoryName = matchedCategory ? matchedCategory.name : "Hành Động";

    let movies = getMovies();

    if (movieId) {
        // CẬP NHẬT PHIM HIỆN CÓ
        const movieIndex = movies.findIndex(m => m.id === movieId);
        if (movieIndex !== -1) {
            movies[movieIndex] = {
                ...movies[movieIndex],
                title,
                originalTitle,
                category: categoryId,
                categoryName,
                year,
                duration,
                quality,
                director,
                actors,
                poster,
                banner,
                videoUrl,
                trailerUrl,
                description
            };
            saveMovies(movies);
            showToast(`Cập nhật phim "${title}" thành công!`, "success");
        }
    } else {
        // THÊM PHIM MỚI
        const newMovie = {
            id: "m_" + Date.now(),
            title,
            originalTitle,
            category: categoryId,
            categoryName,
            year,
            duration,
            quality,
            director,
            actors,
            poster,
            banner,
            videoUrl,
            trailerUrl,
            description,
            rating: 5.0,
            ratingCount: 1,
            viewsToday: Math.floor(Math.random() * 500) + 100,
            viewsMonth: Math.floor(Math.random() * 5000) + 1000,
            viewsSeason: Math.floor(Math.random() * 20000) + 5000,
            featured: false,
            comments: []
        };
        movies.unshift(newMovie);
        saveMovies(movies);
        showToast(`Đã thêm phim mới "${title}" thành công!`, "success");
    }

    resetMovieForm();
    renderAdminMoviesTable();
    renderMoviesGrid();
    renderRanking();
    renderHero();
}

// Tab Category: Render danh sách thể loại
function renderAdminCategoriesList() {
    const categories = getCategories();
    const listEl = document.getElementById("admin-categories-list");
    if (!listEl) return;

    listEl.innerHTML = categories.map(cat => {
        const canDelete = cat.id !== "all";
        return `
            <div class="category-item-row">
                <div>
                    <strong>${escapeHtml(cat.name)}</strong>
                    <span style="color: var(--text-secondary); font-size: 12px; margin-left: 8px;">(ID: ${cat.id})</span>
                </div>
                ${canDelete ? `
                    <button class="btn-admin-delete" onclick="handleDeleteCategory('${cat.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                ` : `<span style="font-size: 11px; color: var(--color-gold);">Mặc định</span>`}
            </div>
        `;
    }).join("");
}

// Thêm Category Mới
function handleAddCategorySubmit(e) {
    e.preventDefault();

    if (!isAdmin()) {
        showToast("Chỉ tài khoản Admin mới được thêm thể loại!", "error");
        return;
    }

    const catId = document.getElementById("cat-id").value.trim().toLowerCase().replace(/\s+/g, '-');
    const catName = document.getElementById("cat-name").value.trim();

    if (!catId || !catName) {
        showToast("Vui lòng nhập đầy đủ mã và tên thể loại!", "error");
        return;
    }

    let categories = getCategories();
    if (categories.some(c => c.id === catId)) {
        showToast("Mã thể loại này đã tồn tại, vui lòng chọn mã khác!", "error");
        return;
    }

    categories.push({ id: catId, name: catName });
    saveCategories(categories);

    document.getElementById("form-add-category").reset();
    renderAdminCategoriesList();
    populateCategoryDropdowns();
    renderCategoryPills();

    showToast(`Đã thêm thể loại "${catName}" thành công!`, "success");
}

function handleDeleteCategory(catId) {
    if (!isAdmin()) {
        showToast("Chỉ tài khoản Admin mới được xóa thể loại!", "error");
        return;
    }

    let categories = getCategories();
    const cat = categories.find(c => c.id === catId);
    if (!cat) return;

    if (confirm(`Bạn có chắc muốn xóa thể loại "${cat.name}"?`)) {
        categories = categories.filter(c => c.id !== catId);
        saveCategories(categories);

        renderAdminCategoriesList();
        populateCategoryDropdowns();
        renderCategoryPills();

        showToast(`Đã xóa thể loại "${cat.name}" thành công!`, "success");
    }
}

// ==========================================================================
// 11. TOAST NOTIFICATION UTILITY
// ==========================================================================
function showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type === "error" ? "toast-error" : type === "success" ? "toast-success" : ""}`;

    toast.innerHTML = `
        <div class="toast-header-row">
            <img src="images/logo.png" alt="Logo CoiPhim" class="toast-logo-icon">
            <span class="toast-brand-title">CoiPhim thông báo</span>
        </div>
        <div class="toast-message-body">
            ${message}
        </div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transform = "translateX(100%)";
        toast.style.transition = "all 0.35s ease";
        setTimeout(() => toast.remove(), 350);
    }, 3500);
}

// Hàm chống XSS đơn giản
function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// 12. KHỞI TẠO TẤT CẢ SỰ KIỆN KHI TRANG TẢI XONG
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Splash screen & Theme
    initSplashScreen();
    initTheme();

    // 2. Cập nhật header authentication state
    updateHeaderAuthUI();

    // 2.1. Đọc danh mục từ query parameter nếu có (ví dụ: index.html?category=action)
    const urlParams = new URLSearchParams(window.location.search);
    const catParam = urlParams.get("category");
    if (catParam) {
        currentCategory = catParam;
    }

    // 2.2. Sự kiện mở/đóng Header Filter Dropdown
    const headerFilterBtn = document.getElementById("header-filter-btn");
    const headerFilterWrap = document.getElementById("header-filter-wrap");
    if (headerFilterBtn && headerFilterWrap) {
        headerFilterBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            headerFilterWrap.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
            if (!headerFilterWrap.contains(e.target)) {
                headerFilterWrap.classList.remove("open");
            }
        });
    }

    // 3. Render Hero Slider Top 10, Banner Phụ Ngẫu Nhiên, Bảng xếp hạng, Thể loại, Lưới phim
    renderHero();
    initSubBannerRandom();
    renderRanking("today");
    renderCategoryPills();
    renderMoviesGrid();

    // Tạm dừng khi di chuột vào xem chi tiết, tự động chạy tiếp khi rời chuột (nhịp 2.5 giây)
    const heroBanner = document.getElementById("hero-banner");
    if (heroBanner) {
        heroBanner.addEventListener("mouseenter", () => {
            if (heroIsPlaying && heroSliderTimer) {
                clearInterval(heroSliderTimer);
            }
        });
        heroBanner.addEventListener("mouseleave", () => {
            if (heroIsPlaying) {
                startHeroSlider();
            }
        });
    }

    // 4. Tab bảng xếp hạng (Hôm nay, Tháng này, Mùa này)
    document.querySelectorAll(".ranking-tab-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const period = btn.getAttribute("data-period");
            switchRankingPeriod(period);
        });
    });

    // 5. Thanh tìm kiếm Realtime
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            currentPage = 1; // Reset về trang 1 khi tìm kiếm
            renderMoviesGrid();
        });
    }

    // 6. Sắp xếp dropdown
    const sortSelect = document.getElementById("sort-select");
    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            currentSort = e.target.value;
            currentPage = 1; // Reset về trang 1 khi đổi cách sắp xếp
            renderMoviesGrid();
        });
    }

    // 7. Modal Video Player Events
    const modalPlayerClose = document.getElementById("modal-player-close");
    if (modalPlayerClose) {
        modalPlayerClose.addEventListener("click", closeMoviePlayer);
    }

    const playerModal = document.getElementById("player-modal");
    if (playerModal) {
        playerModal.addEventListener("click", (e) => {
            if (e.target === playerModal) closeMoviePlayer();
        });
    }

    // Chuyển server nguồn phát
    const btnServerMain = document.getElementById("btn-server-main");
    if (btnServerMain) {
        btnServerMain.addEventListener("click", () => switchPlayerSource("main"));
    }
    const btnServerTrailer = document.getElementById("btn-server-trailer");
    if (btnServerTrailer) {
        btnServerTrailer.addEventListener("click", () => switchPlayerSource("trailer"));
    }

    // 8. Tương tác chọn 1 đến 5 sao
    const starContainer = document.getElementById("star-rating-select");
    const selectedRatingText = document.getElementById("selected-rating-text");
    if (starContainer) {
        const stars = starContainer.querySelectorAll("i");
        stars.forEach(star => {
            star.addEventListener("mouseenter", () => {
                const hoverRating = parseInt(star.getAttribute("data-rating"));
                stars.forEach(s => {
                    if (parseInt(s.getAttribute("data-rating")) <= hoverRating) {
                        s.classList.add("hover");
                    } else {
                        s.classList.remove("hover");
                    }
                });
            });

            starContainer.addEventListener("mouseleave", () => {
                stars.forEach(s => s.classList.remove("hover"));
            });

            star.addEventListener("click", () => {
                currentRatingValue = parseInt(star.getAttribute("data-rating"));
                stars.forEach(s => {
                    if (parseInt(s.getAttribute("data-rating")) <= currentRatingValue) {
                        s.classList.add("active");
                    } else {
                        s.classList.remove("active");
                    }
                });
                if (selectedRatingText) {
                    selectedRatingText.textContent = `(${currentRatingValue} / 5 sao)`;
                }
            });
        });
    }

    // Nút gửi comment
    const btnSubmitComment = document.getElementById("btn-submit-comment");
    if (btnSubmitComment) {
        btnSubmitComment.addEventListener("click", handleCommentSubmit);
    }

    // Nút kích hoạt login từ cảnh báo comment
    const btnTriggerLoginComment = document.getElementById("btn-trigger-login-comment");
    if (btnTriggerLoginComment) {
        btnTriggerLoginComment.addEventListener("click", () => openAuthModal("login"));
    }

    // 9. Modal Auth Events (Đăng nhập / Đăng ký)
    const btnOpenLogin = document.getElementById("btn-open-login");
    if (btnOpenLogin) {
        btnOpenLogin.addEventListener("click", () => openAuthModal("login"));
    }

    const modalAuthClose = document.getElementById("modal-auth-close");
    if (modalAuthClose) {
        modalAuthClose.addEventListener("click", closeAuthModal);
    }

    const authModal = document.getElementById("auth-modal");
    if (authModal) {
        authModal.addEventListener("click", (e) => {
            if (e.target === authModal) closeAuthModal();
        });
    }

    const tabLoginBtn = document.getElementById("tab-login-btn");
    if (tabLoginBtn) {
        tabLoginBtn.addEventListener("click", () => switchAuthTab("login"));
    }

    const tabRegisterBtn = document.getElementById("tab-register-btn");
    if (tabRegisterBtn) {
        tabRegisterBtn.addEventListener("click", () => switchAuthTab("register"));
    }

    // Form Đăng nhập
    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.addEventListener("submit", (e) => {
            e.preventDefault();
            const u = document.getElementById("login-username").value;
            const p = document.getElementById("login-password").value;

            const res = loginUser(u, p);
            if (res.success) {
                closeAuthModal();
                if (window.showPageLoading) {
                    window.showPageLoading("Đang tải vui lòng chờ");
                }
                setTimeout(() => {
                    updateHeaderAuthUI();
                    if (window.watcherUpdateAuthStatus) window.watcherUpdateAuthStatus();

                    // Cập nhật lại vùng comment nếu đang mở player
                    if (activeMovieId) {
                        const movie = getMovies().find(m => m.id === activeMovieId);
                        if (movie) setupCommentSection(movie);
                    }
                    if (window.hidePageLoading) {
                        window.hidePageLoading(300);
                    }
                    showToast(res.message, "success");
                }, 750);
            } else {
                showToast(res.message, "error");
            }
        });
    }

    // Form Đăng ký
    const formRegister = document.getElementById("form-register");
    if (formRegister) {
        formRegister.addEventListener("submit", (e) => {
            e.preventDefault();
            const fullName = document.getElementById("register-fullname").value;
            const u = document.getElementById("register-username").value;
            const p = document.getElementById("register-password").value;

            const res = registerUser(u, p, fullName);
            if (res.success) {
                closeAuthModal();
                if (window.showPageLoading) {
                    window.showPageLoading("Đang tải vui lòng chờ");
                }
                setTimeout(() => {
                    updateHeaderAuthUI();
                    if (window.watcherUpdateAuthStatus) window.watcherUpdateAuthStatus();

                    if (activeMovieId) {
                        const movie = getMovies().find(m => m.id === activeMovieId);
                        if (movie) setupCommentSection(movie);
                    }
                    if (window.hidePageLoading) {
                        window.hidePageLoading(300);
                    }
                    showToast(res.message, "success");
                }, 750);
            } else {
                showToast(res.message, "error");
            }
        });
    }

    // User Avatar & Dropdown
    const userAvatarBtn = document.getElementById("user-avatar-btn");
    const userDropdownContent = document.getElementById("user-dropdown-content");
    if (userAvatarBtn && userDropdownContent) {
        userAvatarBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            userDropdownContent.classList.toggle("show");
        });

        document.addEventListener("click", () => {
            userDropdownContent.classList.remove("show");
        });
    }

    // Nút Đăng xuất
    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            if (window.showPageLoading) {
                window.showPageLoading("Đang tải vui lòng chờ");
            }
            setTimeout(() => {
                logoutUser();
                updateHeaderAuthUI();
                if (window.watcherUpdateAuthStatus) window.watcherUpdateAuthStatus();

                if (activeMovieId) {
                    const movie = getMovies().find(m => m.id === activeMovieId);
                    if (movie) setupCommentSection(movie);
                }
                if (window.hidePageLoading) {
                    window.hidePageLoading(300);
                }
                showToast("Đã đăng xuất thành công!", "info");
            }, 600);
        });
    }

    // 10. Admin Modal Events
    const btnAdminNav = document.getElementById("btn-admin-nav");
    if (btnAdminNav) {
        btnAdminNav.addEventListener("click", openAdminModal);
    }

    const dropdownAdminItem = document.getElementById("dropdown-admin-item");
    if (dropdownAdminItem) {
        dropdownAdminItem.addEventListener("click", openAdminModal);
    }

    const modalAdminClose = document.getElementById("modal-admin-close");
    if (modalAdminClose) {
        modalAdminClose.addEventListener("click", closeAdminModal);
    }

    const adminModal = document.getElementById("admin-modal");
    if (adminModal) {
        adminModal.addEventListener("click", (e) => {
            if (e.target === adminModal) closeAdminModal();
        });
    }

    // Admin Tabs
    const adminTabAddBtn = document.getElementById("admin-tab-add-btn");
    if (adminTabAddBtn) {
        adminTabAddBtn.addEventListener("click", () => switchAdminTab("form"));
    }

    const adminTabListBtn = document.getElementById("admin-tab-list-btn");
    if (adminTabListBtn) {
        adminTabListBtn.addEventListener("click", () => switchAdminTab("list"));
    }

    const adminTabCatBtn = document.getElementById("admin-tab-cat-btn");
    if (adminTabCatBtn) {
        adminTabCatBtn.addEventListener("click", () => switchAdminTab("category"));
    }

    // Form Thêm / Cập nhật Phim
    const adminMovieForm = document.getElementById("admin-movie-form");
    if (adminMovieForm) {
        adminMovieForm.addEventListener("submit", handleSaveMovieSubmit);
    }

    const btnCancelEdit = document.getElementById("btn-cancel-edit");
    if (btnCancelEdit) {
        btnCancelEdit.addEventListener("click", resetMovieForm);
    }

    // Form Thêm Thể Loại
    const formAddCategory = document.getElementById("form-add-category");
    if (formAddCategory) {
        formAddCategory.addEventListener("submit", handleAddCategorySubmit);
    }
});
