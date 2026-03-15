document.addEventListener('DOMContentLoaded', () => {
    const userStr = localStorage.getItem('fitnova_user');
    if (!userStr) return;
    
    let user;
    try { user = JSON.parse(userStr); } catch(e) { return; }

    const sidebar = document.querySelector('.sidebar-new') || document.querySelector('.sidebar');
    if (!sidebar) return;

    const path = window.location.pathname;
    const page = path.split('/').pop() || 'index.html';
    const isActive = (href) => page === href ? 'active' : '';

    let linksHTML = '';
    if (user.role === 'trainer') {
        linksHTML = `
            <a href="trainer-dashboard.html" class="${isActive('trainer-dashboard.html')}">Dashboard</a>
            <a href="trainer-bookings.html" class="${isActive('trainer-bookings.html')}">Bookings</a>
            <a href="trainer-setup.html" class="${isActive('trainer-setup.html')}">Setup</a>
            <a href="user-profile.html" class="${isActive('user-profile.html')}">Profile</a>
            <a href="chat.html" class="${isActive('chat.html')}">Messages</a>
            <a href="community.html" class="${isActive('community.html')}">Community</a>
            <a href="events.html" class="${isActive('events.html')}">Events</a>
            <div class="nav-divider"></div>
            <a href="#" onclick="logout()" class="logout-link">Logout</a>
        `;
    } else {
        linksHTML = `
            <a href="dashboard.html" class="${isActive('dashboard.html')}">Dashboard</a>
            <a href="tracking.html" class="${isActive('tracking.html')}">Workouts</a>
            <a href="user-profile.html" class="${isActive('user-profile.html')}">Profile</a>
            <a href="chat.html" class="${isActive('chat.html')}">Messages</a>
            <a href="community.html" class="${isActive('community.html')}">Community</a>
            <a href="trainers.html" class="${isActive('trainers.html')}">Trainers</a>
            <a href="events.html" class="${isActive('events.html')}">Events</a>
            <div class="nav-divider"></div>
            <a href="#" onclick="logout()" class="logout-link">Logout</a>
        `;
    }

    sidebar.innerHTML = `
        <div class="sidebar-header">
            <a href="index.html" class="logo">Fit<span>Nova</span></a>
        </div>
        <div class="nav-links">
            ${linksHTML}
        </div>
    `;
});
