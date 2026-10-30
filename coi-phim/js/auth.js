/**
 * auth.js - Quản lý tài khoản, đăng nhập, đăng ký và phân quyền người dùng
 */

// Lấy user đang đăng nhập (đồng bộ tự động với dữ liệu mới nhất trong database)
function getCurrentUser() {
    const session = localStorage.getItem("coiphim_current_user");
    if (!session) return null;
    try {
        const sessionUser = JSON.parse(session);
        if (!sessionUser || !sessionUser.username) return null;

        // Luôn tìm kiếm bản ghi mới nhất từ getUsers() để đồng bộ fullName, role, avatar
        const users = (typeof getUsers === "function") ? getUsers() : [];
        const latest = users.find(u => u.username && u.username.toLowerCase() === sessionUser.username.toLowerCase());

        if (latest) {
            const syncedUser = {
                username: latest.username,
                fullName: latest.fullName,
                role: latest.role,
                avatar: latest.avatar || sessionUser.avatar
            };
            // Cập nhật lại session lưu trữ nếu có sự sai khác
            if (sessionUser.fullName !== syncedUser.fullName ||
                sessionUser.role !== syncedUser.role ||
                sessionUser.avatar !== syncedUser.avatar) {
                localStorage.setItem("coiphim_current_user", JSON.stringify(syncedUser));
            }
            return syncedUser;
        }
        return sessionUser;
    } catch (e) {
        return null;
    }
}

// Kiểm tra đã đăng nhập chưa
function isLoggedIn() {
    return getCurrentUser() !== null;
}

// Kiểm tra quyền Admin
function isAdmin() {
    const user = getCurrentUser();
    return user !== null && user.role === "admin";
}

// Xử lý đăng nhập
function loginUser(username, password) {
    const users = getUsers();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    const user = users.find(u => u.username.toLowerCase() === cleanUser && u.password === cleanPass);

    if (user) {
        // Lưu thông tin phiên đăng nhập (không lưu password vào session)
        const sessionUser = {
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            avatar: user.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
        };
        localStorage.setItem("coiphim_current_user", JSON.stringify(sessionUser));
        return { success: true, message: "Đăng nhập thành công!", user: sessionUser };
    } else {
        return { success: false, message: "Tên đăng nhập hoặc mật khẩu không chính xác!" };
    }
}

// Xử lý đăng ký tài khoản mới (mặc định role 'user')
function registerUser(username, password, fullName) {
    const users = getUsers();
    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const cleanName = fullName.trim();

    if (!cleanUser || !cleanPass || !cleanName) {
        return { success: false, message: "Vui lòng điền đầy đủ tất cả thông tin!" };
    }

    if (cleanUser.length < 3) {
        return { success: false, message: "Tên đăng nhập tối thiểu 3 ký tự!" };
    }

    if (cleanPass.length < 3) {
        return { success: false, message: "Mật khẩu tối thiểu 3 ký tự!" };
    }

    if (users.some(u => u.username.toLowerCase() === cleanUser)) {
        return { success: false, message: "Tên đăng nhập đã tồn tại, vui lòng chọn tên khác!" };
    }

    const newUser = {
        username: cleanUser,
        password: cleanPass,
        fullName: cleanName,
        role: "user",
        avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUser}`
    };

    users.push(newUser);
    saveUsers(users);

    // Tự động đăng nhập luôn sau khi đăng ký
    const sessionUser = {
        username: newUser.username,
        fullName: newUser.fullName,
        role: newUser.role,
        avatar: newUser.avatar
    };
    localStorage.setItem("coiphim_current_user", JSON.stringify(sessionUser));

    return { success: true, message: "Đăng ký thành công và đã đăng nhập!", user: sessionUser };
}

// Xử lý đăng xuất
function logoutUser() {
    localStorage.removeItem("coiphim_current_user");
}
