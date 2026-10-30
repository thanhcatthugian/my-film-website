/**
 * watch.js - Logic điều khiển trang xem phim chi tiết CoiPhim (watch.html)
 */

let currentMovie = null;
let currentRatingValue = 5;
let currentSidebarRankingPeriod = "today"; // today, month, season

// ==========================================================================
// 1. KHỞI TẠO DỮ LIỆU & GIAO DIỆN XEM PHIM
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Theme & Auth
    initTheme();
    updateHeaderAuthUI();

    // 2. Lấy ID phim từ URL Query Parameter
    const urlParams = new URLSearchParams(window.location.search);
    const movieId = urlParams.get("id");

    const movies = getMovies();
    if (!movies || movies.length === 0) {
        window.location.href = "index.html";
        return;
    }

    currentMovie = movies.find(m => m.id === movieId);
    if (!currentMovie) {
        // Nếu ID không hợp lệ, chuyển về phim đầu tiên
        currentMovie = movies[0];
    }

    // 3. Tăng lượt xem phim khi vào trang xem
    currentMovie.viewsToday = (currentMovie.viewsToday || 0) + 1;
    currentMovie.viewsMonth = (currentMovie.viewsMonth || 0) + 1;
    currentMovie.viewsSeason = (currentMovie.viewsSeason || 0) + 1;
    saveMovies(movies);

    // 4. Cập nhật Title trang
    document.title = `${currentMovie.title} - CoiPhim`;

    // 5. Render toàn bộ dữ liệu trang xem phim
    renderWatchMovieDetails(currentMovie);
    loadPlayerSource("main", currentMovie);
    setupCommentSection(currentMovie);
    renderRelatedMovies(currentMovie);
    renderSidebarRanking("today");

    // 6. Sự kiện chọn Server nguồn phát
    const btnServerMain = document.getElementById("btn-server-main");
    if (btnServerMain) {
        btnServerMain.onclick = () => loadPlayerSource("main", currentMovie);
    }
    const btnServerTrailer = document.getElementById("btn-server-trailer");
    if (btnServerTrailer) {
        btnServerTrailer.onclick = () => loadPlayerSource("trailer", currentMovie);
    }

    // 7. Chế độ Rạp Phim (Cinema Mode)
    const btnCinemaMode = document.getElementById("btn-cinema-mode");
    const layoutGrid = document.querySelector(".watch-layout-grid");
    if (btnCinemaMode && layoutGrid) {
        btnCinemaMode.onclick = () => {
            layoutGrid.classList.toggle("cinema-mode");
            if (layoutGrid.classList.contains("cinema-mode")) {
                btnCinemaMode.innerHTML = `<i class="fa-solid fa-compress"></i> Thu Gọn`;
                showToast("Đã bật chế độ Rạp Chiếu Phim mở rộng", "info");
            } else {
                btnCinemaMode.innerHTML = `<i class="fa-solid fa-expand"></i> Rạp Phim`;
            }
        };
    }

    // 8. Tương tác chọn 1 đến 5 sao
    initStarRating();

    // 9. Nút gửi bình luận
    const btnSubmitComment = document.getElementById("btn-submit-comment");
    if (btnSubmitComment) {
        btnSubmitComment.onclick = handleWatchCommentSubmit;
    }

    // 10. Nút đăng nhập từ cảnh báo comment
    const btnTriggerLoginComment = document.getElementById("btn-trigger-login-comment");
    if (btnTriggerLoginComment) {
        btnTriggerLoginComment.onclick = () => openAuthModal("login");
    }

    // 11. Tabs Bảng Xếp Hạng ở Sidebar
    document.querySelectorAll(".sidebar-tab-btn").forEach(btn => {
        btn.onclick = () => {
            const period = btn.getAttribute("data-period");
            renderSidebarRanking(period);
        };
    });

    // 12. Modal Auth Events
    setupAuthModalEvents();

    // 13. Header Filter Dropdown
    initWatchHeaderFilter();
});

function initWatchHeaderFilter() {
    const categories = getCategories();
    const dropdown = document.getElementById("header-filter-dropdown");
    const wrap = document.getElementById("header-filter-wrap");
    const btn = document.getElementById("header-filter-btn");

    if (btn && wrap) {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            wrap.classList.toggle("open");
        });

        document.addEventListener("click", (e) => {
            if (!wrap.contains(e.target)) {
                wrap.classList.remove("open");
            }
        });
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
                const iconClass = (cat.id === "all" ? "fa-solid fa-layer-group" :
                                   cat.id === "action" ? "fa-solid fa-fire" :
                                   cat.id === "sci-fi" ? "fa-solid fa-rocket" :
                                   cat.id === "romance" ? "fa-solid fa-heart" :
                                   cat.id === "horror" ? "fa-solid fa-ghost" :
                                   cat.id === "animation" ? "fa-solid fa-wand-magic-sparkles" :
                                   cat.id === "comedy" ? "fa-solid fa-face-laugh-squint" :
                                   cat.id === "period" ? "fa-solid fa-scroll" : "fa-solid fa-masks-theater");
                return `
                    <a href="index.html?category=${cat.id}#catalog-section" class="header-filter-item">
                        <i class="${iconClass}"></i>
                        <span>${cat.name}</span>
                    </a>
                `;
            }).join("")}
        </div>
    `;
}

// ==========================================================================
// 2. RENDER CHI TIẾT PHIM Ở DƯỚI PHẦN PHIM
// ==========================================================================
function renderWatchMovieDetails(movie) {
    // Breadcrumb
    const bcCat = document.getElementById("breadcrumb-category");
    const bcTitle = document.getElementById("breadcrumb-title");
    if (bcCat) bcCat.textContent = movie.categoryName;
    if (bcTitle) bcTitle.textContent = movie.title;

    // Tiêu đề & Thông tin
    const titleEl = document.getElementById("watch-movie-title");
    const originalEl = document.getElementById("watch-movie-original");
    const viewsEl = document.getElementById("watch-views-count");
    const ratingVal = document.getElementById("watch-rating-val");
    const qualityTag = document.getElementById("watch-quality-tag");
    const yearTag = document.getElementById("watch-year-tag");
    const durationTag = document.getElementById("watch-duration-tag");
    const categoryTag = document.getElementById("watch-category-tag");
    const directorEl = document.getElementById("watch-director");
    const actorsEl = document.getElementById("watch-actors");
    const descEl = document.getElementById("watch-description");

    if (titleEl) titleEl.textContent = movie.title;
    if (originalEl) originalEl.textContent = movie.originalTitle || movie.title;
    if (viewsEl) viewsEl.textContent = (movie.viewsToday || 0).toLocaleString("vi-VN");
    if (ratingVal) ratingVal.textContent = movie.rating.toFixed(1);
    if (qualityTag) qualityTag.innerHTML = `<i class="fa-solid fa-tv"></i> ${movie.quality}`;
    if (yearTag) yearTag.innerHTML = `<i class="fa-regular fa-calendar"></i> ${movie.year}`;
    if (durationTag) durationTag.innerHTML = `<i class="fa-regular fa-clock"></i> ${movie.duration}`;
    if (categoryTag) categoryTag.innerHTML = `<i class="fa-solid fa-tags"></i> ${movie.categoryName}`;
    if (directorEl) directorEl.textContent = movie.director || "Đang cập nhật";
    if (actorsEl) actorsEl.textContent = movie.actors || "Đang cập nhật";
    if (descEl) descEl.textContent = movie.description;
}

// ==========================================================================
// 3. TRÌNH PHÁT VIDEO & CHỌN NGUỒN PHÁT
// ==========================================================================
function loadPlayerSource(sourceType, movie) {
    const videoEl = document.getElementById("html5-video-player");
    const videoSrc = document.getElementById("html5-video-source");
    const trailerIframe = document.getElementById("trailer-iframe");
    const btnServerMain = document.getElementById("btn-server-main");
    const btnServerTrailer = document.getElementById("btn-server-trailer");

    if (sourceType === "main") {
        if (trailerIframe) {
            trailerIframe.src = "";
            trailerIframe.style.display = "none";
        }
        if (videoEl && videoSrc) {
            videoEl.style.display = "block";
            videoSrc.src = movie.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
            videoEl.load();
        }
        if (btnServerMain) btnServerMain.classList.add("active");
        if (btnServerTrailer) btnServerTrailer.classList.remove("active");
    } else {
        if (videoEl) {
            videoEl.pause();
            videoEl.style.display = "none";
        }
        if (trailerIframe) {
            trailerIframe.style.display = "block";
            let trailerEmbed = movie.trailerUrl || "https://www.youtube.com/embed/Way9Dexny3w";
            if (!trailerEmbed.includes("embed") && trailerEmbed.includes("watch?v=")) {
                trailerEmbed = trailerEmbed.replace("watch?v=", "embed/");
            }
            trailerIframe.src = trailerEmbed;
        }
        if (btnServerMain) btnServerMain.classList.remove("active");
        if (btnServerTrailer) btnServerTrailer.classList.add("active");
    }
}

// ==========================================================================
// 4. GỢI Ý PHIM LIÊN QUAN (CÙNG THỂ LOẠI HOẶC GỢI Ý KHÁC)
// ==========================================================================
function renderRelatedMovies(currentMovie) {
    const listEl = document.getElementById("related-movies-list");
    if (!listEl) return;

    const movies = getMovies();
    // Lấy phim cùng category trừ phim hiện tại
    let related = movies.filter(m => m.id !== currentMovie.id && m.category === currentMovie.category);

    // Nếu ít hơn 4 phim thì bổ sung các phim nổi bật khác
    if (related.length < 4) {
        const others = movies.filter(m => m.id !== currentMovie.id && m.category !== currentMovie.category);
        related = [...related, ...others].slice(0, 5);
    } else {
        related = related.slice(0, 5);
    }

    listEl.innerHTML = related.map(m => {
        return `
            <div class="related-movie-item" onclick="goToMovie('${m.id}')">
                <img src="${m.poster}" alt="${m.title}" class="related-poster" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                <div class="related-info">
                    <h4 class="related-title" title="${m.title}">${m.title}</h4>
                    <div class="related-meta">
                        <span class="related-rating"><i class="fa-solid fa-star"></i> ${m.rating.toFixed(1)}</span>
                        <span>${m.year}</span>
                        <span style="color: var(--color-lapis);">${m.categoryName}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function goToMovie(id) {
    if (window.navigateToPage) {
        window.navigateToPage(`watch.html?id=${id}`, "Đang tải vui lòng chờ");
    } else {
        window.location.href = `watch.html?id=${id}`;
    }
}

// ==========================================================================
// 5. BẢNG XẾP HẠNG THỊNH HÀNH Ở SIDEBAR (NGÀY, THÁNG, MÙA)
// ==========================================================================
function renderSidebarRanking(period = "today") {
    currentSidebarRankingPeriod = period;
    const listEl = document.getElementById("sidebar-ranking-list");
    if (!listEl) return;

    const movies = [...getMovies()];
    let viewKey = "viewsToday";
    if (period === "month") viewKey = "viewsMonth";
    else if (period === "season") viewKey = "viewsSeason";

    movies.sort((a, b) => (b[viewKey] || 0) - (a[viewKey] || 0));

    // Cập nhật active tab
    document.querySelectorAll(".sidebar-tab-btn").forEach(btn => {
        if (btn.getAttribute("data-period") === period) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    const topList = movies.slice(0, 6);

    listEl.innerHTML = topList.map((m, index) => {
        const rank = index + 1;
        const topClass = rank === 1 ? "top-1" : rank === 2 ? "top-2" : rank === 3 ? "top-3" : "";
        const viewsFormatted = (m[viewKey] || 0).toLocaleString("vi-VN");

        return `
            <div class="sidebar-rank-item" onclick="goToMovie('${m.id}')">
                <div class="sidebar-rank-num ${topClass}">#${rank}</div>
                <img src="${m.poster}" alt="${m.title}" class="sidebar-rank-poster" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                <div class="sidebar-rank-details">
                    <div class="sidebar-rank-title" title="${m.title}">${m.title}</div>
                    <div class="sidebar-rank-views"><i class="fa-solid fa-eye" style="color: var(--color-ruby); font-size: 10px;"></i> ${viewsFormatted} xem</div>
                </div>
            </div>
        `;
    }).join("");
}

// ==========================================================================
// 6. KHU VỰC BÌNH LUẬN & ĐÁNH GIÁ PHIM
// ==========================================================================
function setupCommentSection(movie) {
    const authWarningBox = document.getElementById("auth-warning-box");
    const commentFormBox = document.getElementById("comment-form-box");
    const commentCounter = document.getElementById("player-comment-counter");
    const commentCurrentAvatar = document.getElementById("comment-current-avatar");

    const comments = movie.comments || [];
    if (commentCounter) {
        commentCounter.textContent = `(${comments.length})`;
    }

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

function initStarRating() {
    const starContainer = document.getElementById("star-rating-select");
    const selectedRatingText = document.getElementById("selected-rating-text");
    if (!starContainer) return;

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

function handleWatchCommentSubmit() {
    if (!isLoggedIn()) {
        showToast("Vui lòng đăng nhập để gửi bình luận và đánh giá!", "error");
        openAuthModal("login");
        return;
    }

    const commentTextInput = document.getElementById("comment-text-input");
    const text = commentTextInput ? commentTextInput.value.trim() : "";

    if (!text) {
        showToast("Vui lòng nhập nội dung bình luận của bạn!", "error");
        return;
    }

    if (!currentMovie) return;

    const movies = getMovies();
    const movie = movies.find(m => m.id === currentMovie.id);
    if (!movie) return;

    const user = getCurrentUser();

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

    // Tính lại rating trung bình
    const oldRating = movie.rating || 5;
    const oldCount = movie.ratingCount || 100;
    const newCount = oldCount + 1;
    const updatedRating = Math.round(((oldRating * oldCount + currentRatingValue) / newCount) * 10) / 10;
    movie.rating = updatedRating;
    movie.ratingCount = newCount;

    saveMovies(movies);
    currentMovie = movie;

    // Cập nhật giao diện
    commentTextInput.value = "";
    setupCommentSection(movie);

    const ratingVal = document.getElementById("watch-rating-val");
    if (ratingVal) ratingVal.textContent = movie.rating.toFixed(1);

    showToast(`Đã gửi bình luận và đánh giá ${currentRatingValue} sao thành công!`, "success");
}

// ==========================================================================
// 7. TIỆN ÍCH AUTH & THEME & TOAST
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
        }
    } else {
        if (btnOpenLogin) btnOpenLogin.style.display = "inline-flex";
        if (userProfileMenu) userProfileMenu.style.display = "none";
        if (btnAdminNav) btnAdminNav.style.display = "none";
    }

    // Đồng bộ trạng thái đăng nhập cho Trợ lý AI The Watcher
    if (typeof window.updateWatcherAuthState === "function") {
        window.updateWatcherAuthState();
    }
}

function setupAuthModalEvents() {
    const btnOpenLogin = document.getElementById("btn-open-login");
    if (btnOpenLogin) btnOpenLogin.onclick = () => openAuthModal("login");

    const modalAuthClose = document.getElementById("modal-auth-close");
    if (modalAuthClose) modalAuthClose.onclick = closeAuthModal;

    const authModal = document.getElementById("auth-modal");
    if (authModal) {
        authModal.onclick = (e) => {
            if (e.target === authModal) closeAuthModal();
        };
    }

    const tabLoginBtn = document.getElementById("tab-login-btn");
    if (tabLoginBtn) tabLoginBtn.onclick = () => switchAuthTab("login");

    const tabRegisterBtn = document.getElementById("tab-register-btn");
    if (tabRegisterBtn) tabRegisterBtn.onclick = () => switchAuthTab("register");

    const formLogin = document.getElementById("form-login");
    if (formLogin) {
        formLogin.onsubmit = (e) => {
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
                    if (currentMovie) setupCommentSection(currentMovie);
                    if (window.hidePageLoading) {
                        window.hidePageLoading(300);
                    }
                    showToast(res.message, "success");
                }, 750);
            } else {
                showToast(res.message, "error");
            }
        };
    }

    const formRegister = document.getElementById("form-register");
    if (formRegister) {
        formRegister.onsubmit = (e) => {
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
                    if (currentMovie) setupCommentSection(currentMovie);
                    if (window.hidePageLoading) {
                        window.hidePageLoading(300);
                    }
                    showToast(res.message, "success");
                }, 750);
            } else {
                showToast(res.message, "error");
            }
        };
    }

    const btnLogout = document.getElementById("btn-logout");
    if (btnLogout) {
        btnLogout.onclick = () => {
            if (window.showPageLoading) {
                window.showPageLoading("Đang tải vui lòng chờ");
            }
            setTimeout(() => {
                logoutUser();
                updateHeaderAuthUI();
                if (window.watcherUpdateAuthStatus) window.watcherUpdateAuthStatus();
                if (currentMovie) setupCommentSection(currentMovie);
                if (window.hidePageLoading) {
                    window.hidePageLoading(300);
                }
                showToast("Đã đăng xuất!", "info");
            }, 600);
        };
    }

    const userAvatarBtn = document.getElementById("user-avatar-btn");
    const userDropdownContent = document.getElementById("user-dropdown-content");
    if (userAvatarBtn && userDropdownContent) {
        userAvatarBtn.onclick = (e) => {
            e.stopPropagation();
            userDropdownContent.classList.toggle("show");
        };
        document.addEventListener("click", () => {
            userDropdownContent.classList.remove("show");
        });
    }

    // Search Box trên header trang watch
    const searchInput = document.getElementById("search-input");
    if (searchInput) {
        searchInput.onkeydown = (e) => {
            if (e.key === "Enter") {
                if (window.navigateToPage) {
                    window.navigateToPage("index.html#catalog-section", "Đang tải vui lòng chờ");
                } else {
                    window.location.href = `index.html#catalog-section`;
                }
            }
        };
    }
}

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

function escapeHtml(unsafe) {
    if (!unsafe) return "";
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
