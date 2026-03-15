document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    const localUserStr = localStorage.getItem('fitnova_user');
    
    if (!token || !localUserStr) {
        window.location.href = 'login.html';
        return;
    }

    const localUser = JSON.parse(localUserStr);
    
    // Check URL parameters for viewing other profiles
    const urlParams = new URLSearchParams(window.location.search);
    const localUserId = localUser._id || localUser.id;
    const profileId = urlParams.get('id') || localUserId;
    const isOwnProfile = profileId === localUserId;

    // DOM Elements
    const pName = document.getElementById('pName');
    const pRole = document.getElementById('pRole');
    const pBio = document.getElementById('pBio');
    const pAvatar = document.getElementById('pAvatar');
    const pFollowers = document.getElementById('pFollowers');
    const pFollowing = document.getElementById('pFollowing');
    const pInterests = document.getElementById('pInterests');
    
    const editBtn = document.getElementById('editProfileBtn');
    const connectBtn = document.getElementById('connectBtn');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editProfileForm');

    async function loadProfile() {
        try {
            const res = await fetch(`/api/users/profile/${profileId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (res.ok) {
                const profile = await res.json();
                renderProfile(profile);
            } else {
                document.getElementById('profileMsg').innerHTML = '<span class="error-msg">Profile not found.</span>';
            }
        } catch (error) {
            console.error(error);
        }
    }

    function renderProfile(profile) {
        pName.textContent = profile.name;
        pRole.textContent = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);
        pBio.textContent = profile.bio || "No bio provided yet.";
        
        if (profile.avatar) {
            pAvatar.innerHTML = `<img src="${profile.avatar}" alt="Avatar">`;
        } else {
            pAvatar.textContent = profile.name.charAt(0).toUpperCase();
        }

        pFollowers.textContent = profile.followers ? profile.followers.length : 0;
        pFollowing.textContent = profile.following ? profile.following.length : 0;

        if (profile.interests && profile.interests.length > 0) {
            pInterests.innerHTML = profile.interests.map(i => `<span class="tag">${i}</span>`).join('');
        } else {
            pInterests.innerHTML = '<span class="tag">Not specified</span>';
        }

        const pAchievements = document.getElementById('pAchievements');
        if (profile.achievements && profile.achievements.length > 0) {
            pAchievements.innerHTML = profile.achievements.map(a => `
                <div style="margin-bottom:1rem; padding-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <h4 style="color:#fff; margin-bottom:0.2rem;">${a.title}</h4>
                    <p style="font-size:0.8rem; margin-bottom:0.4rem; color:var(--text-secondary);">${new Date(a.date).toLocaleDateString()}</p>
                    <p style="font-size:0.9rem; color:var(--text-primary); line-height: 1.4;">${a.description || ''}</p>
                </div>
            `).join('');
        } else {
            pAchievements.innerHTML = 'No achievements listed.';
        }

        if (isOwnProfile) {
            editBtn.style.display = 'block';
        } else {
            document.getElementById('otherUserActions').style.display = 'flex';
            
            // Check if we are already following to alter button text
            const amIFollowing = profile.followers && profile.followers.some(f => (f._id || f) === localUser._id);
            connectBtn.style.display = 'block';
            connectBtn.textContent = amIFollowing ? 'Following' : 'Follow';
            connectBtn.style.background = amIFollowing ? 'transparent' : 'var(--accent-gradient)';
            connectBtn.style.border = amIFollowing ? '1px solid var(--border-color)' : 'none';
            
            const messageBtn = document.getElementById('messageBtn');
            messageBtn.style.display = 'block';
            messageBtn.onclick = () => window.location.href = `chat.html?userId=${profileId}`;
        }
    }

    if (isOwnProfile) {
        editBtn.addEventListener('click', () => {
            editModal.style.display = 'flex';
            // Pre-fill form
            document.getElementById('editBio').value = pBio.textContent.includes("No bio") ? "" : pBio.textContent;
            
            const currentTags = Array.from(pInterests.querySelectorAll('.tag')).map(t => t.textContent);
            if(currentTags.length > 0 && currentTags[0] !== 'Not specified') {
                document.getElementById('editInterests').value = currentTags.join(', ');
            }
        });

        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const avatarFile = document.getElementById('editAvatarFile').files[0];
            const bio = document.getElementById('editBio').value;
            const interests = document.getElementById('editInterests').value;

            try {
                if (avatarFile) {
                    const formData = new FormData();
                    formData.append('avatar', avatarFile);
                    await fetch('/api/upload/avatar', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                }

                const res = await fetch('/api/users/profile', {
                    method: 'PUT',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ bio, interests })
                });

                if (res.ok) {
                    const updatedUser = await res.json();
                    
                    // Update local storage so sidebar/other pages know newest avatar/name
                    const newLocal = { ...localUser, ...updatedUser };
                    localStorage.setItem('fitnova_user', JSON.stringify(newLocal));
                    
                    editModal.style.display = 'none';
                    loadProfile();
                } else {
                    alert('Failed to update profile');
                }
            } catch (err) {
                console.error(err);
            }
        });
    } else {
        connectBtn.addEventListener('click', async () => {
            const isFollowing = connectBtn.textContent === 'Following';
            const endpoint = isFollowing ? 'unfollow' : 'follow';
            
            try {
                const res = await fetch(`/api/users/${profileId}/${endpoint}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                
                if (res.ok) {
                    loadProfile(); // Reload to update followers count and button state
                } else {
                    const data = await res.json();
                    alert(data.message || 'Action failed');
                }
            } catch (err) {
                console.error(err);
                alert('An error occurred');
            }
        });
    }

    loadProfile();
});
