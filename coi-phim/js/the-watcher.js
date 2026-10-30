/**
 * ==============================================================================
 * THE WATCHER - TRỢ LÝ AI ĐIỆN ẢNH THÔNG MINH CHO COIPHIM
 * ==============================================================================
 * - Tạo hình: Chú bot Robot The Watcher mắt cười, mang dải phim phát sáng.
 * - Chức năng: Gợi ý, phân tích và tìm phim thông minh theo miêu tả tự nhiên của người dùng.
 * - Bảo mật: Yêu cầu người dùng ĐĂNG NHẬP để có thể trò chuyện cùng The Watcher.
 * - Tương thích: Hoạt động trơn tru trên cả Trang Chủ (index.html) và Trang Xem Phim (watch.html).
 * ==============================================================================
 */

(function () {
    "use strict";

    // Khởi tạo trạng thái The Watcher
    let isWatcherOpen = false;
    let chatHistory = [];
    let isBotTyping = false;

    // Gắn sự kiện khi DOM đã sẵn sàng
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initTheWatcher);
    } else {
        initTheWatcher();
    }

    /**
     * 1. KHỞI TẠO THE WATCHER VÀ BƠM HTML VÀO TRANG WEB
     */
    function initTheWatcher() {
        if (document.getElementById("the-watcher-widget")) return;

        // Bơm HTML Widget vào body
        const widgetContainer = document.createElement("div");
        widgetContainer.id = "the-watcher-widget";
        widgetContainer.className = "watcher-widget-root";
        widgetContainer.innerHTML = createWatcherHTML();
        document.body.appendChild(widgetContainer);

        // Đăng ký các sự kiện tương tác
        bindWatcherEvents();

        // Cập nhật trạng thái xác thực ban đầu (Đã đăng nhập hay chưa)
        updateWatcherAuthState();

        // Hiện bong bóng chào mời sau 2.5 giây
        setTimeout(() => {
            const bubble = document.getElementById("watcher-speech-bubble");
            if (bubble && !isWatcherOpen) {
                bubble.classList.add("visible");
            }
        }, 2500);
    }

    /**
     * 2. TẠO CẤU TRÚC HTML CHO THE WATCHER
     */
    function createWatcherHTML() {
        return `
            <!-- NÚT NỔI FAB THE WATCHER -->
            <div class="watcher-fab-wrapper">
                <button class="watcher-fab-btn" id="watcher-toggle-btn" aria-label="Trợ lý AI The Watcher" title="Trò chuyện cùng The Watcher">
                    <div class="watcher-fab-glow"></div>
                    <img src="images/the-watcher.png" alt="The Watcher AI" class="watcher-fab-avatar">
                    <span class="watcher-online-pulse" title="The Watcher đang online"></span>
                </button>

                <!-- Bong bóng lời thoại chào mời -->
                <div class="watcher-speech-bubble" id="watcher-speech-bubble">
                    <div class="watcher-bubble-text" id="watcher-bubble-text">
                        Xin chào! Tôi là The Watcher ✨
                    </div>
                    <button class="watcher-bubble-close" id="watcher-bubble-close" title="Đóng bong bóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>

            <!-- CỬA SỔ KHUNG CHAT THE WATCHER -->
            <div class="watcher-chat-window" id="watcher-chat-window" style="display: none;">
                <!-- Header của The Watcher -->
                <div class="watcher-header">
                    <div class="watcher-header-left">
                        <div class="watcher-avatar-wrap">
                            <img src="images/the-watcher.png" alt="The Watcher" class="watcher-avatar-img">
                            <span class="watcher-status-dot"></span>
                        </div>
                        <div class="watcher-title-wrap">
                            <h3 class="watcher-name">The Watcher <span class="watcher-ai-badge"><i class="fa-solid fa-wand-magic-sparkles"></i> AI</span></h3>
                            <p class="watcher-sub">Trợ lý gợi ý phim CoiPhim</p>
                        </div>
                    </div>
                    <div class="watcher-header-actions">
                        <button class="watcher-btn-icon" id="watcher-btn-close" title="Thu nhỏ khung chat">
                            <i class="fa-solid fa-chevron-down"></i>
                        </button>
                    </div>
                </div>

                <!-- Thân khung chat (Chứa Auth Gate hoặc Chat Messages) -->
                <div class="watcher-body" id="watcher-body">
                    <!-- GIAO DIỆN KHÓA: YÊU CẦU ĐĂNG NHẬP -->
                    <div class="watcher-auth-gate" id="watcher-auth-gate" style="display: none;">
                        <div class="watcher-gate-avatar-box">
                            <img src="images/the-watcher.png" alt="The Watcher" class="watcher-gate-avatar">
                            <div class="watcher-gate-glow"></div>
                        </div>
                        <h4 class="watcher-gate-title">The Watcher Đang Đợi Bạn!</h4>
                        <p class="watcher-gate-desc">
                            Tôi là <strong>The Watcher</strong> – trợ lý AI điện ảnh thông minh của CoiPhim. Để tôi có thể tư vấn, ghi nhớ và gợi ý phim theo đúng sở thích của bạn, hãy đăng nhập tài khoản nhé!
                        </p>
                        <button class="btn-watcher-login" id="btn-watcher-login-trigger">
                            <i class="fa-solid fa-right-to-bracket"></i> Đăng Nhập Để Trò Chuyện
                        </button>
                        <div class="watcher-gate-footer">
                            Chưa có tài khoản? <a href="javascript:void(0)" id="btn-watcher-register-trigger">Đăng ký ngay</a>
                        </div>
                    </div>

                    <!-- GIAO DIỆN HỘI THOẠI KHI ĐÃ ĐĂNG NHẬP -->
                    <div class="watcher-chat-messages" id="watcher-chat-messages">
                        <!-- Danh sách tin nhắn trò chuyện -->
                    </div>
                </div>

                <!-- Thanh Quick Chips gợi ý câu hỏi nhanh -->
                <div class="watcher-chips-wrapper" id="watcher-chips-wrapper">
                    <div class="watcher-chips-label"><i class="fa-solid fa-bolt" style="color: var(--color-gold);"></i> Gợi ý nhanh:</div>
                    <div class="watcher-chips-list">
                        <button class="watcher-chip" data-query="gợi ý cho tôi 1 phim bất ngờ hôm nay">🍿 Phim bất ngờ hôm nay</button>
                        <button class="watcher-chip" data-query="phim viễn tưởng vũ trụ hay nhất">🚀 Viễn tưởng vũ trụ</button>
                        <button class="watcher-chip" data-query="phim hành động kịch tính điểm cao">💥 Hành động điểm cao</button>
                        <button class="watcher-chip" data-query="phim tình cảm lãng mạn chữa lành">💖 Tình cảm chữa lành</button>
                        <button class="watcher-chip" data-query="phim kinh dị rùng rợn giật gân">👻 Kinh dị rùng rợn</button>
                        <button class="watcher-chip" data-query="top phim có lượt xem nhiều nhất">👑 Top xem nhiều nhất</button>
                    </div>
                </div>

                <!-- Footer chứa ô nhập tin nhắn -->
                <div class="watcher-footer" id="watcher-footer">
                    <form class="watcher-input-form" id="watcher-input-form">
                        <input type="text" id="watcher-input" class="watcher-input" placeholder="Miêu tả bộ phim bạn muốn xem..." autocomplete="off">
                        <button type="submit" id="watcher-btn-send" class="watcher-btn-send" title="Gửi tin nhắn">
                            <i class="fa-solid fa-paper-plane"></i>
                        </button>
                    </form>
                    <div class="watcher-powered-by">
                        <i class="fa-solid fa-shield-halved"></i> The Watcher Movie AI Engine • CoiPhim 2026
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 3. GẮN CÁC SỰ KIỆN TƯƠNG TÁC
     */
    function bindWatcherEvents() {
        const toggleBtn = document.getElementById("watcher-toggle-btn");
        const closeBtn = document.getElementById("watcher-btn-close");
        const bubbleClose = document.getElementById("watcher-bubble-close");
        const bubble = document.getElementById("watcher-speech-bubble");
        const inputForm = document.getElementById("watcher-input-form");
        const inputEl = document.getElementById("watcher-input");
        const loginTrigger = document.getElementById("btn-watcher-login-trigger");
        const registerTrigger = document.getElementById("btn-watcher-register-trigger");

        // Toggle mở / đóng The Watcher
        if (toggleBtn) {
            toggleBtn.addEventListener("click", () => {
                toggleWatcherChat();
            });
        }

        // Đóng từ Header
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                toggleWatcherChat(false);
            });
        }

        // Bấm vào bong bóng lời thoại cũng mở The Watcher
        if (bubble) {
            bubble.addEventListener("click", (e) => {
                if (e.target.closest("#watcher-bubble-close")) return;
                toggleWatcherChat(true);
            });
        }

        // Đóng riêng bong bóng lời thoại
        if (bubbleClose) {
            bubbleClose.addEventListener("click", (e) => {
                e.stopPropagation();
                bubble.classList.remove("visible");
            });
        }

        // Sự kiện Đăng nhập từ Auth Gate của The Watcher
        if (loginTrigger) {
            loginTrigger.addEventListener("click", () => {
                if (typeof window.openAuthModal === "function") {
                    window.openAuthModal("login");
                }
            });
        }

        // Sự kiện Đăng ký từ Auth Gate
        if (registerTrigger) {
            registerTrigger.addEventListener("click", () => {
                if (typeof window.openAuthModal === "function") {
                    window.openAuthModal("register");
                }
            });
        }

        // Gửi tin nhắn qua Form
        if (inputForm) {
            inputForm.addEventListener("submit", (e) => {
                e.preventDefault();
                handleUserSubmit();
            });
        }

        // Bấm các chip gợi ý nhanh
        document.querySelectorAll(".watcher-chip").forEach(chip => {
            chip.addEventListener("click", () => {
                const query = chip.getAttribute("data-query");
                if (query && !isBotTyping) {
                    if (inputEl) inputEl.value = query;
                    handleUserSubmit();
                }
            });
        });
    }

    /**
     * 4. BẬT / TẮT CỬA SỔ CHAT
     */
    function toggleWatcherChat(forceState) {
        const chatWin = document.getElementById("watcher-chat-window");
        const bubble = document.getElementById("watcher-speech-bubble");
        const toggleBtn = document.getElementById("watcher-toggle-btn");

        isWatcherOpen = (typeof forceState === "boolean") ? forceState : !isWatcherOpen;

        if (isWatcherOpen) {
            if (chatWin) chatWin.style.display = "flex";
            if (bubble) bubble.classList.remove("visible");
            if (toggleBtn) toggleBtn.classList.add("active");

            // Focus vào input nếu đã đăng nhập
            if (isLoggedIn()) {
                setTimeout(() => {
                    const inputEl = document.getElementById("watcher-input");
                    if (inputEl) inputEl.focus();
                }, 150);
            }
            scrollChatToBottom();
        } else {
            if (chatWin) chatWin.style.display = "none";
            if (toggleBtn) toggleBtn.classList.remove("active");
        }
    }

    /**
     * 5. CẬP NHẬT TRẠNG THÁI XÁC THỰC (ĐĂNG NHẬP / CHƯA ĐĂNG NHẬP)
     */
    function updateWatcherAuthState() {
        const authGate = document.getElementById("watcher-auth-gate");
        const chatMessages = document.getElementById("watcher-chat-messages");
        const chipsWrapper = document.getElementById("watcher-chips-wrapper");
        const inputEl = document.getElementById("watcher-input");
        const btnSend = document.getElementById("watcher-btn-send");
        const bubbleText = document.getElementById("watcher-bubble-text");

        const user = (typeof window.getCurrentUser === "function") ? window.getCurrentUser() : null;
        const loggedIn = user !== null;

        if (loggedIn) {
            // ĐÃ ĐĂNG NHẬP: Mở khóa hoàn toàn
            if (authGate) authGate.style.display = "none";
            if (chatMessages) chatMessages.style.display = "flex";
            if (chipsWrapper) chipsWrapper.style.display = "block";
            if (inputEl) {
                inputEl.disabled = false;
                inputEl.placeholder = "Miêu tả bộ phim bạn muốn xem...";
            }
            if (btnSend) btnSend.disabled = false;

            if (bubbleText) {
                const displayName = user.fullName || user.username;
                bubbleText.innerHTML = `Chào <strong>${displayName}</strong>! Tôi có thể giúp gì cho bạn? 🎬`;
            }

            // Nếu chưa có tin nhắn nào trong lịch sử thì hiện lời chào đầu tiên
            if (chatHistory.length === 0) {
                initWelcomeMessage(user);
            }
        } else {
            // CHƯA ĐĂNG NHẬP: Khóa tính năng và hiển thị Auth Gate
            if (authGate) authGate.style.display = "flex";
            if (chatMessages) chatMessages.style.display = "none";
            if (chipsWrapper) chipsWrapper.style.display = "none";
            if (inputEl) {
                inputEl.disabled = true;
                inputEl.placeholder = "🔒 Vui lòng đăng nhập để trò chuyện...";
            }
            if (btnSend) btnSend.disabled = true;

            if (bubbleText) {
                bubbleText.innerHTML = `Chào bạn! Đăng nhập để chat cùng The Watcher nhé 🤖`;
            }
        }
    }
    // Gắn hàm này lên window để app.js & watch.js gọi lại khi user đăng nhập / đăng xuất
    window.updateWatcherAuthState = updateWatcherAuthState;

    /**
     * 6. LỜI CHÀO MỪNG BAN ĐẦU CỦA THE WATCHER
     */
    function initWelcomeMessage(user) {
        const userName = user.fullName || user.username || "bạn";
        const welcomeText = `Xin chào <strong>${userName}</strong>! Tôi là <strong>The Watcher</strong> – trợ lý AI điện ảnh của CoiPhim 🤖✨<br><br>Hôm nay bạn đang có tâm trạng thế nào? Muốn xem phim hành động gay cấn, viễn tưởng vũ trụ, hay tình cảm ngọt ngào chữa lành? Bạn chỉ cần miêu tả bất kỳ điều gì, tôi sẽ tìm ngay bộ phim hợp gu nhất cho bạn!`;

        appendMessage("bot", welcomeText);
    }

    /**
     * 8. XỬ LÝ KHI NGƯỜI DÙNG GỬI TIN NHẮN
     */
    function handleUserSubmit() {
        const inputEl = document.getElementById("watcher-input");
        if (!inputEl) return;

        const rawQuery = inputEl.value.trim();
        if (!rawQuery || isBotTyping) return;

        // Xóa ô nhập
        inputEl.value = "";

        // Kiểm tra quyền đăng nhập
        if (!isLoggedIn()) {
            updateWatcherAuthState();
            return;
        }

        // Hiện tin nhắn người dùng
        appendMessage("user", escapeHTML(rawQuery));

        // Hiện trạng thái bot đang suy nghĩ (Typing indicator)
        showTypingIndicator();

        // Xử lý phân tích bằng AI sau 650ms (mô phỏng suy nghĩ tự nhiên)
        setTimeout(() => {
            removeTypingIndicator();
            const botResponse = analyzeUserMovieIntent(rawQuery);
            appendMessage("bot", botResponse.text, botResponse.movies);
        }, 750);
    }

    /**
     * 9. THUẬT TOÁN AI NLP: PHÂN TÍCH Ý ĐỊNH & GỢI Ý PHIM CHÍNH XÁC
     */
    function analyzeUserMovieIntent(query) {
        const allMovies = (typeof window.getMovies === "function") ? window.getMovies() : [];
        if (!allMovies || allMovies.length === 0) {
            return {
                text: "Rất tiếc, kho dữ liệu phim hiện tại đang được cập nhật. Bạn vui lòng thử lại sau giây lát nhé!",
                movies: []
            };
        }

        const normQuery = query.toLowerCase().trim();
        const noDiacriticsQuery = removeVietnameseTones(normQuery);

        // 1. Ý ĐỊNH: Lời chào hỏi / giới thiệu
        if (/^(chao|chào|hi|hello|hey|alo|the watcher|ban la ai|bạn là ai)/i.test(normQuery) && normQuery.length < 25) {
            return {
                text: `Chào bạn! Tôi là <strong>The Watcher</strong> 🤖🎬 – trợ lý AI đồng hành cùng bạn trên CoiPhim. Bạn có thể miêu tả thể loại yêu thích (viễn tưởng, hành động, kinh dị...), tâm trạng hiện tại (muốn cười, muốn khóc, hồi hộp), hoặc tên đạo diễn/diễn viên để tôi gợi ý cho bạn nhé!`,
                movies: []
            };
        }

        // 2. Ý ĐỊNH: Gợi ý ngẫu nhiên / Bất ngờ
        if (/(bat ngo|bất ngờ|ngau nhien|ngẫu nhiên|chon bua|chọn bừa|random|khong biet xem gi|không biết xem gì|goi y bua|gợi ý bừa)/i.test(normQuery)) {
            const randomMovie = allMovies[Math.floor(Math.random() * allMovies.length)];
            return {
                text: `Tôi sẽ gợi ý cho bạn một số phim sau:`,
                movies: [randomMovie]
            };
        }

        // 3. Ý ĐỊNH: Phim có lượt xem cao nhất / thịnh hành (khi không có miêu tả thể loại cụ thể)
        if (/^(top|các phim|những phim|danh sách)?\s*(phim\s+)?(có\s+)?(lượt xem|hot|thịnh hành|nhiều người xem|phổ biến|top xem|view)/i.test(normQuery) && normQuery.length < 45) {
            const topViews = [...allMovies].sort((a, b) => (b.viewsToday || 0) - (a.viewsToday || 0)).slice(0, 3);
            return {
                text: `Tôi sẽ gợi ý cho bạn một số phim sau:`,
                movies: topViews
            };
        }

        // 4. Ý ĐỊNH: Phim điểm đánh giá cao nhất / hay nhất toàn sàn (khi không kèm thể loại cụ thể)
        if (/^(top|các phim|những phim|danh sách)?\s*(phim\s+)?(có\s+)?(điểm cao|hay nhất|đỉnh nhất|xuất sắc|rating cao|đánh giá cao)/i.test(normQuery) && normQuery.length < 45) {
            const topRated = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 3);
            return {
                text: `Tôi sẽ gợi ý cho bạn một số phim sau:`,
                movies: topRated
            };
        }

        // 5. Ý ĐỊNH: Phim mới nhất (2024 / 2023)
        if (/(moi nhat|mới nhất|2024|gan day|gần đây)/i.test(normQuery)) {
            const newMovies = allMovies.filter(m => m.year === 2024 || m.year === 2023).slice(0, 3);
            if (newMovies.length > 0) {
                return {
                    text: `Tôi sẽ gợi ý cho bạn một số phim sau:`,
                    movies: newMovies
                };
            }
        }

        // 6. TỪ KHÓA THỂ LOẠI & TÂM TRẠNG (GENRE & MOOD MATCHING)
        const genreKeywords = {
            "sci-fi": ["vien tuong", "viễn tưởng", "vu tru", "vũ trụ", "khong gian", "không gian", "tuong lai", "tương lai", "robot", "du hanh", "du hành", "ho lo sau", "khoa hoc", "khoa học", "ngoai hanh tinh", "người ngoài hành tinh", "dune", "interstellar", "avatar"],
            "action": ["hanh dong", "hành động", "danh nhau", "đánh nhau", "chien dau", "chiến đấu", "ban sung", "bắn súng", "chay no", "cháy nổ", "sat thu", "sát thủ", "sieu anh hung", "siêu anh hùng", "john wick", "batman", "marvel"],
            "romance": ["tinh cam", "tình cảm", "lang man", "lãng mạn", "chua lanh", "chữa lành", "ngot ngao", "ngọt ngào", "yeu duong", "yêu", "hen ho", "hẹn hò", "khoc", "khóc", "cam dong", "cảm động", "titanic", "la la land"],
            "horror": ["kinh di", "kinh dị", "ma quai", "ma quái", "rung ron", "rùng rợn", "am anh", "ám ảnh", "so hai", "sợ", "hu doa", "hù dọa", "quy", "quỷ", "conjuring", "exhuma", "insidious"],
            "animation": ["hoat hinh", "hoạt hình", "anime", "ghibli", "disney", "de thuong", "dễ thương", "tre em", "trẻ em", "vui nhon", "vui nhộn", "spirited away", "spy x family"],
            "comedy": ["hai huoc", "hài hước", "hai", "hài", "cuoi", "cười", "vui ve", "vui vẻ", "giai tri", "giải trí", "nha ba nu", "nhà bà nữ"],
            "historical": ["co trang", "cổ trang", "kiem hiep", "kiếm hiệp", "hoang cung", "hoàng cung", "chien quoc", "chiến quốc", "lich su", "lịch sử", "tam quoc", "tam quốc"],
            "thriller": ["tam ly", "tâm lý", "giat gan", "giật gân", "trinh tham", "trinh thám", "hoi hop", "hồi hộp", "cang thang", "căng thẳng", "banh cuon", "bánh cuốn", "dau tri", "đấu trí", "ky sinh trung", "ký sinh trùng", "shutter island", "oppenheimer"]
        };

        // Tính điểm phù hợp (Scoring Engine) cho từng bộ phim
        const scoredMovies = allMovies.map(movie => {
            let score = 0;
            const reasons = [];

            const titleNorm = (movie.title || "").toLowerCase();
            const originalTitleNorm = (movie.originalTitle || "").toLowerCase();
            const descNorm = (movie.description || "").toLowerCase();
            const directorNorm = (movie.director || "").toLowerCase();
            const actorsNorm = (movie.actors || "").toLowerCase();
            const categoryNorm = (movie.categoryName || "").toLowerCase();

            const titlePlain = removeVietnameseTones(titleNorm);
            const descPlain = removeVietnameseTones(descNorm);
            const directorPlain = removeVietnameseTones(directorNorm);
            const actorsPlain = removeVietnameseTones(actorsNorm);

            // Tập hợp các từ riêng lẻ trong truy vấn (để so sánh chính xác từng từ)
            const queryWordSet = new Set(noDiacriticsQuery.split(/[\s,–-]+/).filter(w => w.length >= 3));
            const nameStopWords = new Set(["nhat", "hay", "viet", "nam", "anh", "minh", "quoc", "thanh", "dien", "dao", "chieu", "rap", "phim", "nguoi"]);

            // A. Khớp chính xác tên phim
            if (titleNorm.includes(normQuery) || originalTitleNorm.includes(normQuery) || titlePlain.includes(noDiacriticsQuery)) {
                score += 220;
                reasons.push("Khớp chính xác tên phim");
            }

            // B. Khớp đạo diễn
            if (directorPlain.length > 0 && noDiacriticsQuery.includes(directorPlain)) {
                score += 200;
                reasons.push(`Đạo diễn ${movie.director}`);
            } else {
                // Tách tên đạo diễn (ví dụ: "Nolan", "Bong", "Denis", "Cameron")
                const directorWords = directorPlain.split(/\s+/).filter(w => w.length >= 4 && !nameStopWords.has(w));
                for (const dw of directorWords) {
                    if (queryWordSet.has(dw)) {
                        score += 120;
                        reasons.push(`Đạo diễn ${movie.director}`);
                        break;
                    }
                }
            }

            // C. Khớp diễn viên
            if (actorsPlain.length > 0) {
                const actorList = actorsPlain.split(/[,–-]/).map(a => a.trim()).filter(a => a.length >= 3);
                for (const actor of actorList) {
                    if (noDiacriticsQuery.includes(actor)) {
                        score += 150;
                        reasons.push(`Diễn viên ${actor}`);
                        break;
                    }
                    const actorWords = actor.split(/\s+/).filter(w => w.length >= 4 && !nameStopWords.has(w));
                    for (const aw of actorWords) {
                        if (queryWordSet.has(aw)) {
                            score += 70;
                            reasons.push(`Diễn viên trong phim`);
                            break;
                        }
                    }
                }
            }

            // D. Khớp thể loại
            for (const [catKey, keywords] of Object.entries(genreKeywords)) {
                let catMatched = false;
                for (const kw of keywords) {
                    if (noDiacriticsQuery.includes(kw) || normQuery.includes(kw)) {
                        catMatched = true;
                        break;
                    }
                }
                if (catMatched && movie.category === catKey) {
                    score += 70;
                    reasons.push(`Thể loại ${movie.categoryName}`);
                }
            }

            // E. Khớp từ khóa trong cốt truyện / miêu tả
            const queryTokens = noDiacriticsQuery.split(/\s+/).filter(w => w.length >= 3 && !["phim", "muon", "muốn", "xem", "tim", "tìm", "cho", "toi", "tôi", "nhung", "những", "cac", "các", "hay", "nhat", "nhất"].includes(w));
            let matchCount = 0;
            for (const token of queryTokens) {
                if (descPlain.includes(token) || titlePlain.includes(token)) {
                    matchCount++;
                }
            }
            if (matchCount > 0) {
                score += matchCount * 15;
                reasons.push("Nội dung phù hợp miêu tả");
            }

            // F. Điểm thưởng chất lượng phim (Rating & Views)
            if (noDiacriticsQuery.includes("hay") || noDiacriticsQuery.includes("diem cao") || noDiacriticsQuery.includes("dinh")) {
                score += (movie.rating || 0) * 8;
            } else {
                score += (movie.rating || 0) * 2;
            }

            return {
                movie,
                score,
                reasons: [...new Set(reasons)]
            };
        });

        // Sắp xếp phim có điểm cao nhất
        scoredMovies.sort((a, b) => b.score - a.score);

        // Lấy các phim điểm cao vượt trội (tối đa 3 phim)
        const bestMatches = scoredMovies.filter(item => item.score >= 25).slice(0, 3);

        if (bestMatches.length > 0) {
            const movies = bestMatches.map(item => item.movie);
            return {
                text: `Tôi sẽ gợi ý cho bạn một số phim sau:`,
                movies
            };
        }

        // Nếu không khớp từ khóa nào cụ thể, đưa ra gợi ý xuất sắc tổng hợp
        const fallbackMovies = [...allMovies].sort((a, b) => b.rating - a.rating).slice(0, 3);
        return {
            text: `Tôi chưa tìm thấy phim có từ khóa hoàn toàn trùng khớp với <em>"${escapeHTML(query)}"</em>. Tôi sẽ gợi ý cho bạn một số phim sau:`,
            movies: fallbackMovies
        };
    }

    /**
     * 10. THÊM TIN NHẮN VÀO KHUNG CHAT
     */
    function appendMessage(sender, text, movies = []) {
        const chatMessages = document.getElementById("watcher-chat-messages");
        if (!chatMessages) return;

        chatHistory.push({ sender, text, movies });

        const msgRow = document.createElement("div");
        msgRow.className = `watcher-msg-row ${sender}`;

        let avatarHTML = "";
        if (sender === "bot") {
            avatarHTML = `
                <div class="watcher-msg-avatar">
                    <img src="images/the-watcher.png" alt="The Watcher">
                </div>
            `;
        }

        let moviesHTML = "";
        if (movies && movies.length > 0) {
            moviesHTML = `
                <div class="watcher-movies-grid">
                    ${movies.map(m => createMovieCardHTML(m)).join("")}
                </div>
            `;
        }

        msgRow.innerHTML = `
            ${avatarHTML}
            <div class="watcher-msg-bubble">
                <div class="watcher-msg-text">${text}</div>
                ${moviesHTML}
                <div class="watcher-msg-time">${getCurrentTimeString()}</div>
            </div>
        `;

        chatMessages.appendChild(msgRow);
        scrollChatToBottom();
    }

    /**
     * 11. TẠO HTML CHO THẺ PHIM TRONG KHUNG CHAT
     */
    function createMovieCardHTML(movie) {
        return `
            <div class="watcher-movie-card">
                <div class="watcher-movie-poster-wrap">
                    <img src="${movie.poster}" alt="${escapeHTML(movie.title)}" class="watcher-movie-poster" loading="lazy" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=600&q=80';">
                    <span class="watcher-movie-rating"><i class="fa-solid fa-star"></i> ${movie.rating.toFixed(1)}</span>
                </div>
                <div class="watcher-movie-info">
                    <h5 class="watcher-movie-title" title="${escapeHTML(movie.title)}">${escapeHTML(movie.title)}</h5>
                    <div class="watcher-movie-meta">
                        <span class="watcher-movie-cat">${escapeHTML(movie.categoryName)}</span>
                        <span>•</span>
                        <span>${movie.year}</span>
                        <span>•</span>
                        <span>${movie.duration}</span>
                    </div>
                    <p class="watcher-movie-snippet">${escapeHTML(truncateText(movie.description || "", 80))}</p>
                    <div class="watcher-movie-actions">
                        <button class="watcher-btn-action detail" onclick="window.watcherOpenMovieDetail('${movie.id}')">
                            <i class="fa-solid fa-circle-info"></i> Chi tiết
                        </button>
                        <button class="watcher-btn-action watch" onclick="window.watcherPlayMovieDirect('${movie.id}')">
                            <i class="fa-solid fa-play"></i> Xem ngay
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 12. HÀNH ĐỘNG KHI CLICK VÀO PHIM TRONG KHUNG CHAT
     */
    window.watcherOpenMovieDetail = function (movieId) {
        if (typeof window.openMoviePlayer === "function") {
            window.openMoviePlayer(movieId);
        } else if (window.navigateToPage) {
            window.navigateToPage(`watch.html?id=${movieId}`, "Đang tải vui lòng chờ");
        } else {
            window.location.href = `watch.html?id=${movieId}`;
        }
    };

    window.watcherPlayMovieDirect = function (movieId) {
        if (window.navigateToPage) {
            window.navigateToPage(`watch.html?id=${movieId}`, "Đang tải vui lòng chờ");
        } else {
            window.location.href = `watch.html?id=${movieId}`;
        }
    };

    /**
     * 13. HIỆU ỨNG TYPING INDICATOR (ĐANG SUY NGHĨ)
     */
    function showTypingIndicator() {
        const chatMessages = document.getElementById("watcher-chat-messages");
        if (!chatMessages) return;

        isBotTyping = true;
        const typingEl = document.createElement("div");
        typingEl.id = "watcher-typing-indicator";
        typingEl.className = "watcher-msg-row bot typing";
        typingEl.innerHTML = `
            <div class="watcher-msg-avatar">
                <img src="images/the-watcher.png" alt="The Watcher">
            </div>
            <div class="watcher-msg-bubble typing-bubble">
                <div class="watcher-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatMessages.appendChild(typingEl);
        scrollChatToBottom();
    }

    function removeTypingIndicator() {
        isBotTyping = false;
        const typingEl = document.getElementById("watcher-typing-indicator");
        if (typingEl) typingEl.remove();
    }

    /**
     * 14. TIỆN ÍCH HỖ TRỢ
     */
    function scrollChatToBottom() {
        const chatMessages = document.getElementById("watcher-chat-messages");
        if (chatMessages) {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    function isLoggedIn() {
        return (typeof window.getCurrentUser === "function") && window.getCurrentUser() !== null;
    }

    function getCurrentTimeString() {
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        return `${hours}:${minutes}`;
    }

    function truncateText(str, maxLen) {
        if (!str || str.length <= maxLen) return str;
        return str.substring(0, maxLen).trim() + "...";
    }

    function escapeHTML(str) {
        if (!str) return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function removeVietnameseTones(str) {
        if (!str) return "";
        str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
        str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
        str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
        str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
        str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
        str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
        str = str.replace(/đ/g, "d");
        str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
        str = str.replace(/\u02C6|\u0306|\u031B/g, "");
        return str;
    }

})();
