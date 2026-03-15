document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    const localUserStr = localStorage.getItem('fitnova_user');
    
    if (!token || !localUserStr) {
        window.location.href = 'login.html';
        return;
    }

    const localUser = JSON.parse(localUserStr);
    
    // Set Header Avatar
    if (document.getElementById('currentUserAvatar')) {
        document.getElementById('currentUserAvatar').src = localUser.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(localUser.name)}`;
    }

    /* === Modals === */
    const postModal = document.getElementById('postModal');
    const startPostBtn = document.getElementById('startPostBtn');
    if (startPostBtn) {
        startPostBtn.onclick = () => postModal.classList.add('open');
    }
    
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            btn.closest('.modal').classList.remove('open');
        }
    });
    
    window.onclick = (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('open');
        }
    };

    /* === Image Upload Preview in Modal === */
    const postImageInput = document.getElementById('postImage');
    const imagePreview = document.getElementById('imagePreview');
    const uploadLabel = document.getElementById('uploadLabel');
    let selectedImageFile = null;

    if (postImageInput) {
        postImageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                selectedImageFile = this.files[0];
                const reader = new FileReader();
                reader.onload = function(e) {
                    imagePreview.src = e.target.result;
                    imagePreview.style.display = 'block';
                    uploadLabel.querySelector('span').innerText = 'Change photo';
                }
                reader.readAsDataURL(selectedImageFile);
            }
        });
    }

    /* === Post Logic === */
    const postsFeed = document.getElementById('postsFeed');
    let allPosts = [];
    let currentFilter = 'all';

    async function loadPosts() {
        try {
            const res = await fetch('/api/community/posts', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                allPosts = await res.json();
                renderPosts();
            } else {
                postsFeed.innerHTML = '<p class="error-msg text-center padding-2">Failed to load posts.</p>';
            }
        } catch(e) { console.error(e); }
    }

    function renderPosts() {
        const filtered = allPosts.filter(p => currentFilter === 'all' || p.category === currentFilter);
        
        if (filtered.length === 0) {
            postsFeed.innerHTML = `<div class="empty-state text-center" style="padding: 3rem; color: var(--text-secondary);">
                                        <i class="fas fa-camera-retro" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
                                        <p>No posts in this feed yet. Be the first!</p>
                                   </div>`;
            return;
        }

        postsFeed.innerHTML = filtered.map(post => {
            const isLiked = post.likes && post.likes.includes(localUser._id || localUser.id);
            const avatar = post.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.author.name)}`;
            const commentCount = post.comments ? post.comments.length : 0;
            const likeCount = post.likes ? post.likes.length : 0;
            const tagLabel = post.category && post.category !== 'general' 
                ? `<span class="post-category-tag">${post.category}</span>` : '';
            
            // Image template
            const imageHtml = post.imageUrl ? `
                <div class="post-image-container">
                    <img src="${post.imageUrl}" class="post-img" alt="Post Request" loading="lazy">
                </div>
            ` : '';

            return `
                <div class="post-card">
                    <div class="post-header">
                        <img src="${avatar}" class="post-avatar" alt="${post.author.name}">
                        <div class="post-meta">
                            <h4>${post.author.name} ${tagLabel}</h4>
                            <span>${new Date(post.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric'})} • ${new Date(post.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit'})}</span>
                        </div>
                        <button class="action-item" style="margin-left:auto;" onclick="window.location.href='chat.html?userId=${post.author._id}'">
                            <i class="far fa-paper-plane" style="font-size:1.2rem;"></i>
                        </button>
                    </div>

                    ${imageHtml}

                    <div class="post-footer">
                        <div class="post-actions-bar">
                            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">
                                <i class="${isLiked ? 'fas' : 'far'} fa-heart"></i>
                            </button>
                            <button class="action-btn" onclick="openComments('${post._id}')">
                                <i class="far fa-comment"></i>
                            </button>
                        </div>
                        
                        <span class="likes-count">${likeCount} ${likeCount === 1 ? 'like' : 'likes'}</span>
                        
                        <div class="post-content">
                            <strong style="color:white;">${post.author.name}</strong> ${post.content}
                        </div>

                        ${commentCount > 0 ? `<button class="view-comments-btn" onclick="openComments('${post._id}')">View all ${commentCount} comments</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    /* === Create Post Submit === */
    const createPostForm = document.getElementById('createPostForm');
    if (createPostForm) {
        createPostForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = document.getElementById('submitPostBtn');
            const originalText = submitBtn.innerText;
            submitBtn.innerText = 'Sharing...';
            submitBtn.disabled = true;

            const content = document.getElementById('postContent').value;
            const category = document.getElementById('postCategory').value;
            let imageUrl = '';

            try {
                // Step 1: Upload Image if selected
                if (selectedImageFile) {
                    const formData = new FormData();
                    formData.append('image', selectedImageFile);
                    
                    const uploadRes = await fetch('/api/upload/image', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });

                    if (uploadRes.ok) {
                        const uploadData = await uploadRes.json();
                        imageUrl = uploadData.imageUrl;
                    }
                }

                // Step 2: Create Post
                const res = await fetch('/api/community/posts', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ content, category, imageUrl }) // Added imageUrl
                });
                
                if (res.ok) {
                    createPostForm.reset();
                    // Reset image preview
                    selectedImageFile = null;
                    imagePreview.style.display = 'none';
                    imagePreview.src = '';
                    uploadLabel.querySelector('span').innerText = 'Click to add a photo';
                    
                    postModal.classList.remove('open');
                    await loadPosts();
                }
            } catch(e) { 
                console.error(e); 
            } finally {
                submitBtn.innerText = originalText;
                submitBtn.disabled = false;
            }
        });
    }

    /* === Like Actions === */
    window.toggleLike = async (postId) => {
        try {
            await fetch(`/api/community/posts/${postId}/like`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await loadPosts();
        } catch(e) { console.error(e); }
    };

    /* === Comments === */
    let activeCommentPostId = null;
    const commentsModal = document.getElementById('commentsModal');
    
    if (document.querySelector('.close-comments-modal')) {
        document.querySelector('.close-comments-modal').onclick = () => commentsModal.classList.remove('open');
    }

    window.openComments = async (postId) => {
        activeCommentPostId = postId;
        commentsModal.classList.add('open');
        await loadComments();
    };

    async function loadComments() {
        const commentsList = document.getElementById('commentsList');
        try {
            const res = await fetch(`/api/community/posts/${activeCommentPostId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const post = await res.json(); // The backend returns a single populated post object
                
                if (!post || !post.comments || post.comments.length === 0) {
                    commentsList.innerHTML = `
                        <div style="text-align:center; padding: 3rem 1rem; color:var(--text-secondary);">
                            <i class="far fa-comments" style="font-size:3rem; margin-bottom:1rem; opacity:0.5;"></i>
                            <p>No comments yet. Start the conversation!</p>
                        </div>
                    `;
                } else {
                    commentsList.innerHTML = post.comments.map(c => {
                        const avatar = c.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.user?.name || 'User')}`;
                        const isOwn = (c.user?._id || c.user) === (localUser._id || localUser.id);
                        return `
                        <div class="comment-item ${isOwn ? 'own' : ''}">
                            <img src="${avatar}" alt="" class="comment-avatar">
                            <div class="comment-body">
                                ${!isOwn ? `<strong>${c.user?.name || 'User'}</strong>` : ''}
                                ${c.text}
                                <span class="comment-date">${new Date(c.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                            </div>
                        </div>
                    `;
                    }).join('');
                }
                
                // Scroll to bottom
                commentsList.scrollTop = commentsList.scrollHeight;
            }
        } catch (e) {
            commentsList.innerHTML = '<p class="error-msg text-center">Error loading comments.</p>';
        }
    }

    const addCommentForm = document.getElementById('addCommentForm');
    if (addCommentForm) {
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = document.getElementById('commentInput').value;
            if(!text || !activeCommentPostId) return;

            try {
                const res = await fetch(`/api/community/posts/${activeCommentPostId}/comment`, { // Updated route to match backend Controller Post/:id/comment
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({ text })
                });
                if (res.ok) {
                    document.getElementById('commentInput').value = '';
                    await loadPosts(); // Refresh master list
                    await loadComments(); // Refresh modal
                }
            } catch(e) {}
        });
    }

    /* === Filters / Discover === */
    document.querySelectorAll('.cat-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelectorAll('.cat-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            currentFilter = link.dataset.filter === 'all' ? 'all' : link.dataset.filter;
            // Since post.category isn't in backend Postschema strictly, 
            // you might categorize based on tags or other metrics. Assuming category is supported locally:
            renderPosts();
        });
    });

    /* === Squads Load === */
    async function loadSquads() {
        const squadsList = document.getElementById('squadsList');
        try {
            const res = await fetch('/api/community/groups', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const groups = await res.json();
                if (groups.length > 0) {
                    squadsList.innerHTML = groups.map(g => `
                        <div class="squad-card" onclick="window.location.href='chat.html'">
                            <div style="width:36px; height:36px; border-radius:8px; background:rgba(0,255,136,0.1); display:flex; align-items:center; justify-content:center; color:var(--primary-accent);">
                                <i class="fas fa-users"></i>
                            </div>
                            <div>
                                <strong style="color:#fff; font-size:0.95rem;">${g.name}</strong>
                                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">${g.members.length} members</div>
                            </div>
                        </div>
                    `).join('');
                } else {
                    squadsList.innerHTML = '<p style="color:var(--text-secondary); font-size:0.9rem;">Join a squad to connect!</p>';
                }
            }
        } catch(e) {}
    }

    loadPosts();
    loadSquads();
});
