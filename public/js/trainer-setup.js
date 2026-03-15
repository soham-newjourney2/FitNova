document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    const setupForm = document.getElementById('trainerProfileForm');
    const msgDiv = document.getElementById('setupMsg');

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
                msgDiv.innerHTML = '<span class="success-msg">Profile updated and published to Marketplace!</span>';
                setupForm.reset();
                setTimeout(() => msgDiv.innerHTML='', 3000);
            } else {
                const data = await res.json();
                msgDiv.innerHTML = `<span class="error-msg">${data.message || 'Failed to update'}</span>`;
            }
        } catch (err) {
            msgDiv.innerHTML = '<span class="error-msg">Network Error.</span>';
        }
    });
});
