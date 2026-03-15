document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    const user = JSON.parse(localStorage.getItem('fitnova_user'));

    if (!token || !user || user.role !== 'trainer') {
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('tInitial').textContent = user.name.charAt(0).toUpperCase();
    document.getElementById('tName').textContent = user.name;

    fetchTrainerStats();

    async function fetchTrainerStats() {
        try {
            // Reusing the general trainers endpoint to find own profile
            const res = await fetch('/api/trainers', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const trainers = await res.json();
            
            const myProfile = trainers.find(t => t.userId && t.userId._id === user._id);
            if(myProfile) {
                document.getElementById('tRating').textContent = myProfile.rating > 0 ? myProfile.rating : 'New';
                document.getElementById('tTotalReviews').textContent = myProfile.reviews.length;
                renderSlots(myProfile.availableSlots || []);
            }

            // Ideally there would be a specific endpoint for My Bookings count, mock for now
            document.getElementById('tTotalBookings').textContent = '2'; // Stub
        } catch(err) {
            console.error('Error fetching trainer stats', err);
        }
    }

    // Availability Slots
    document.getElementById('addSlotForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const timeInput = document.getElementById('newSlotTime').value;
        if(!timeInput) return;

        const msgDiv = document.getElementById('slotMsg');
        try {
            const res = await fetch('/api/trainers/slots', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ timeSlot: new Date(timeInput).toISOString() })
            });
            const data = await res.json();
            if(res.ok) {
                msgDiv.innerHTML = '<span class="success-msg">Slot added successfully!</span>';
                document.getElementById('addSlotForm').reset();
                renderSlots(data.availableSlots);
                setTimeout(()=> msgDiv.innerHTML='', 3000);
            } else {
                msgDiv.innerHTML = `<span class="error-msg">${data.message}</span>`;
            }
        } catch(err) {
            msgDiv.innerHTML = `<span class="error-msg">Network error</span>`;
        }
    });

    function renderSlots(slots) {
        const slotsList = document.getElementById('slotsList');
        if(!slotsList) return;

        if(!slots || slots.length === 0) {
            slotsList.innerHTML = '<p style="color:var(--text-secondary); font-size: 0.9rem;">No open slots. Add some above to get booked!</p>';
            return;
        }

        slots.sort((a,b) => new Date(a) - new Date(b));

        slotsList.innerHTML = slots.map(s => {
            const d = new Date(s);
            return `<span class="pill" style="background: rgba(79, 172, 254, 0.1); color: #4facfe; border: 1px solid rgba(79, 172, 254, 0.3); font-size: 0.85rem;">${d.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</span>`;
        }).join('');
    }
});
