document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('fitnova_user');
    if (!userStr) return;
    
    let user;
    try { user = JSON.parse(userStr); } catch(e) { return; }

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    // Get current page name to highlight active link
    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';

    const isActive = (href) => page === href ? 'class="active"' : '';

    if (user.role === 'trainer') {
        sidebar.innerHTML = `
            <h2>FitNova Pro</h2>
            <div class="nav-links">
                <a href="trainer-dashboard.html" ${isActive('trainer-dashboard.html')}>Trainer Dashboard</a>
                <a href="trainer-bookings.html" ${isActive('trainer-bookings.html')}>My Client Bookings</a>
                <a href="trainer-setup.html" ${isActive('trainer-setup.html')}>Profile Setup</a>
                <a href="user-profile.html" ${isActive('user-profile.html')}>Public Profile</a>
                <a href="chat.html" ${isActive('chat.html')}>Messages</a>
                <a href="community.html" ${isActive('community.html')}>Community Network</a>
                <a href="events.html" ${isActive('events.html')}>Events & Workshops</a>
                <a href="#" onclick="logout()">Logout</a>
            </div>
        `;
    } else if (user.role === 'user') {
        sidebar.innerHTML = `
            <h2>FitNova</h2>
            <div class="nav-links">
                <a href="dashboard.html" ${isActive('dashboard.html')}>My Dashboard</a>
                <a href="tracking.html" ${isActive('tracking.html')}>Fitness Tracking</a>
                <a href="user-profile.html" ${isActive('user-profile.html')}>My Profile</a>
                <a href="chat.html" ${isActive('chat.html')}>Messages</a>
                <a href="community.html" ${isActive('community.html')}>Community Network</a>
                <a href="trainers.html" ${isActive('trainers.html')}>Trainer Marketplace</a>
                <a href="events.html" ${isActive('events.html')}>Events</a>
                <a href="#" onclick="logout()">Logout</a>
            </div>
        `;
    } else if (user.role === 'admin') {
        sidebar.innerHTML = `
            <h2>FitNova Admin</h2>
            <div class="nav-links">
                <a href="admin.html" ${isActive('admin.html')}>Admin Panel</a>
                <a href="community.html" ${isActive('community.html')}>Community Network</a>
                <a href="events.html" ${isActive('events.html')}>Events & Workshops</a>
                <a href="#" onclick="logout()">Logout</a>
            </div>
        `;
    }
});
