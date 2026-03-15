document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('fitnova_user'));
        if (!currentUser || currentUser.role !== 'trainer') {
            window.location.href = 'dashboard.html';
            return;
        }
    } catch(e) {}

    fetchBookings();

    async function fetchBookings() {
        const tbody = document.getElementById('bookingsTable');
        try {
            const res = await fetch('/api/trainers/bookings', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const bookings = await res.json();
            
            tbody.innerHTML = '';
            
            if (bookings.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: var(--text-secondary);">No active bookings found.</td></tr>';
                return;
            }

            bookings.forEach(b => {
                const date = new Date(b.timeSlot).toLocaleString();
                const clientName = b.userId ? b.userId.name : 'Unknown';
                
                let statusHtml = '';
                if(b.status === 'pending') statusHtml = '<span class="pill" style="background: rgba(255, 184, 77, 0.1); color: #ffb84d;">Pending</span>';
                if(b.status === 'confirmed') statusHtml = '<span class="pill" style="background: rgba(0, 230, 118, 0.1); color: #00e676;">Confirmed</span>';
                if(b.status === 'cancelled') statusHtml = '<span class="pill" style="background: rgba(255, 75, 75, 0.1); color: #ff4b4b;">Cancelled</span>';

                const meetingLinkHtml = b.meetingLink ? `<a href="${b.meetingLink}" target="_blank" class="btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem; display:inline-block; text-decoration:none;"><span style="font-size:1.2rem; vertical-align:middle; margin-right:5px;">📹</span> Join Video Call (WebRTC)</a>` : `<input type="text" id="link-${b._id}" placeholder="Enter WebRTC/Zoom link" style="background:transparent; border:1px solid #333; color:#fff; padding:0.2rem; margin-right:0.5rem;"><button class="btn btn-secondary" onclick="addMeetingLink('${b._id}')" style="padding:0.2rem 0.5rem; font-size:0.8rem;">Save</button>`;

                let actionHtml = '';
                if(b.status === 'pending') {
                    actionHtml = `
                        <button class="btn btn-primary" onclick="updateStatus('${b._id}', 'confirmed')" style="padding:0.3rem 0.6rem; font-size:0.8rem; margin-right: 0.5rem;">Confirm & Auto-Generate Link</button>
                        <button class="btn btn-secondary" onclick="updateStatus('${b._id}', 'cancelled')" style="padding:0.3rem 0.6rem; font-size:0.8rem; border-color: #ff4b4b; color: #ff4b4b;">Cancel</button>
                    `;
                } else if (b.status === 'confirmed') {
                    actionHtml = meetingLinkHtml;
                }

                tbody.innerHTML += `
                    <tr>
                        <td>${clientName}</td>
                        <td>${date}</td>
                        <td>${statusHtml}</td>
                        <td>${actionHtml}</td>
                    </tr>
                `;
            });

        } catch(e) {
            console.error(e);
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color: #ff4b4b;">Error loading bookings.</td></tr>';
        }
    }

    window.updateStatus = async (id, status) => {
        try {
            let payload = { status };
            // Auto-generate Jitsi link when confirming
            if (status === 'confirmed') {
                const jitsiRoom = `fitnova-${id.slice(-6)}`;
                payload.meetingLink = `https://meet.jit.si/${jitsiRoom}`;
            }

            const res = await fetch(`/api/trainers/bookings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if(res.ok) fetchBookings();
        } catch(e) {
            console.error(e);
        }
    };

    window.addMeetingLink = async (id) => {
        const link = document.getElementById(`link-${id}`).value;
        if(!link) return;
        try {
            const res = await fetch(`/api/trainers/bookings/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ meetingLink: link })
            });
            if(res.ok) fetchBookings();
        } catch(e) {
            console.error(e);
        }
    };

});
