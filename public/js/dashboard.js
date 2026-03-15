document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const res = await fetch('/api/users/dashboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            if (res.status === 401) {
                localStorage.clear();
                window.location.href = 'login.html';
            }
            throw new Error('Failed to fetch dashboard data');
        }

        const data = await res.json();
        
        // Fetch Notifications
        const notifRes = await fetch('/api/notifications', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (notifRes.ok) {
            data.notifications = await notifRes.json();
        }

        // V3: Fetch Challenges
        const chRes = await fetch('/api/challenges', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (chRes.ok) {
            data.challenges = await chRes.json();
        }

        // V3: Fetch Leaderboard
        const lbRes = await fetch('/api/users/leaderboard', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (lbRes.ok) {
            data.leaderboard = await lbRes.json();
        }

        // V3: Fetch User Appointments
        const aptRes = await fetch('/api/trainers/bookings', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (aptRes.ok) {
            data.appointments = await aptRes.json();
        }

        renderDashboard(data);

    } catch (err) {
        console.error(err);
    }

    function renderDashboard(data) {
        // Top bar
        document.getElementById('greeting').innerText = `Welcome back, ${data.profile.name.split(' ')[0]}!`;
        document.getElementById('userName').innerText = data.profile.name;
        document.getElementById('userRole').innerText = data.profile.role;
        
        // V3 Streak
        const streakEl = document.getElementById('userStreak');
        if (streakEl) {
            streakEl.innerText = `🔥 ${data.profile.streak || 0} Day Streak`;
        }

        // BMI Card
        if (data.profile.healthProfile && data.profile.healthProfile.bmi) {
            const bmi = data.profile.healthProfile.bmi;
            document.getElementById('bmiValue').innerText = bmi;
            let cat = 'Normal';
            if (bmi < 18.5) cat = 'Underweight';
            else if (bmi >= 25 && bmi < 30) cat = 'Overweight';
            else if (bmi >= 30) cat = 'Obese';
            document.getElementById('bmiCategory').innerText = cat;
        }

        // Stats Cards
        document.getElementById('weeklyCalories').innerHTML = `${data.weeklyStats.caloriesBurned} <span>kcal</span>`;
        document.getElementById('weeklyDuration').innerHTML = `${data.weeklyStats.durationMinutes} <span>min</span>`;

        // Recent Workouts
        const listDiv = document.getElementById('recentWorkoutsList');
        if (data.recentWorkouts && data.recentWorkouts.length > 0) {
            listDiv.innerHTML = '';
            data.recentWorkouts.forEach(w => {
                const date = new Date(w.date).toLocaleDateString();
                listDiv.innerHTML += `
                    <div class="list-item">
                        <div>
                            <p>${w.exerciseType}</p>
                            <span>${date}</span>
                        </div>
                        <div style="text-align:right;">
                            <span class="pill">${w.caloriesBurned} kcal</span>
                            <br><span style="font-size:0.8rem; color:#a0a5b1;">${w.duration} min</span>
                        </div>
                    </div>
                `;
            });
        } else {
            listDiv.innerHTML = `<p style="color: var(--text-secondary);">No previous workouts found.</p>`;
        }

        // Upcoming Events
        const eventsDiv = document.getElementById('upcomingEventsList');
        if (eventsDiv) {
            if (data.upcomingEvents && data.upcomingEvents.length > 0) {
                eventsDiv.innerHTML = '';
                data.upcomingEvents.forEach(e => {
                    const date = new Date(e.date).toLocaleDateString();
                    eventsDiv.innerHTML += `
                        <div class="list-item">
                            <div>
                                <p>${e.title}</p>
                                <span>${date} · ${e.location}</span>
                            </div>
                        </div>
                    `;
                });
            }
        }

        // My Upcoming Sessions (Appointments)
        const apptDiv = document.getElementById('appointmentsList');
        if (apptDiv) {
            if (data.appointments && data.appointments.length > 0) {
                apptDiv.innerHTML = '';
                data.appointments.forEach(apt => {
                    const date = new Date(apt.timeSlot).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'});
                    
                    let statusHtml = '';
                    if(apt.status === 'pending') statusHtml = '<span class="pill" style="background: rgba(255, 184, 77, 0.1); color: #ffb84d;">Pending</span>';
                    else if(apt.status === 'confirmed') statusHtml = '<span class="pill" style="background: rgba(0, 230, 118, 0.1); color: #00e676;">Confirmed</span>';
                    else if(apt.status === 'cancelled') statusHtml = '<span class="pill" style="background: rgba(255, 75, 75, 0.1); color: #ff4b4b;">Cancelled</span>';

                    let linkHtml = '';
                    if (apt.status === 'confirmed' && apt.meetingLink) {
                        linkHtml = `<a href="${apt.meetingLink}" target="_blank" style="color:#4facfe; font-size:0.85rem; display:block; margin-top:0.3rem;">📹 Join Call</a>`;
                    }

                    apptDiv.innerHTML += `
                        <div class="list-item">
                            <div>
                                <p>Trainer: ${apt.trainerId ? apt.trainerId.name : 'Unknown'}</p>
                                <span>${date}</span>
                                ${linkHtml}
                            </div>
                            <div style="text-align:right;">
                                ${statusHtml}
                            </div>
                        </div>
                    `;
                });
            } else {
                apptDiv.innerHTML = `<p style="color: var(--text-secondary);">No upcoming sessions booked.</p>`;
            }
        }

        // V3: Gamification - Check Ins
        const btnCheckIn = document.getElementById('btnCheckIn');
        if (btnCheckIn) {
            btnCheckIn.onclick = async () => {
                const location = prompt('Where are you checking in? (e.g. Golds Gym, Central Park)');
                if (location) {
                    try {
                        const r = await fetch('/api/users/checkin', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                            body: JSON.stringify({ location })
                        });
                        const resData = await r.json();
                        if(r.ok) {
                            alert(`Checked in at ${location}!${resData.newBadge ? `\n🎉 You earned the '${resData.newBadge}' badge!` : ''}`);
                            // Reload page to reflect new badges
                            window.location.reload();
                        } else {
                            alert(resData.message);
                        }
                    } catch(e) { console.error(e); }
                }
            };
        }

        // V3: Badges
        const badgesListDiv = document.getElementById('badgesList');
        if (badgesListDiv && data.profile.badges && data.profile.badges.length > 0) {
            badgesListDiv.innerHTML = data.profile.badges.map(b => `<span class="pill" style="background: rgba(255, 202, 40, 0.1); color: #ffca28; border: 1px solid #ffca28;">🏅 ${b}</span>`).join('');
        }

        // V3: Challenges
        if (data.challenges) {
            const challengesDiv = document.getElementById('challengesList');
            if (data.challenges.length === 0) {
                challengesDiv.innerHTML = `<p style="color: var(--text-secondary); font-size:0.9rem;">No active challenges right now.</p>`;
            } else {
                challengesDiv.innerHTML = '';
                data.challenges.forEach(c => {
                    const percent = c.isParticipating ? Math.min(100, Math.round((c.myProgress / c.target) * 100)) : 0;
                    let action = '';
                    if (c.isCompleted) {
                        action = `<span style="color:#00e676; font-size:0.8rem; font-weight:bold;">Completed 🎉</span>`;
                    } else if (c.isParticipating) {
                        action = `<span style="color:#4facfe; font-size:0.8rem;">${percent}% Finished</span>`;
                    } else {
                        action = `<button class="pill" onclick="joinChallenge('${c._id}')" style="font-size:0.75rem; cursor:pointer;">Join Challenge</button>`;
                    }

                    let progressHtml = c.isParticipating ? `
                        <div style="background: rgba(255,255,255,0.1); height: 6px; border-radius: 3px; margin-top: 0.5rem; overflow: hidden;">
                            <div style="width: ${percent}%; background: ${c.isCompleted ? '#00e676' : 'var(--accent-gradient)'}; height: 100%;"></div>
                        </div>
                    ` : '';

                    challengesDiv.innerHTML += `
                        <div style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); padding: 1rem; border-radius: 8px; margin-bottom: 0.5rem;">
                            <div style="display:flex; justify-content:space-between; align-items:center;">
                                <h5 style="color:#fff; margin-bottom:0.2rem; font-size:0.95rem;">${c.title}</h5>
                                ${action}
                            </div>
                            <p style="color: var(--text-secondary); font-size: 0.85rem;">Reward: ${c.badgeReward} Badge</p>
                            ${progressHtml}
                        </div>
                    `;
                });
            }
        }

        // Recent Notifications
        const notifDiv = document.getElementById('notificationsList');
        if (data.notifications && data.notifications.length > 0) {
            notifDiv.innerHTML = '';
            // Only show up to 5 on dashboard
            const recentNotifs = data.notifications.slice(0, 5);
            recentNotifs.forEach(n => {
                const date = new Date(n.createdAt).toLocaleDateString();
                const isUnread = !n.read;
                notifDiv.innerHTML += `
                    <div class="list-item" style="${isUnread ? 'border-left: 3px solid #4facfe; padding-left: 10px;' : ''}">
                        <div>
                            <p style="${isUnread ? 'font-weight:bold;' : ''}">${n.content}</p>
                            <span>${date}</span>
                        </div>
                    </div>
                `;
            });
        } else {
            notifDiv.innerHTML = `<p style="color: var(--text-secondary);">No recent notifications.</p>`;
        }

        // V3: Global Leaderboard
        const lbDiv = document.getElementById('leaderboardList');
        if (lbDiv && data.leaderboard) {
            if (data.leaderboard.length === 0) {
                lbDiv.innerHTML = `<p style="color: var(--text-secondary);">No leaderboard data yet.</p>`;
            } else {
                lbDiv.innerHTML = '';
                data.leaderboard.forEach((u, i) => {
                    const isMe = u._id === data.profile._id;
                    const rankMedal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
                    const bgStyles = isMe ? 'background: rgba(79, 172, 254, 0.1); border: 1px solid var(--primary-color); padding: 0.5rem; border-radius: 8px;' : 'padding: 0.5rem;';
                    lbDiv.innerHTML += `
                        <div class="list-item" style="${bgStyles}">
                            <div style="display: flex; align-items: center; gap: 1rem;">
                                <span style="font-size: 1.2rem; font-weight: bold; width: 30px;">${rankMedal}</span>
                                <div>
                                    <p style="margin:0; color:#fff; font-weight: ${isMe ? 'bold' : 'normal'};">
                                        ${u.name} ${isMe ? '(You)' : ''}
                                    </p>
                                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                                        ${u.badges ? u.badges.length : 0} badges
                                    </span>
                                </div>
                            </div>
                            <div style="text-align: right;">
                                <span class="pill" style="font-size: 0.8rem;">${u.stats ? u.stats.workoutsCompleted : 0} Workouts</span>
                            </div>
                        </div>
                    `;
                });
            }
        }
    }

    // Global func for joining challenge
    window.joinChallenge = async (id) => {
        try {
            const r = await fetch(`/api/challenges/${id}/join`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if(r.ok) {
                alert('Joined challenge successfully!');
                window.location.reload();
            } else {
                const d = await r.json();
                alert(d.message);
            }
        } catch(e) { console.error(e); }
    };
});
