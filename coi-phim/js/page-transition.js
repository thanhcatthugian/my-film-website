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

    // 5. Tự động ẩn loader khi trang tải xong
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", () => {
            ensureLoaderElement();
            hidePageLoading(350);
        });
    } else {
        ensureLoaderElement();
        hidePageLoading(350);
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
    });
})();
