/**
 * page-transition.js - Quản lý hiệu ứng chuyển cảnh & loading điện ảnh mượt mà cho CoiPhim
 */

(function () {
    "use strict";

    // 1. Kiểm tra và tự động khởi tạo phần tử Loader nếu trang chưa có
    function ensureLoaderElement() {
        let loader = document.getElementById("splash-screen");
        if (!loader) {
            loader = document.createElement("div");
            loader.id = "splash-screen";
            loader.className = "page-loader";
            loader.innerHTML = `
                <div class="top-nav-progress" id="top-nav-progress"></div>
                <div class="splash-content">
                    <div class="splash-logo-wrapper">
                        <div class="splash-ring"></div>
                        <div class="splash-ring-inner"></div>
                        <img src="images/logo.png" alt="CoiPhim Logo" class="splash-logo-img">
                    </div>
                    <div class="splash-brand">
                        <span class="brand-coi">Coi</span><span class="brand-phim">Phim</span>
                    </div>
                    <div class="splash-message" id="splash-message">
                        <i class="fa-solid fa-spinner fa-spin" style="color: var(--color-gold); font-size: 15px;" id="splash-spinner"></i>
                        <span id="splash-text">Đang tải vui lòng chờ</span>
                        <span class="splash-dots">
                            <span>.</span><span>.</span><span>.</span>
                        </span>
                    </div>
                    <div class="splash-progress-bar">
                        <div class="splash-progress-fill" id="splash-progress-fill"></div>
                    </div>
                </div>
            `;
            if (document.body) {
                document.body.prepend(loader);
            }
        }
        return loader;
    }

    // 2. Hàm ẩn màn hình loading
    function hidePageLoading(delayMs = 350) {
        const loader = document.getElementById("splash-screen");
        if (!loader) return;
        setTimeout(() => {
            loader.classList.remove("fade-in");
            loader.classList.add("fade-out");
        }, delayMs);
    }

    // 3. Hàm hiển thị màn hình loading kèm thông điệp
    function showPageLoading(text = "Đang tải vui lòng chờ", iconClass = "fa-solid fa-spinner fa-spin") {
        const loader = ensureLoaderElement();
        if (!loader) return;

        const splashText = document.getElementById("splash-text");
        if (splashText) {
            // Chuẩn hóa văn bản thông báo: Luôn là "Đang tải vui lòng chờ" (phần dấu chấm sẽ do splash-dots đảm nhiệm)
            const cleanText = (text || "Đang tải vui lòng chờ").replace(/\.+$/, "");
            splashText.textContent = cleanText || "Đang tải vui lòng chờ";
        }

        const spinnerIcon = document.getElementById("splash-spinner");
        if (spinnerIcon) {
            spinnerIcon.className = "fa-solid fa-spinner fa-spin";
        }

        // Kích hoạt lại animation cho thanh tiến trình
        const progressFill = document.getElementById("splash-progress-fill");
        if (progressFill) {
            progressFill.style.animation = "none";
            progressFill.offsetHeight; // force reflow
            progressFill.style.animation = "fillProgress 0.6s ease-out forwards";
        }

        const topProgress = document.getElementById("top-nav-progress");
        if (topProgress) {
            topProgress.style.animation = "none";
            topProgress.offsetHeight; // force reflow
            topProgress.style.animation = "topProgressAnim 0.6s ease-out forwards";
        }

        loader.classList.remove("fade-out");
        loader.classList.add("fade-in");
    }

    // 4. Hàm điều hướng trang kèm hiệu ứng loading
    function navigateToPage(url, message = "") {
        if (!url || url === "#" || url.startsWith("javascript:")) return;

        showPageLoading("Đang tải vui lòng chờ");

        // Đợi 280ms để hiệu ứng loading mượt mà hiển thị rồi mới chuyển URL
        setTimeout(() => {
            window.location.href = url;
        }, 280);
    }

    // Xuất hàm ra global để mọi script khác đều gọi được
    window.navigateToPage = navigateToPage;
    window.showPageLoading = showPageLoading;
    window.hidePageLoading = hidePageLoading;

    // 5. Tự động ẩn loader khi trang tải xong & khởi tạo Mobile Navigation Drawer
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            ensureLoaderElement();
            hidePageLoading(350);
            initMobileDrawer();
        });
    } else {
        ensureLoaderElement();
        hidePageLoading(350);
        initMobileDrawer();
    }

    // 6. Bắt sự kiện click trên toàn bộ liên kết <a> nội bộ
    document.addEventListener("click", (e) => {
        const link = e.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href) return;

        // Bỏ qua anchor nội bộ trong cùng 1 trang (ví dụ: #catalog-section khi đang ở index.html)
        if (href.startsWith("#") || href.startsWith("javascript:") || href.startsWith("mailto:") || href.startsWith("tel:")) {
            return;
        }

        // Bỏ qua nếu người dùng mở tab mới hoặc nhấn kèm phím Ctrl / Meta / Shift
        if (link.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
            return;
        }

        // Kiểm tra xem có phải link chuyển trang nội bộ của website CoiPhim không
        const isInternal = href.includes("ranking.html") || href.includes("watch.html") || href.includes("index.html") || href === "/" || href === "./";
        if (isInternal) {
            e.preventDefault();
            navigateToPage(href, "Đang tải vui lòng chờ");
        }
    });

    // 7. Xử lý khi người dùng ấn nút Back / Forward trên trình duyệt (bfcache)
    window.addEventListener("pageshow", (e) => {
        hidePageLoading(80);
        if (window.updateMobileDrawerAuth) window.updateMobileDrawerAuth();
    });

    // =========================================================================
    // 8. ĐIỀU KHIỂN MOBILE NAVIGATION DRAWER (RESPONSIVE CHO MOBILE & TABLET)
    // =========================================================================
    function initMobileDrawer() {
        const menuBtn = document.getElementById("mobile-menu-btn");
        const drawer = document.getElementById("mobile-nav-drawer");
        const overlay = document.getElementById("mobile-drawer-overlay");
        const closeBtn = document.getElementById("mobile-drawer-close");
        const accordionToggle = document.getElementById("mobile-accordion-toggle");
        const accordion = document.getElementById("mobile-drawer-accordion");
        const genresList = document.getElementById("mobile-genres-list");
        const mobileThemeToggle = document.getElementById("mobile-theme-toggle");
        const mobileThemeIcon = document.getElementById("mobile-theme-icon");
        const mobileThemeText = document.getElementById("mobile-theme-text");
        const mobileUserSection = document.getElementById("mobile-user-section");
        const mobileSearchInput = document.getElementById("mobile-search-input");

        if (!menuBtn || !drawer) return;

        function openDrawer() {
            drawer.classList.add("active");
            document.body.classList.add("drawer-open");
            updateMobileAuthAndTheme();
        }

        function closeDrawer() {
            drawer.classList.remove("active");
            document.body.classList.remove("drawer-open");
        }

        menuBtn.addEventListener("click", openDrawer);
        if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
        if (overlay) overlay.addEventListener("click", closeDrawer);

        // Đóng khi nhấn Escape
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && drawer.classList.contains("active")) {
                closeDrawer();
            }
        });

        // Accordion Thể loại
        if (accordionToggle && accordion) {
            accordionToggle.addEventListener("click", () => {
                accordion.classList.toggle("open");
            });
        }

        // Render thể loại vào Mobile Drawer
        if (genresList && typeof getCategories === "function") {
            const categories = getCategories();
            const categoryIcons = {
                "all": "fa-solid fa-layer-group",
                "action": "fa-solid fa-fire",
                "sci-fi": "fa-solid fa-rocket",
                "romance": "fa-solid fa-heart",
                "horror": "fa-solid fa-ghost",
                "animation": "fa-solid fa-wand-magic-sparkles",
                "comedy": "fa-solid fa-face-laugh-squint",
                "costume": "fa-solid fa-crown",
                "thriller": "fa-solid fa-mask"
            };

            let html = "";
            categories.forEach(cat => {
                const icon = categoryIcons[cat.id] || "fa-solid fa-film";
                html += `
                    <a href="index.html#catalog-section" class="mobile-genre-item" data-cat="${cat.id}">
                        <i class="${icon}"></i> <span>${cat.name}</span>
                    </a>
                `;
            });
            genresList.innerHTML = html;

            genresList.querySelectorAll(".mobile-genre-item").forEach(item => {
                item.addEventListener("click", (e) => {
                    const catId = item.getAttribute("data-cat");
                    closeDrawer();

                    // Nếu đang ở trang chủ index.html, trigger lọc thể loại
                    if (window.location.pathname.endsWith("index.html") || window.location.pathname === "/" || !window.location.pathname.includes(".html")) {
                        e.preventDefault();
                        if (typeof window.filterByCategory === "function") {
                            window.filterByCategory(catId);
                            const catalogSec = document.getElementById("catalog-section");
                            if (catalogSec) catalogSec.scrollIntoView({ behavior: "smooth" });
                        }
                    }
                });
            });
        }

        // Tìm kiếm trên Mobile Drawer
        if (mobileSearchInput) {
            mobileSearchInput.addEventListener("keyup", (e) => {
                if (e.key === "Enter") {
                    const q = mobileSearchInput.value.trim();
                    if (!q) return;
                    closeDrawer();

                    const mainSearch = document.getElementById("search-input");
                    if (mainSearch) {
                        mainSearch.value = q;
                        mainSearch.dispatchEvent(new Event("input"));
                        mainSearch.dispatchEvent(new KeyboardEvent("keyup", { key: "Enter" }));
                        const catalogSec = document.getElementById("catalog-section");
                        if (catalogSec) catalogSec.scrollIntoView({ behavior: "smooth" });
                    } else {
                        navigateToPage(`index.html#catalog-section`, "Đang tải vui lòng chờ");
                    }
                }
            });
        }

        // Cập nhật Auth & Theme cho mobile drawer
        function updateMobileAuthAndTheme() {
            // Theme sync
            const currentTheme = document.documentElement.getAttribute("data-theme") || localStorage.getItem("coiphim_theme") || "dark";
            if (mobileThemeIcon && mobileThemeText) {
                if (currentTheme === "light") {
                    mobileThemeIcon.className = "fa-solid fa-moon";
                    mobileThemeText.textContent = "Chế độ tối";
                } else {
                    mobileThemeIcon.className = "fa-solid fa-sun";
                    mobileThemeText.textContent = "Chế độ sáng";
                }
            }

            // Auth sync
            if (mobileUserSection) {
                const user = (typeof getCurrentUser === "function") ? getCurrentUser() : null;
                if (user) {
                    const roleBadge = user.role === "admin"
                        ? `<span class="user-role-badge role-admin">Admin</span>`
                        : `<span class="user-role-badge role-user">Thành viên</span>`;

                    let adminBtnHtml = "";
                    if (user.role === "admin") {
                        adminBtnHtml = `
                            <button class="mobile-drawer-btn btn-mob-admin" id="mobile-btn-admin">
                                <i class="fa-solid fa-shield-halved" style="color: var(--color-gold);"></i> Quản Trị Hệ Thống
                            </button>
                        `;
                    }

                    mobileUserSection.innerHTML = `
                        <div class="mobile-user-card">
                            <img src="${user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}" alt="Avatar" class="mobile-user-avatar">
                            <div class="mobile-user-meta">
                                <div class="mobile-user-name">${user.fullName || user.username}</div>
                                <div class="mobile-user-role">${roleBadge}</div>
                            </div>
                        </div>
                        ${adminBtnHtml}
                        <button class="mobile-drawer-btn btn-mob-logout" id="mobile-btn-logout">
                            <i class="fa-solid fa-right-from-bracket"></i> Đăng Xuất
                        </button>
                    `;

                    const mobBtnAdmin = document.getElementById("mobile-btn-admin");
                    if (mobBtnAdmin) {
                        mobBtnAdmin.addEventListener("click", () => {
                            closeDrawer();
                            if (typeof window.openAdminModal === "function") {
                                window.openAdminModal();
                            } else {
                                navigateToPage("index.html", "Đang tải vui lòng chờ");
                            }
                        });
                    }

                    const mobBtnLogout = document.getElementById("mobile-btn-logout");
                    if (mobBtnLogout) {
                        mobBtnLogout.addEventListener("click", () => {
                            closeDrawer();
                            if (typeof logoutUser === "function") {
                                if (window.showPageLoading) window.showPageLoading("Đang tải vui lòng chờ");
                                setTimeout(() => {
                                    logoutUser();
                                    if (typeof updateHeaderAuthUI === "function") updateHeaderAuthUI();
                                    updateMobileAuthAndTheme();
                                    if (window.hidePageLoading) window.hidePageLoading(300);
                                    if (typeof showToast === "function") showToast("Đã đăng xuất!", "info");
                                }, 500);
                            }
                        });
                    }
                } else {
                    mobileUserSection.innerHTML = `
                        <button class="mobile-drawer-btn btn-mob-login" id="mobile-btn-login">
                            <i class="fa-regular fa-user"></i> Đăng Nhập / Đăng Ký
                        </button>
                    `;

                    const mobBtnLogin = document.getElementById("mobile-btn-login");
                    if (mobBtnLogin) {
                        mobBtnLogin.addEventListener("click", () => {
                            closeDrawer();
                            if (typeof window.openAuthModal === "function") {
                                window.openAuthModal("login");
                            }
                        });
                    }
                }
            }
        }

        // Theme toggle button click on mobile
        if (mobileThemeToggle) {
            mobileThemeToggle.addEventListener("click", () => {
                const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
                const newTheme = currentTheme === "dark" ? "light" : "dark";

                document.documentElement.setAttribute("data-theme", newTheme);
                localStorage.setItem("coiphim_theme", newTheme);

                // Đồng bộ desktop theme button
                const desktopThemeIcon = document.getElementById("theme-icon");
                if (desktopThemeIcon) {
                    desktopThemeIcon.className = newTheme === "dark" ? "fa-solid fa-sun" : "fa-solid fa-moon";
                }

                updateMobileAuthAndTheme();
            });
        }

        // Cập nhật trạng thái ban đầu
        updateMobileAuthAndTheme();

        // Xuất ra window để auth updates có thể trigger
        window.updateMobileDrawerAuth = updateMobileAuthAndTheme;
    }
})();
