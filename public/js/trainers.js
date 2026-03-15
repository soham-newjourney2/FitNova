document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    let currentUser = null;
    try {
        currentUser = JSON.parse(localStorage.getItem('fitnova_user'));
        if (currentUser && currentUser.role === 'trainer') {
            document.getElementById('trainerSetup').style.display = 'block';
        }
    } catch(e) {}

    fetchTrainers();

    // Trainer Profile Setup
    const setupForm = document.getElementById('trainerProfileForm');
    if(setupForm) {
        setupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const specsStr = document.getElementById('specialties').value;
            const certsStr = document.getElementById('certifications').value;
            
            const specialties = specsStr.split(',').map(s => s.trim()).filter(s => s);
            const certifications = certsStr.split(',').map(s => s.trim()).filter(s => s);

            try {
                const res = await fetch('/api/trainers/profile', {
                    method: 'POST',
                    headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ specialties, certifications })
                });
                if(res.ok) {
                    alert('Profile updated successfully!');
                    setupForm.reset();
                    fetchTrainers();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // Load Trainers
    async function fetchTrainers() {
        const trainersList = document.getElementById('trainersList');
        const searchInput = document.getElementById('trainerSearch')?.value || '';
        const specialtyInput = document.getElementById('trainerSpecialty')?.value || '';
        const params = new URLSearchParams();
        if (searchInput) params.append('search', searchInput);
        if (specialtyInput) params.append('specialty', specialtyInput);

        try {
            const res = await fetch(`/api/trainers?${params.toString()}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const trainers = await res.json();
            
            trainersList.innerHTML = '';
            if (trainers.length === 0) {
                trainersList.innerHTML = '<p style="color:var(--text-secondary);">No trainers available yet.</p>';
                return;
            }

            trainers.forEach(t => {
                if(!t.userId) return; // skip orphans

                // V3 Modifications
                const verifiedBadge = t.isVerified ? '<span style="color: #4facfe; margin-left: 0.5rem;" title="Verified Trainer">✓</span>' : '';
                let specsHtml = t.specialties.map(s => {
                    // Pre-defined badge colors or generic
                    let bg = 'rgba(255, 255, 255, 0.05)';
                    let color = 'var(--text-secondary)';
                    
                    if(s.toLowerCase().includes('rehab')) { bg = 'rgba(255, 75, 75, 0.1)'; color = '#ff4b4b'; }
                    else if(s.toLowerCase().includes('crossfit')) { bg = 'rgba(79, 172, 254, 0.1)'; color = '#4facfe'; }
                    else if(s.toLowerCase().includes('yoga')) { bg = 'rgba(0, 230, 118, 0.1)'; color = '#00e676'; }

                    return `<span class="pill" style="background: ${bg}; color: ${color}; border: 1px solid ${bg.replace('0.1', '0.3')};">${s}</span>`;
                }).join('');

                let canBook = currentUser && currentUser._id !== t.userId._id;

                let bookingUI = '';
                if (canBook) {
                    if (t.availableSlots && t.availableSlots.length > 0) {
                        const options = t.availableSlots.map(s => {
                            const d = new Date(s);
                            return `<option value="${s}">${d.toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})}</option>`;
                        }).join('');
                        
                        bookingUI = `
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                <select class="booking-time form-control" data-trainer="${t.userId._id}" style="padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.3); color: #fff;">
                                    ${options}
                                </select>
                                <button class="btn btn-primary book-btn" data-id="${t.userId._id}" style="padding:0.6rem; font-size:0.9rem; width: 100%;">Book Session</button>
                            </div>
                        `;
                    } else {
                        bookingUI = `<p style="color:var(--text-secondary); font-size:0.85rem; text-align:center;">No available slots</p>`;
                    }
                } else {
                    bookingUI = `<p style="color:#00e676; font-size:0.9rem; text-align:center;">(This is You)</p>`;
                }

                trainersList.innerHTML += `
                    <div class="card">
                        <h3>${t.userId.name} ${verifiedBadge}</h3>
                        <p>⭐ ${t.rating > 0 ? t.rating : 'New'} (${t.reviews.length} reviews)</p>
                        <p style="font-size:0.8rem; color:#888;">${t.userId.email}</p>
                        <div class="pill-container">${specsHtml}</div>
                        <div style="margin-top:auto;">
                            ${bookingUI}
                        </div>
                    </div>
                `;
            });

            // Booking Handlers
            document.querySelectorAll('.book-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const trainerId = e.target.getAttribute('data-id');
                    const timeSelect = btn.previousElementSibling;
                    if (!timeSelect || !timeSelect.value) {
                        alert('Please select a date and time for the session');
                        return;
                    }
                    const timeSlot = new Date(timeSelect.value);

                    const msgDiv = document.getElementById('bookingMsg');

                    try {
                        const res = await fetch('/api/trainers/book', {
                            method: 'POST',
                            headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ trainerId, timeSlot: timeSlot.toISOString() })
                        });
                        const data = await res.json();
                        if(res.ok) {
                            msgDiv.innerHTML = `<span class="success-msg">Session booked with trainer!</span>`;
                            fetchTrainers(); // Refresh to hide the booked slot
                        } else {
                            msgDiv.innerHTML = `<span class="error-msg">${data.message || 'Failed to book'}</span>`;
                        }
                        setTimeout(() => msgDiv.innerHTML='', 3000);
                    } catch (err) {
                        console.error(err);
                    }
                });
            });

        } catch (err) {
            trainersList.innerHTML = '<p class="error-msg">Error loading trainers.</p>';
        }
    }
});
