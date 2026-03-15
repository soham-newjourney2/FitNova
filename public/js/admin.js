document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    
    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('fitnova_user'));
        if (!currentUser || currentUser.role !== 'admin') {
            document.getElementById('errorMsg').textContent = 'Unauthorized. Admin access only.';
            return;
        }
    } catch(e) {
        document.getElementById('errorMsg').textContent = 'Invalid session.';
        return;
    }

    // Show panel
    document.getElementById('adminContent').style.display = 'block';

    fetchStats();
    fetchUsers();

    async function fetchStats() {
        try {
            const res = await fetch('/api/admin/system-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if(res.ok) {
                document.getElementById('statUsers').innerText = data.users;
                document.getElementById('statTrainers').innerText = data.trainers;
                document.getElementById('statEvents').innerText = data.events;
                document.getElementById('statGroups').innerText = data.groups;
                document.getElementById('statWorkouts').innerText = data.workouts;
            } else {
                console.error(data.message);
            }
        } catch (err) {
            console.error(err);
        }
    }

    async function fetchUsers() {
        const tbody = document.getElementById('usersTable');
        try {
            const res = await fetch('/api/admin/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const users = await res.json();
            
            tbody.innerHTML = '';
            users.forEach(u => {
                const date = new Date(u.createdAt).toLocaleDateString();
                const isMe = u._id === currentUser._id;

                tbody.innerHTML += `
                    <tr>
                        <td style="font-weight:600; color:#fff;">${u.name}</td>
                        <td style="color:var(--text-secondary);">${u.email}</td>
                        <td><span style="background:rgba(255,255,255,0.1); padding:0.2rem 0.6rem; border-radius:12px; font-size:0.8rem; text-transform:capitalize;">${u.role}</span></td>
                        <td style="color:var(--text-secondary);">${date}</td>
                        <td>
                            ${isMe ? '<span style="color:#00e676; font-size:0.9rem;">(You)</span>' : `<button class="btn-danger del-btn" data-id="${u._id}">Delete</button>`}
                        </td>
                    </tr>
                `;
            });

            document.querySelectorAll('.del-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(!confirm('Are you sure you want to delete this user?')) return;
                    
                    const id = e.target.getAttribute('data-id');
                    try {
                        const r = await fetch(`/api/admin/users/${id}`, {
                            method: 'DELETE',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if(r.ok) {
                            fetchUsers();
                            fetchStats();
                        }
                    } catch(err) {}
                });
            });

        } catch (err) {
            tbody.innerHTML = '<tr><td colspan="5" style="color:red; text-align:center;">Error loading users</td></tr>';
        }
    }
});
