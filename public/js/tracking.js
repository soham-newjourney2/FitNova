document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const API_URL = '/api/workouts';
    
    // Fetch History and Challenges
    fetchHistory();
    fetchChallenges();

    // Handle Form Submit
    document.getElementById('logWorkoutForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            exerciseType: document.getElementById('exerciseType').value,
            duration: Number(document.getElementById('duration').value),
            caloriesBurned: Number(document.getElementById('caloriesBurned').value),
            notes: document.getElementById('notes').value
        };

        const msgDiv = document.getElementById('logMessage');

        try {
            const res = await fetch(`${API_URL}/log`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                msgDiv.textContent = 'Workout saved successfully!';
                msgDiv.className = 'success-msg';
                document.getElementById('logWorkoutForm').reset();
                fetchHistory(); // Refresh list
                setTimeout(() => { msgDiv.textContent = ''; }, 3000);
            } else {
                const data = await res.json();
                msgDiv.textContent = data.message || 'Failed to save.';
                msgDiv.className = 'error-msg';
            }
        } catch (error) {
            msgDiv.textContent = 'Network Error';
            msgDiv.className = 'error-msg';
        }
    });

    async function fetchHistory() {
        const historyList = document.getElementById('historyList');
        try {
            const res = await fetch(`${API_URL}/progress?days=30`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                renderHistory(data.history);
            } else {
                historyList.innerHTML = `<p class="error-msg">Failed to load history</p>`;
            }
        } catch (err) {
            historyList.innerHTML = `<p class="error-msg">Network error loading history</p>`;
        }
    }

    function renderHistory(logs) {
        const historyList = document.getElementById('historyList');
        if (!logs || logs.length === 0) {
            historyList.innerHTML = `<p style="color: var(--text-secondary);">No workouts logged yet. Start today!</p>`;
            return;
        }

        // Sort by date desc locally just to be sure
        logs.sort((a,b) => new Date(b.date) - new Date(a.date));

        historyList.innerHTML = '';
        logs.forEach(log => {
            const dateStr = new Date(log.date).toLocaleDateString([], { weekday:'short', month:'short', day:'numeric' });
            historyList.innerHTML += `
                <div class="history-item">
                    <div>
                        <h4>${log.exerciseType}</h4>
                        <p>${dateStr} ${log.notes ? '• ' + log.notes : ''}</p>
                    </div>
                    <div class="metric-badge">
                        ${log.caloriesBurned} kcal<br>
                        <span style="font-size:0.8rem; font-weight:400;">${log.duration} min</span>
                    </div>
                </div>
            `;
        });
    }

    // --- V3: Gamification --- //

    document.getElementById('checkInBtn')?.addEventListener('click', async () => {
        const loc = document.getElementById('gymLocationInput').value.trim();
        const msgDiv = document.getElementById('checkInMsg');
        
        if (!loc) {
            msgDiv.innerHTML = '<span class="error-msg">Please enter a location</span>';
            return;
        }

        try {
            const res = await fetch('/api/users/checkin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ location: loc })
            });
            const data = await res.json();
            
            if (res.ok) {
                msgDiv.innerHTML = `<span class="success-msg">Checked in at ${loc}!</span>`;
                if(data.newBadge) {
                    alert(`🎉 NEW BADGE UNLOCKED: ${data.newBadge}`);
                }
                document.getElementById('gymLocationInput').value = '';
                setTimeout(() => msgDiv.innerHTML = '', 4000);
            } else {
                msgDiv.innerHTML = `<span class="error-msg">${data.message}</span>`;
            }
        } catch(e) {
            msgDiv.innerHTML = '<span class="error-msg">Network error</span>';
        }
    });

    async function fetchChallenges() {
        const list = document.getElementById('challengesList');
        if(!list) return;

        try {
            const res = await fetch('/api/challenges', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const challenges = await res.json();

            if (challenges.length === 0) {
                list.innerHTML = '<p style="color: var(--text-secondary);">No active challenges right now.</p>';
                return;
            }

            let html = '';
            challenges.forEach(c => {
                let actionHtml = '';
                if(c.isCompleted) {
                    actionHtml = `<span style="color:#00e676; font-size:0.8rem; font-weight:bold;">Completed ✓</span>`;
                } else if(c.isParticipating) {
                    const percent = Math.min(100, Math.round((c.myProgress / c.target) * 100));
                    actionHtml = `
                        <div style="width:100%; height:6px; background:rgba(255,255,255,0.1); border-radius:3px; margin-top:0.5rem; overflow:hidden;">
                            <div style="height:100%; width:${percent}%; background:#4facfe;"></div>
                        </div>
                        <span style="font-size:0.75rem; color:var(--text-secondary);">${c.myProgress} / ${c.target}</span>
                    `;
                } else {
                    actionHtml = `<button class="btn btn-secondary join-challenge-btn" data-id="${c._id}" style="padding:0.2rem 0.5rem; font-size:0.8rem;">Join</button>`;
                }

                html += `
                    <div style="background: rgba(255,255,255,0.02); padding: 1rem; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin-bottom: 0.8rem;">
                        <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                            <div>
                                <h4 style="margin:0 0 0.2rem 0; color:#fff;">${c.title}</h4>
                                <p style="font-size:0.8rem; color:var(--text-secondary); margin:0;">Reward: <span style="color:#ffca28;">${c.badgeReward}</span></p>
                            </div>
                            <div style="text-align:right;">${actionHtml}</div>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;

            document.querySelectorAll('.join-challenge-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.getAttribute('data-id');
                    try {
                        const r = await fetch(`/api/challenges/${id}/join`, {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (r.ok) {
                            alert('Joined Challenge!');
                            fetchChallenges();
                        }
                    } catch(err) { console.error(err); }
                });
            });

        } catch(e) {
            list.innerHTML = '<p class="error-msg">Failed to load challenges.</p>';
        }
    }
});
