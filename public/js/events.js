document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    const userStr = localStorage.getItem('fitnova_user');
    if (!token || !userStr) {
        window.location.href = 'login.html';
        return;
    }

    const localUser = JSON.parse(userStr);
    let allEvents = [];
    let currentFilter = 'all';
    let userLocation = null;

    let map;
    let markers = [];

    function initMap() {
        if (!document.getElementById('eventMap')) return;
        if (map) map.remove();
        map = L.map('eventMap', { zoomControl: false }).setView([40.7128, -74.0060], 11);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; CARTO'
        }).addTo(map);
    }
    initMap();

    // DOM Elements
    const eventsList = document.getElementById('eventsList');
    const createModal = document.getElementById('createEventFormContainer');
    const openCreateBtn = document.getElementById('createEventBtn');
    
    if (openCreateBtn) {
        if (localUser.role === 'trainer' || localUser.role === 'admin') {
            openCreateBtn.style.display = 'inline-flex';
            openCreateBtn.onclick = () => createModal.classList.add('open');
        } else {
            openCreateBtn.style.display = 'none';
            // Also hide the "My Hosted" filter tab for regular users
            const hostedTab = document.querySelector('.filter-tab[data-filter="hosted"]');
            if (hostedTab) hostedTab.style.display = 'none';
        }
    }

    document.querySelectorAll('.close-create-event').forEach(btn => {
        btn.onclick = () => btn.closest('.modal').classList.remove('open');
    });
    
    window.onclick = (e) => { if (e.target.classList.contains('modal')) e.target.classList.remove('open'); };

    // Geolocation / Distance Sorting
    const locateMeBtn = document.getElementById('locateMeBtn');
    if (locateMeBtn) {
        locateMeBtn.addEventListener('click', () => {
            locateMeBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Locating...';
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        locateMeBtn.innerHTML = '<i class="fas fa-map-marker-alt" style="color:var(--primary-accent);"></i> Sorted by Distance';
                        locateMeBtn.style.borderColor = 'var(--primary-accent)';
                        if(map) map.setView([userLocation.lat, userLocation.lng], 12);
                        renderEvents();
                    },
                    (error) => {
                        alert("Geolocation failed: " + error.message);
                        locateMeBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Near Me';
                    }
                );
            } else {
                alert("Geolocation is not supported by this browser.");
                locateMeBtn.innerHTML = '<i class="fas fa-location-arrow"></i> Near Me';
            }
        });
    }

    function calculateDistance(lat1, lon1, lat2, lon2) {
        if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c; 
    }

    // Helper for API calls
    async function apiCall(url, method = 'GET', body = null) {
        const headers = { 'Authorization': `Bearer ${token}` };
        if (body) headers['Content-Type'] = 'application/json';
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'API call failed');
        }
        return res.json();
    }

    async function loadEvents() {
        eventsList.innerHTML = '<div style="text-align:center; padding:3rem;"><div class="spinner"></div></div>';
        try {
            allEvents = await apiCall('/api/events', 'GET');
            
            // Generate some mock coordinates if none exist for visuals
            allEvents = allEvents.map(e => {
                if (!e.coordinates) {
                    e.coordinates = {
                        lat: 40.7128 + (Math.random() - 0.5) * 0.1,
                        lng: -74.0060 + (Math.random() - 0.5) * 0.1
                    };
                }
                return e;
            });
            
            renderEvents();
            loadNotifications();
        } catch (err) {
            eventsList.innerHTML = '<p class="error-msg">Failed to load events.</p>';
        }
    }

    const PREM_IMAGES = [
        'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=1470&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?q=80&w=1470&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1470&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1574680096145-d05b474e2155?q=80&w=1469&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=1470&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1470&auto=format&fit=crop'
    ];

    function renderEvents() {
        let eventsToRender = [...allEvents];

        // Filters
        if (currentFilter === 'upcoming') {
            eventsToRender = eventsToRender.filter(e => !e.isCompleted && new Date(e.date) >= new Date());
        } else if (currentFilter === 'past') {
            eventsToRender = eventsToRender.filter(e => e.isCompleted || new Date(e.date) < new Date());
        } else if (currentFilter === 'hosted') {
            eventsToRender = eventsToRender.filter(e => e.organizer && (e.organizer._id === localUser._id || e.organizer === localUser._id));
        } else if (currentFilter === 'foryou') {
            eventsToRender = eventsToRender.filter(e => !e.isCompleted); // Placeholder
        }

        // Search text
        const searchInput = document.getElementById('eventSearch');
        if (searchInput && searchInput.value) {
            const term = searchInput.value.toLowerCase();
            eventsToRender = eventsToRender.filter(e => e.title.toLowerCase().includes(term));
        }

        // Distance Sort
        if (userLocation) {
            eventsToRender.forEach(e => {
                e.distance = calculateDistance(userLocation.lat, userLocation.lng, e.coordinates.lat, e.coordinates.lng);
            });
            eventsToRender.sort((a, b) => a.distance - b.distance);
        }

        if (eventsToRender.length === 0) {
            eventsList.innerHTML = `
                <div style="grid-column: 1/-1; text-align:center; padding:4rem; background:rgba(255,255,255,0.02); border-radius:16px; border:1px dashed rgba(255,255,255,0.1);">
                    <i class="fas fa-calendar-times" style="font-size:3rem; color:var(--text-secondary); margin-bottom:1rem;"></i>
                    <h3 style="color:#fff; font-family:'Orbitron', sans-serif;">No events found</h3>
                    <p style="color:var(--text-secondary);">We couldn't find any activities matching your exact criteria.</p>
                </div>`;
            updateMap([]);
            return;
        }

        eventsList.innerHTML = eventsToRender.map((ev, idx) => renderEventCard(ev, idx)).join('');
        updateMap(eventsToRender);
    }

    function renderEventCard(ev, idx) {
        const isPast = ev.isCompleted || new Date(ev.date) < new Date();
        const organizerId = ev.organizer._id || ev.organizer;
        const isOrganizer = organizerId === localUser._id || organizerId === localUser.id;
        const isRegistered = ev.attendees && ev.attendees.some(a => (a._id || a) === localUser._id || (a._id || a) === localUser.id);
        
        // Date formatting
        const d = new Date(ev.date);
        const month = d.toLocaleString('default', { month: 'short' });
        const day = d.getDate();
        const time = d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Distance label
        let distanceHtml = '';
        if (userLocation && ev.distance !== undefined && ev.distance !== Infinity) {
            distanceHtml = `<div class="event-distance-badge"><i class="fas fa-location-arrow"></i> ${ev.distance.toFixed(1)} km</div>`;
        }

        let actionBtn = '';
        if (isOrganizer) {
            actionBtn = `<span class="event-registered-badge"><i class="fas fa-crown"></i> Hosting</span>`;
        } else if (isRegistered) {
            actionBtn = `<span class="event-registered-badge"><i class="fas fa-check-circle"></i> Registered</span>`;
        } else if (!isPast) {
            actionBtn = `<button class="btn-primary-glow" style="padding:0.6rem 1.2rem; font-size:0.9rem;" onclick="registerEvent('${ev._id}')">Count me in</button>`;
        } else {
            actionBtn = `<span style="color:var(--text-secondary);"><i class="fas fa-history"></i> Ended</span>`;
        }

        const participantsStr = ev.attendees && ev.attendees.length > 0 
            ? `${ev.attendees.length} joined` 
            : 'Be the first!';

        const imageSrc = PREM_IMAGES[idx % PREM_IMAGES.length];

        return `
            <div class="event-card-premium">
                <div class="event-image-wrapper">
                    <img src="${imageSrc}" alt="Event Cover">
                    <div class="event-date-badge">
                        <span class="month">${month}</span>
                        <span class="day">${day}</span>
                    </div>
                    ${distanceHtml}
                    <div class="event-title-overlay">
                        <h3>${ev.title}</h3>
                    </div>
                </div>
                
                <div class="event-body-premium">
                    <div class="event-info-row">
                        <i class="fas fa-map-pin"></i>
                        <span>${ev.location}</span>
                    </div>
                    <div class="event-info-row">
                        <i class="far fa-clock"></i>
                        <span>${time} &bull; <i class="fas fa-users" style="color:var(--text-secondary); margin-left:5px; font-size:0.8rem;"></i> ${participantsStr}</span>
                    </div>
                    
                    <div class="event-desc">${ev.description}</div>
                    
                    <div class="event-footer">
                        ${actionBtn}
                        <button style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:50%; width:36px; height:36px; color:#fff; cursor:pointer; transition:all 0.3s ease;" title="Share">
                            <i class="fas fa-share-alt"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function updateMap(eventsToRender) {
        if (!map) return;
        markers.forEach(m => map.removeLayer(m));
        markers = [];
        
        const bounds = [];
        eventsToRender.forEach(ev => {
            if (ev.coordinates && ev.coordinates.lat && ev.coordinates.lng) {
                // Determine icon color
                const isOrganizer = (ev.organizer._id || ev.organizer) === localUser._id;
                const isRegistered = ev.attendees && ev.attendees.some(a => (a._id || a) === localUser._id);
                let color = "white";
                if (isOrganizer || isRegistered) color = "#00ff88"; // User context
                
                const customIcon = L.divIcon({
                    html: `<div style="background:${color}; width:12px; height:12px; border-radius:50%; border:2px solid #000; box-shadow:0 0 10px ${color};"></div>`,
                    className: '',
                    iconSize: [12, 12],
                    iconAnchor: [6, 6]
                });

                const marker = L.marker([ev.coordinates.lat, ev.coordinates.lng], { icon: customIcon }).addTo(map)
                    .bindPopup(`<b style="color:#000; font-family:'Outfit', sans-serif;">${ev.title}</b><br><span style="font-size:0.8rem; color:#555;">${ev.location}</span>`);
                markers.push(marker);
                bounds.push([ev.coordinates.lat, ev.coordinates.lng]);
            }
        });

        if (bounds.length > 0 && !userLocation) {
            map.fitBounds(bounds, { padding: [20, 20], maxZoom: 14 });
        }
    }

    // Creating Event
    const createEventForm = document.getElementById('createEventForm');
    if (createEventForm) {
        createEventForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                title: document.getElementById('evTitle').value,
                description: document.getElementById('evDesc').value,
                date: document.getElementById('evDate').value,
                location: document.getElementById('evLocation').value,
                maxAttendees: document.getElementById('evMax').value ? parseInt(document.getElementById('evMax').value) : null
            };

            try {
                await apiCall('/api/events', 'POST', payload);
                createModal.classList.remove('open');
                createEventForm.reset();
                loadEvents();
            } catch (err) { alert(err.message); }
        });
    }

    // Register 
    window.registerEvent = async (id) => {
        try {
            await apiCall(`/api/events/${id}/register`, 'POST');
            loadEvents();
        } catch (err) { alert(err.message); }
    };

    // Filter Buttons logic
    document.querySelectorAll('.filter-tab').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.dataset.filter;
            renderEvents();
        };
    });

    const searchInput = document.getElementById('eventSearch');
    if (searchInput) searchInput.addEventListener('input', renderEvents);

    async function loadNotifications() {
        const notifList = document.getElementById('notificationsList');
        if (!notifList) return;
        try {
            const notifs = await apiCall('/api/notifications', 'GET');
            if (!notifs || notifs.length === 0) {
                notifList.innerHTML = '<p class="empty-msg" style="text-align:center; padding:1rem;">No recent activities.</p>';
                return;
            }
            notifList.innerHTML = notifs.map(n => `
                <div class="notif-item">
                    <div class="notif-time">${new Date(n.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
                    <div class="notif-content">${n.content}</div>
                </div>
            `).join('');
        } catch (e) { console.error(e); }
    }

    loadEvents();
});
