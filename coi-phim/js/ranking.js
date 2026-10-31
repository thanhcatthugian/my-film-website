/**
 * ranking.js - Điều khiển trang Bảng Xếp Hạng Điện Ảnh Toàn Diện CoiPhim
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Trạng thái bộ lọc & hiển thị
    let currentPeriod = "today"; // 'today', 'week', 'month', 'season'
    let currentSort = "trending"; // 'trending', 'views', 'rating', 'year'
    let currentCategory = "all";
    let currentSearch = "";
    let currentViewMode = "table"; // 'table', 'grid'
    let activeMovieId = null;
    let selectedRating = 5;
    let currentPage = 1;
    const MOVIES_PER_PAGE = 10;

    // 2. Tham chiếu DOM
    const podiumContainer = document.getElementById("podium-container");
    const leaderboardTbody = document.getElementById("leaderboard-tbody");
    const leaderboardGrid = document.getElementById("leaderboard-grid");
    const rankingCounter = document.getElementById("ranking-counter");
    const rankingSearchInput = document.getElementById("ranking-search-input");
    const categoryPillsContainer = document.getElementById("category-pills-container");
    const rankingPaginationWrap = document.getElementById("ranking-pagination-wrap");
    const rankingPagination = document.getElementById("ranking-pagination");

    // Thống kê nhanh
    const statChampionEl = document.getElementById("stat-champion");
    const statTopRatedEl = document.getElementById("stat-top-rated");
    const statTotalViewsEl = document.getElementById("stat-total-views");
    const statTotalCountEl = document.getElementById("stat-total-count");

    // Modal chi tiết phim
    const playerModal = document.getElementById("player-modal");
    const modalCloseBtn = document.getElementById("modal-player-close");

    // Khởi tạo trang
    initTheme();
    updateHeaderAuthUI();
    initHeaderCategories();
    initControls();
    renderAll();

    // =========================================================================
    // HÀM TÍNH TOÁN DỮ LIỆU & BỘ LỌC
    // =========================================================================
    function getViewKey(period) {
        if (period === "month") return "viewsMonth";
        if (period === "season") return "viewsSeason";
        return "viewsToday";
    }

    function getMovieViews(movie, period) {
        if (period === "week") {
            // Tuần này = xấp xỉ viewsToday * 7
            return Math.round((movie.viewsToday || 1000) * 6.5);
        }
        const key = getViewKey(period);
        return movie[key] || 0;
    }

    function calculateTrendingScore(movie, period) {
        const views = getMovieViews(movie, period);
        const rating = movie.rating || 4.5;
        const ratingCount = movie.ratingCount || 100;
        return views * 0.7 + (rating * 2000) + (ratingCount * 15);
    }

    function getFilteredAndSortedMovies() {
        let movies = [...getMovies()];

        // 1. Lọc theo thể loại
        if (currentCategory !== "all") {
            movies = movies.filter(m => m.category === currentCategory);
        }

        // 2. Lọc theo ô tìm kiếm
        if (currentSearch.trim()) {
            const q = removeVietnameseTones(currentSearch.trim().toLowerCase());
            movies = movies.filter(m => {
                const titleVi = removeVietnameseTones((m.title || "").toLowerCase());
                const titleEn = removeVietnameseTones((m.originalTitle || "").toLowerCase());
                const director = removeVietnameseTones((m.director || "").toLowerCase());
                const actors = removeVietnameseTones((m.actors || "").toLowerCase());
                return titleVi.includes(q) || titleEn.includes(q) || director.includes(q) || actors.includes(q);
            });
        }

        // 3. Sắp xếp theo tiêu chí
        movies.sort((a, b) => {
            if (currentSort === "trending") {
                return calculateTrendingScore(b, currentPeriod) - calculateTrendingScore(a, currentPeriod);
            } else if (currentSort === "views") {
                return getMovieViews(b, currentPeriod) - getMovieViews(a, currentPeriod);
            } else if (currentSort === "rating") {
                if (b.rating !== a.rating) return (b.rating || 0) - (a.rating || 0);
                return getMovieViews(b, currentPeriod) - getMovieViews(a, currentPeriod);
            } else if (currentSort === "year") {
                if (b.year !== a.year) return (b.year || 0) - (a.year || 0);
                return (b.rating || 0) - (a.rating || 0);
            }
            return 0;
        });

        return movies;
    }

    // =========================================================================
    // HÀM RENDER CHÍNH
    // =========================================================================
    function renderAll() {
        const movies = getFilteredAndSortedMovies();

        // 1. Cập nhật thanh thống kê nhanh
        updateStatsBar(movies);

        // 2. Cập nhật số lượng đếm & phân trang
        const totalPages = Math.ceil(movies.length / MOVIES_PER_PAGE) || 1;
        if (currentPage > totalPages) currentPage = totalPages;
        if (currentPage < 1) currentPage = 1;

        if (rankingCounter) {
            rankingCounter.textContent = `${movies.length} phim (Trang ${currentPage}/${totalPages})`;
        }

        // 3. Render Top 3 (luôn là top 3 của bộ lọc hiện tại)
        renderPodium(movies.slice(0, 3));

        // 4. Lấy 10 phim cho trang hiện tại
        const offset = (currentPage - 1) * MOVIES_PER_PAGE;
        const pagedMovies = movies.slice(offset, offset + MOVIES_PER_PAGE);
        const top1Movie = movies[0];
        const maxOverallViews = top1Movie ? (getMovieViews(top1Movie, currentPeriod) || 1) : 1;

        // 5. Render Bảng xếp hạng chi tiết (Dạng bảng hoặc lưới)
        if (currentViewMode === "table") {
            if (leaderboardTbody) leaderboardTbody.parentElement.style.display = "table";
            if (leaderboardGrid) leaderboardGrid.style.display = "none";
            renderTable(pagedMovies, offset, maxOverallViews);
        } else {
            if (leaderboardTbody) leaderboardTbody.parentElement.style.display = "none";
            if (leaderboardGrid) leaderboardGrid.style.display = "grid";
            renderGrid(pagedMovies, offset);
        }

        // 6. Render thanh điều khiển phân trang
        renderRankingPagination(movies.length);
    }

    // Cập nhật thống kê nhanh
    function updateStatsBar(movies) {
        if (!movies.length) {
            if (statChampionEl) statChampionEl.textContent = "Chưa có dữ liệu";
            if (statTopRatedEl) statTopRatedEl.textContent = "0.0 ★";
            if (statTotalViewsEl) statTotalViewsEl.textContent = "0 lượt";
            if (statTotalCountEl) statTotalCountEl.textContent = "0 bộ phim";
            return;
        }

        // Phim đứng đầu
        const top1 = movies[0];
        if (statChampionEl) {
            statChampionEl.textContent = top1.title;
            statChampionEl.title = top1.title;
        }

        // Điểm đánh giá cao nhất
        const highestRated = [...movies].sort((a, b) => (b.rating || 0) - (a.rating || 0))[0];
        if (statTopRatedEl) {
            statTopRatedEl.textContent = `${highestRated.title} (${highestRated.rating.toFixed(1)} ★)`;
            statTopRatedEl.title = highestRated.title;
        }

        // Tổng lượt xem
        const totalViews = movies.reduce((sum, m) => sum + getMovieViews(m, currentPeriod), 0);
        if (statTotalViewsEl) {
            statTotalViewsEl.textContent = `${totalViews.toLocaleString("vi-VN")} lượt`;
        }

        // Tổng số phim (nếu element còn tồn tại)
        if (statTotalCountEl) {
            statTotalCountEl.textContent = `${movies.length} / 50 bộ phim`;
        }
    }

    // Render Top 3
    function renderPodium(top3) {
        if (!podiumContainer) return;

        if (top3.length === 0) {
            podiumContainer.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: var(--text-secondary);">
                    Không có phim nào thỏa mãn điều kiện lọc để hiển thị Top 3.
                </div>
            `;
            return;
        }

        // Cấu hình vị trí bục
        const podiumConfig = [
            { rank: 1, class: "rank-1", badgeClass: "badge-champion", icon: "fa-solid fa-crown", label: "Top 1" },
            { rank: 2, class: "rank-2", badgeClass: "badge-silver", icon: "fa-solid fa-medal", label: "Top 2" },
            { rank: 3, class: "rank-3", badgeClass: "badge-bronze", icon: "fa-solid fa-award", label: "Top 3" }
        ];

        let html = "";
        top3.forEach((movie, idx) => {
            const conf = podiumConfig[idx];
            const views = getMovieViews(movie, currentPeriod).toLocaleString("vi-VN");

            html += `
                <div class="podium-card ${conf.class}" onclick="openMovieDetail('${movie.id}')">
                    <div class="podium-rank-badge ${conf.badgeClass}">
                        <i class="${conf.icon}"></i> ${conf.label}
                    </div>
                    
                    <div class="podium-poster-wrap">
                        <img src="${movie.poster}" alt="${movie.title}" class="podium-poster-img" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                        <div class="podium-play-overlay">
                            <div class="podium-play-btn"><i class="fa-solid fa-play"></i></div>
                        </div>
                        <span class="podium-quality-tag">${movie.quality || "4K Ultra HD"}</span>
                    </div>

                    <div class="podium-info">
                        <h3 class="podium-title" title="${movie.title}">${movie.title}</h3>
                        <div class="podium-original-title">${movie.originalTitle || ""}</div>
                        
                        <div class="podium-tags-row">
                            <span class="podium-cat-badge">${movie.categoryName || "Điện ảnh"}</span>
                            <span class="podium-cat-badge">${movie.year}</span>
                            <span class="podium-cat-badge">${movie.duration}</span>
                        </div>

                        <div class="podium-stats-row">
                            <span class="podium-rating"><i class="fa-solid fa-star"></i> ${movie.rating.toFixed(1)} / 5</span>
                            <span class="podium-views"><i class="fa-solid fa-eye"></i> ${views} lượt</span>
                        </div>

                        <div class="podium-actions">
                            <button class="btn-podium-watch" onclick="event.stopPropagation(); navigateToPage('watch.html?id=${movie.id}', 'Đang tải vui lòng chờ')">
                                <i class="fa-solid fa-play"></i> Xem Phim
                            </button>
                            <button class="btn-podium-detail" onclick="event.stopPropagation(); openMovieDetail('${movie.id}')">
                                <i class="fa-solid fa-circle-info"></i> Chi Tiết
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        podiumContainer.innerHTML = html;
    }

    // Render Bảng chi tiết (hỗ trợ phân trang 10 phim / trang)
    function renderTable(movies, offset = 0, maxViews = 1) {
        if (!leaderboardTbody) return;

        if (movies.length === 0) {
            leaderboardTbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="ranking-empty-state">
                            <i class="fa-solid fa-film"></i>
                            <h4>Không tìm thấy bộ phim phù hợp</h4>
                            <p>Hãy thử tìm kiếm với từ khóa khác hoặc điều chỉnh lại bộ lọc thể loại.</p>
                            <button class="btn-reset-filter" id="btn-reset-filter"><i class="fa-solid fa-rotate-left"></i> Đặt Lại Bộ Lọc</button>
                        </div>
                    </td>
                </tr>
            `;
            const btnReset = document.getElementById("btn-reset-filter");
            if (btnReset) btnReset.onclick = resetFilters;
            return;
        }

        let html = "";
        movies.forEach((m, idx) => {
            const rank = offset + idx + 1;
            const views = getMovieViews(m, currentPeriod);
            const viewsFormatted = views.toLocaleString("vi-VN");
            const popPercent = Math.min(100, Math.max(12, Math.round((views / maxViews) * 100)));

            // Tính toán nhãn xu hướng phong phú
            let trendHtml = "";
            if (rank <= 3) {
                trendHtml = `<span class="trend-pill trend-up"><i class="fa-solid fa-arrow-trend-up"></i> +${4 - rank}</span>`;
            } else if (rank % 5 === 0) {
                trendHtml = `<span class="trend-pill trend-new"><i class="fa-solid fa-sparkles"></i> NEW</span>`;
            } else if (rank % 3 === 0) {
                trendHtml = `<span class="trend-pill trend-up"><i class="fa-solid fa-caret-up"></i> +1</span>`;
            } else if (rank % 4 === 0) {
                trendHtml = `<span class="trend-pill trend-down"><i class="fa-solid fa-caret-down"></i> -1</span>`;
            } else {
                trendHtml = `<span class="trend-pill trend-same"><i class="fa-solid fa-minus"></i></span>`;
            }

            const rankBadgeClass = rank <= 3 ? "rank-badge-num rank-badge-top10" : (rank <= 10 ? "rank-badge-num rank-badge-top10" : "rank-badge-num");

            html += `
                <tr onclick="openMovieDetail('${m.id}')">
                    <td class="col-rank">
                        <div class="rank-display-box">
                            <span class="${rankBadgeClass}">${rank}</span>
                            ${trendHtml}
                        </div>
                    </td>

                    <td>
                        <div class="table-movie-info-cell">
                            <img src="${m.poster}" alt="${m.title}" class="table-movie-thumb" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                            <div class="table-movie-names">
                                <div class="table-movie-title">${m.title}</div>
                                <div class="table-movie-original">${m.originalTitle || ""}</div>
                                <div class="table-movie-director">
                                    <i class="fa-solid fa-clapperboard"></i> ĐD: ${m.director || "Đang cập nhật"}
                                </div>
                            </div>
                        </div>
                    </td>

                    <td>
                        <span class="table-genre-badge">${m.categoryName || "Điện ảnh"}</span>
                    </td>

                    <td class="table-specs-cell">
                        <div class="table-specs-main">${m.year} • ${m.duration}</div>
                        <span class="table-quality-badge">${m.quality || "4K Ultra HD"}</span>
                    </td>

                    <td class="table-rating-cell">
                        <div class="table-score">
                            <i class="fa-solid fa-star"></i> ${m.rating.toFixed(1)} / 5
                        </div>
                        <div class="table-review-count">(${m.ratingCount || 100} lượt vote)</div>
                    </td>

                    <td class="table-views-cell">
                        <div class="table-views-num">
                            <i class="fa-solid fa-fire-flame-curved"></i> ${viewsFormatted}
                        </div>
                        <div class="popularity-bar-bg" title="Độ thịnh hành: ${popPercent}%">
                            <div class="popularity-bar-fill" style="width: ${popPercent}%"></div>
                        </div>
                    </td>

                    <td class="table-actions-cell">
                        <div class="table-btn-group" onclick="event.stopPropagation();">
                            <button class="btn-table-watch" onclick="navigateToPage('watch.html?id=${m.id}', 'Đang tải vui lòng chờ')">
                                <i class="fa-solid fa-play"></i> Xem
                            </button>
                            <button class="btn-table-detail" onclick="openMovieDetail('${m.id}')" title="Xem chi tiết & bình luận">
                                <i class="fa-solid fa-info"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        leaderboardTbody.innerHTML = html;
    }

    // Render Grid View (hỗ trợ phân trang 10 phim / trang)
    function renderGrid(movies, offset = 0) {
        if (!leaderboardGrid) return;

        if (movies.length === 0) {
            leaderboardGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: var(--text-secondary);">
                    Không có phim nào thỏa mãn điều kiện lọc.
                </div>
            `;
            return;
        }

        let html = "";
        movies.forEach((m, idx) => {
            const rank = offset + idx + 1;
            const views = getMovieViews(m, currentPeriod).toLocaleString("vi-VN");

            html += `
                <div class="grid-rank-card" onclick="openMovieDetail('${m.id}')">
                    <div class="grid-rank-badge">
                        <i class="fa-solid fa-crown"></i> #${rank}
                    </div>
                    <div class="grid-poster-wrap">
                        <img src="${m.poster}" alt="${m.title}" class="grid-poster-img" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                    </div>
                    <div class="grid-card-info">
                        <div class="grid-card-title" title="${m.title}">${m.title}</div>
                        <div class="grid-card-meta">
                            <span><i class="fa-solid fa-star"></i> ${m.rating.toFixed(1)}</span>
                            <span><i class="fa-regular fa-eye"></i> ${views}</span>
                        </div>
                    </div>
                </div>
            `;
        });

        leaderboardGrid.innerHTML = html;
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
            if (i > 0 && sortedPages[i] - sortedPages[i - 1] > 1) {
                result.push("...");
            }
            result.push(sortedPages[i]);
        }

        return result;
    }

    // Render thanh điều khiển phân trang
    function renderRankingPagination(totalMovies) {
        if (!rankingPaginationWrap || !rankingPagination) return;

        const totalPages = Math.ceil(totalMovies / MOVIES_PER_PAGE) || 1;

        if (totalMovies <= MOVIES_PER_PAGE) {
            rankingPaginationWrap.style.display = "none";
            rankingPagination.innerHTML = "";
            return;
        }

        rankingPaginationWrap.style.display = "flex";

        let btnsHtml = "";

        // Nút Trang Trước (Prev)
        btnsHtml += `
            <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="goToRankingPage(${currentPage - 1})" title="Trang trước">
                <i class="fa-solid fa-chevron-left"></i>
            </button>
        `;

        // Các nút số trang
        const items = getPaginationItems(currentPage, totalPages);
        items.forEach(item => {
            if (item === "...") {
                btnsHtml += `<span class="page-ellipsis">...</span>`;
            } else {
                btnsHtml += `
                    <button class="page-btn ${item === currentPage ? 'active' : ''}" onclick="goToRankingPage(${item})" title="Trang ${item}">
                        ${item}
                    </button>
                `;
            }
        });

        // Nút Trang Sau (Next)
        btnsHtml += `
            <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="goToRankingPage(${currentPage + 1})" title="Trang tiếp theo">
                <i class="fa-solid fa-chevron-right"></i>
            </button>
        `;

        rankingPagination.innerHTML = btnsHtml;
    }

    // Hàm chuyển trang bảng xếp hạng
    window.goToRankingPage = function(page) {
        const movies = getFilteredAndSortedMovies();
        const totalPages = Math.ceil(movies.length / MOVIES_PER_PAGE) || 1;
        if (page < 1 || page > totalPages) return;
        currentPage = page;
        renderAll();

        const tableCard = document.querySelector(".ranking-table-card");
        if (tableCard) {
            tableCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    // =========================================================================
    // KHỞI TẠO BỘ ĐIỀU KHIỂN & SỰ KIỆN
    // =========================================================================
    function initControls() {
        // 1. Period buttons
        document.querySelectorAll(".period-pill-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".period-pill-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentPeriod = btn.getAttribute("data-period");
                currentPage = 1;
                renderAll();
            });
        });

        // 2. Sort buttons
        document.querySelectorAll(".sort-opt-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".sort-opt-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                currentSort = btn.getAttribute("data-sort");
                currentPage = 1;
                renderAll();
            });
        });

        // 3. Category pills
        initCategoryPills();

        // 4. Search input
        if (rankingSearchInput) {
            rankingSearchInput.addEventListener("input", (e) => {
                currentSearch = e.target.value;
                currentPage = 1;
                renderAll();
            });
        }

        // Header search redirect or live filter
        const headerSearch = document.getElementById("search-input");
        if (headerSearch) {
            headerSearch.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    currentSearch = headerSearch.value;
                    if (rankingSearchInput) rankingSearchInput.value = currentSearch;
                    currentPage = 1;
                    renderAll();
                }
            });
        }

        // 5. View Mode Toggle
        const btnViewTable = document.getElementById("btn-view-table");
        const btnViewGrid = document.getElementById("btn-view-grid");
        if (btnViewTable && btnViewGrid) {
            btnViewTable.addEventListener("click", () => {
                btnViewTable.classList.add("active");
                btnViewGrid.classList.remove("active");
                currentViewMode = "table";
                renderAll();
            });
            btnViewGrid.addEventListener("click", () => {
                btnViewGrid.classList.add("active");
                btnViewTable.classList.remove("active");
                currentViewMode = "grid";
                renderAll();
            });
        }

        // 6. Modal close button
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener("click", closeMovieDetail);
        }
        if (playerModal) {
            playerModal.addEventListener("click", (e) => {
                if (e.target === playerModal) closeMovieDetail();
            });
        }

        // 7. Star rating selection
        initStarRating();

        // 8. Comment submission
        const btnSubmitComment = document.getElementById("btn-submit-comment");
        if (btnSubmitComment) {
            btnSubmitComment.addEventListener("click", handleCommentSubmit);
        }

        // 9. Login trigger from comment warning
        const btnTriggerLogin = document.getElementById("btn-trigger-login-comment");
        if (btnTriggerLogin) {
            btnTriggerLogin.addEventListener("click", () => openAuthModal("login"));
        }

        // 10. Auth Modal buttons
        initAuthModal();
    }

    function initCategoryPills() {
        if (!categoryPillsContainer) return;
        const categories = getCategories();

        let html = `<button class="rank-cat-pill active" data-category="all">Tất Cả Thể Loại</button>`;
        categories.forEach(cat => {
            html += `<button class="rank-cat-pill" data-category="${cat.id}">${cat.name}</button>`;
        });
        categoryPillsContainer.innerHTML = html;

        categoryPillsContainer.querySelectorAll(".rank-cat-pill").forEach(pill => {
            pill.addEventListener("click", () => {
                categoryPillsContainer.querySelectorAll(".rank-cat-pill").forEach(p => p.classList.remove("active"));
                pill.classList.add("active");
                currentCategory = pill.getAttribute("data-category");
                currentPage = 1;
                renderAll();
            });
        });
    }

    function resetFilters() {
        currentCategory = "all";
        currentSearch = "";
        currentPeriod = "today";
        currentSort = "trending";
        currentPage = 1;
        if (rankingSearchInput) rankingSearchInput.value = "";

        // Reset pills
        if (categoryPillsContainer) {
            categoryPillsContainer.querySelectorAll(".rank-cat-pill").forEach(p => {
                p.classList.toggle("active", p.getAttribute("data-category") === "all");
            });
        }
        document.querySelectorAll(".period-pill-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-period") === "today");
        });
        document.querySelectorAll(".sort-opt-btn").forEach(b => {
            b.classList.toggle("active", b.getAttribute("data-sort") === "trending");
        });
        renderAll();
    }

    // =========================================================================
    // MODAL CHI TIẾT PHIM
    // =========================================================================
    window.openMovieDetail = function(movieId) {
        activeMovieId = movieId;
        const movies = getMovies();
        const movie = movies.find(m => m.id === movieId);
        if (!movie) return;

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
        if (originalTitleEl) originalTitleEl.textContent = movie.originalTitle || "";
        if (directorEl) directorEl.textContent = movie.director || "Đang cập nhật";
        if (actorsEl) actorsEl.textContent = movie.actors || "Đang cập nhật";
        if (descEl) descEl.textContent = movie.description || "Nội dung đang được cập nhật.";

        if (tagsEl) {
            tagsEl.innerHTML = `
                <span class="detail-tag tag-category">${movie.categoryName || "Điện ảnh"}</span>
                <span class="detail-tag tag-year"><i class="fa-regular fa-calendar"></i> ${movie.year}</span>
                <span class="detail-tag tag-duration"><i class="fa-regular fa-clock"></i> ${movie.duration}</span>
                <span class="detail-tag tag-quality"><i class="fa-solid fa-tv"></i> ${movie.quality || "4K"}</span>
                <span class="detail-tag tag-rating"><i class="fa-solid fa-star"></i> ${movie.rating.toFixed(1)} / 5</span>
            `;
        }

        if (btnWatchNow) {
            btnWatchNow.onclick = () => {
                if (window.navigateToPage) {
                    window.navigateToPage(`watch.html?id=${movie.id}`, "Đang tải vui lòng chờ");
                } else {
                    window.location.href = `watch.html?id=${movie.id}`;
                }
            };
        }
        if (btnShare) {
            btnShare.onclick = () => {
                const url = `${window.location.origin}/watch.html?id=${movie.id}`;
                navigator.clipboard.writeText(url).then(() => {
                    showToast("Đã sao chép liên kết xem phim vào khay nhớ tạm!", "success");
                }).catch(() => {
                    showToast("Liên kết: " + url, "info");
                });
            };
        }

        // Render bình luận
        renderComments(movie);

        if (playerModal) {
            playerModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    function closeMovieDetail() {
        if (playerModal) {
            playerModal.classList.remove("active");
            document.body.style.overflow = "";
        }
        activeMovieId = null;
    }

    // =========================================================================
    // BÌNH LUẬN & ĐÁNH GIÁ
    // =========================================================================
    function renderComments(movie) {
        const authWarning = document.getElementById("auth-warning-box");
        const commentFormBox = document.getElementById("comment-form-box");
        const counterEl = document.getElementById("player-comment-counter");
        const avatarEl = document.getElementById("comment-current-avatar");

        const comments = movie.comments || [];
        if (counterEl) counterEl.textContent = `(${comments.length})`;

        const user = getCurrentUser();
        if (user) {
            if (authWarning) authWarning.style.display = "none";
            if (commentFormBox) {
                commentFormBox.style.display = "block";
                if (avatarEl) avatarEl.src = user.avatar;
            }
        } else {
            if (authWarning) authWarning.style.display = "flex";
            if (commentFormBox) commentFormBox.style.display = "none";
        }

        renderCommentsList(comments);
    }

    function renderCommentsList(comments) {
        const listContainer = document.getElementById("comments-list-container");
        if (!listContainer) return;

        if (!comments || comments.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 24px; color: var(--text-secondary); font-size: 13.5px;">
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

    function initStarRating() {
        const starContainer = document.getElementById("star-rating-select");
        const ratingText = document.getElementById("selected-rating-text");
        if (!starContainer) return;

        const stars = starContainer.querySelectorAll(".fa-star");
        stars.forEach(star => {
            star.addEventListener("click", () => {
                const rating = parseInt(star.getAttribute("data-rating"));
                selectedRating = rating;
                stars.forEach((s, idx) => {
                    if (idx < rating) {
                        s.classList.add("active");
                    } else {
                        s.classList.remove("active");
                    }
                });
                if (ratingText) ratingText.textContent = `(${rating} / 5 sao)`;
            });
        });
    }

    function handleCommentSubmit() {
        if (!isLoggedIn()) {
            showToast("Vui lòng đăng nhập để bình luận và đánh giá phim!", "error");
            openAuthModal("login");
            return;
        }

        const input = document.getElementById("comment-text-input");
        const text = input ? input.value.trim() : "";
        if (!text) {
            showToast("Vui lòng nhập nội dung bình luận của bạn!", "error");
            return;
        }

        if (!activeMovieId) return;
        const movies = getMovies();
        const movie = movies.find(m => m.id === activeMovieId);
        if (!movie) return;

        const user = getCurrentUser();
        const newComment = {
            id: "c" + Date.now(),
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            avatar: user.avatar,
            text: text,
            rating: selectedRating,
            createdAt: "Vừa xong"
        };

        if (!movie.comments) movie.comments = [];
        movie.comments.unshift(newComment);

        // Cập nhật lại rating trung bình
        const sum = movie.comments.reduce((acc, cur) => acc + (cur.rating || 5), 0);
        movie.rating = parseFloat((sum / movie.comments.length).toFixed(1));
        movie.ratingCount = (movie.ratingCount || 0) + 1;

        saveMovies(movies);
        showToast("Đã gửi bình luận & đánh giá thành công!", "success");
        if (input) input.value = "";

        renderComments(movie);
        renderAll(); // Cập nhật lại BXH
    }

    // =========================================================================
    // AUTH MODAL & HEADER UI
    // =========================================================================
    function updateHeaderAuthUI() {
        const user = getCurrentUser();
        const btnOpenLogin = document.getElementById("btn-open-login");
        const userProfileMenu = document.getElementById("user-profile-menu");
        const btnAdminNav = document.getElementById("btn-admin-nav");
        const headerUserAvatar = document.getElementById("header-user-avatar");
        const headerUserName = document.getElementById("header-user-name");
        const headerUserRole = document.getElementById("header-user-role");

        if (user) {
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

            if (user.role === "admin") {
                if (btnAdminNav) {
                    btnAdminNav.style.display = "inline-flex";
                    btnAdminNav.onclick = () => {
                        if (window.navigateToPage) {
                            window.navigateToPage("index.html", "Đang tải vui lòng chờ");
                        } else {
                            window.location.href = "index.html";
                        }
                    };
                }
            } else {
                if (btnAdminNav) btnAdminNav.style.display = "none";
            }
        } else {
            if (btnOpenLogin) btnOpenLogin.style.display = "inline-flex";
            if (userProfileMenu) userProfileMenu.style.display = "none";
            if (btnAdminNav) btnAdminNav.style.display = "none";
        }

        if (typeof window.updateMobileDrawerAuth === "function") {
            window.updateMobileDrawerAuth();
        }
    }

    function initAuthModal() {
        const authModal = document.getElementById("auth-modal");
        const btnOpenLogin = document.getElementById("btn-open-login");
        const modalAuthClose = document.getElementById("modal-auth-close");
        const tabLoginBtn = document.getElementById("tab-login-btn");
        const tabRegisterBtn = document.getElementById("tab-register-btn");
        const formLogin = document.getElementById("form-login");
        const formRegister = document.getElementById("form-register");
        const btnLogout = document.getElementById("btn-logout");

        if (btnOpenLogin) {
            btnOpenLogin.addEventListener("click", () => openAuthModal("login"));
        }
        if (modalAuthClose) {
            modalAuthClose.addEventListener("click", closeAuthModal);
        }
        if (authModal) {
            authModal.addEventListener("click", (e) => {
                if (e.target === authModal) closeAuthModal();
            });
        }

        if (tabLoginBtn && tabRegisterBtn && formLogin && formRegister) {
            tabLoginBtn.addEventListener("click", () => {
                tabLoginBtn.classList.add("active");
                tabRegisterBtn.classList.remove("active");
                formLogin.style.display = "block";
                formRegister.style.display = "none";
            });
            tabRegisterBtn.addEventListener("click", () => {
                tabRegisterBtn.classList.add("active");
                tabLoginBtn.classList.remove("active");
                formRegister.style.display = "block";
                formLogin.style.display = "none";
            });
        }

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
                        if (activeMovieId) {
                            const m = getMovies().find(x => x.id === activeMovieId);
                            if (m) renderComments(m);
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
                            const m = getMovies().find(x => x.id === activeMovieId);
                            if (m) renderComments(m);
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
                        const m = getMovies().find(x => x.id === activeMovieId);
                        if (m) renderComments(m);
                    }
                    if (window.hidePageLoading) {
                        window.hidePageLoading(300);
                    }
                    showToast("Đã đăng xuất tài khoản thành công!", "info");
                }, 600);
            });
        }

        const userAvatarBtn = document.getElementById("user-avatar-btn");
        const userDropdownContent = document.getElementById("user-dropdown-content");
        if (userAvatarBtn && userDropdownContent) {
            userAvatarBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                userDropdownContent.classList.toggle("show");
            });
            document.addEventListener("click", (e) => {
                if (!userAvatarBtn.contains(e.target) && !userDropdownContent.contains(e.target)) {
                    userDropdownContent.classList.remove("show");
                }
            });
        }
    }

    window.openAuthModal = function(tab = "login") {
        const authModal = document.getElementById("auth-modal");
        const tabLoginBtn = document.getElementById("tab-login-btn");
        const tabRegisterBtn = document.getElementById("tab-register-btn");
        const formLogin = document.getElementById("form-login");
        const formRegister = document.getElementById("form-register");

        if (tab === "register") {
            if (tabRegisterBtn) tabRegisterBtn.click();
        } else {
            if (tabLoginBtn) tabLoginBtn.click();
        }

        if (authModal) {
            authModal.classList.add("active");
            document.body.style.overflow = "hidden";
        }
    };

    function closeAuthModal() {
        const authModal = document.getElementById("auth-modal");
        if (authModal) {
            authModal.classList.remove("active");
            document.body.style.overflow = "";
        }
    }

    // =========================================================================
    // THEME & HEADER CATEGORIES
    // =========================================================================
    function initTheme() {
        const themeBtn = document.getElementById("theme-toggle-btn");
        const themeIcon = document.getElementById("theme-icon");
        const savedTheme = localStorage.getItem("coiphim_theme") || "dark";

        document.documentElement.setAttribute("data-theme", savedTheme);
        if (themeIcon) {
            themeIcon.className = savedTheme === "light" ? "fa-solid fa-moon" : "fa-solid fa-sun";
        }

        if (themeBtn) {
            themeBtn.addEventListener("click", () => {
                const current = document.documentElement.getAttribute("data-theme") || "dark";
                const target = current === "dark" ? "light" : "dark";
                document.documentElement.setAttribute("data-theme", target);
                localStorage.setItem("coiphim_theme", target);
                if (themeIcon) {
                    themeIcon.className = target === "light" ? "fa-solid fa-moon" : "fa-solid fa-sun";
                }
            });
        }
    }

    function initHeaderCategories() {
        const dropdown = document.getElementById("header-filter-dropdown");
        const filterBtn = document.getElementById("header-filter-btn");
        if (!dropdown || !filterBtn) return;

        const categories = getCategories();
        let html = `
            <div class="header-filter-item active" data-cat="all">
                <i class="fa-solid fa-border-all"></i> Tất Cả Thể Loại
            </div>
        `;
        categories.forEach(cat => {
            html += `
                <div class="header-filter-item" data-cat="${cat.id}">
                    <i class="${cat.icon || 'fa-solid fa-film'}"></i> ${cat.name}
                </div>
            `;
        });
        dropdown.innerHTML = html;

        filterBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("active");
        });

        document.addEventListener("click", (e) => {
            if (!dropdown.contains(e.target) && !filterBtn.contains(e.target)) {
                dropdown.classList.remove("active");
            }
        });

        dropdown.querySelectorAll(".header-filter-item").forEach(item => {
            item.addEventListener("click", () => {
                const cat = item.getAttribute("data-cat");
                currentCategory = cat;
                dropdown.classList.remove("active");

                // Cập nhật pills
                if (categoryPillsContainer) {
                    categoryPillsContainer.querySelectorAll(".rank-cat-pill").forEach(p => {
                        p.classList.toggle("active", p.getAttribute("data-category") === cat);
                    });
                }
                renderAll();
            });
        });
    }

    // =========================================================================
    // TIỆN ÍCH HỖ TRỢ
    // =========================================================================
    function removeVietnameseTones(str) {
        if (!str) return "";
        return str.normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d").replace(/Đ/g, "D")
            .toLowerCase();
    }

    function escapeHtml(text) {
        if (!text) return "";
        return text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function showToast(message, type = "info") {
        let toastContainer = document.getElementById("toast-container");
        if (!toastContainer) {
            toastContainer = document.createElement("div");
            toastContainer.id = "toast-container";
            toastContainer.className = "toast-container";
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement("div");
        toast.className = `toast-item toast-${type}`;
        
        let icon = "fa-solid fa-circle-info";
        if (type === "success") icon = "fa-solid fa-circle-check";
        if (type === "error") icon = "fa-solid fa-triangle-exclamation";

        toast.innerHTML = `<i class="${icon}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.classList.add("hide");
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }
});
