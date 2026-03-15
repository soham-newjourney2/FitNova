document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('fitnova_token');
    const localUserStr = localStorage.getItem('fitnova_user');
    
    if (!token || !localUserStr) {
        window.location.href = 'login.html';
        return;
    }

    const localUser = JSON.parse(localUserStr);
    let activeRoomId = null;
    let roomsData = [];
    let currentTab = 'direct';

    const roomsList = document.getElementById('roomsList');
    const messagesList = document.getElementById('messagesList');
    const chatForm = document.getElementById('chatForm');
    const messageInput = document.getElementById('messageInput');
    const noChatSelected = document.getElementById('noChatSelected');
    const activeChat = document.getElementById('activeChat');

    // Tab Switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
            btn.classList.add('active');
            currentTab = btn.dataset.tab;
            renderRooms();
        };
    });

    const urlParams = new URLSearchParams(window.location.search);
    const directUserId = urlParams.get('userId');

    async function init() {
        if (directUserId) {
            await getOrCreateDirectRoom(directUserId);
        }
        await loadRooms();
        setInterval(loadRooms, 5000); // polling
    }

    async function getOrCreateDirectRoom(userId) {
        try {
            const res = await fetch(`/api/chat/rooms/direct/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const room = await res.json();
                activeRoomId = room._id;
                currentTab = 'direct';
                document.querySelector('[data-tab="direct"]').click();
            }
        } catch (e) { console.error(e); }
    }

    async function loadRooms() {
        try {
            const res = await fetch('/api/chat/rooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                roomsData = await res.json();
                renderRooms();
                
                if (activeRoomId && activeChat.style.display !== 'none') {
                    await loadMessages(activeRoomId, false); // silent refresh
                } else if (directUserId && activeRoomId) {
                    const roomToActivate = roomsData.find(r => r._id === activeRoomId);
                    if (roomToActivate) selectRoom(roomToActivate);
                }
            }
        } catch(e) { console.error(e); }
    }

    function getRoomDisplayInfo(room) {
        if (room.isGroup || room.type === 'group') {
            return { name: room.name || 'Squad Chat', avatar: null, isGroup: true };
        }
        
        const otherParticipant = room.participants.find(p => p._id !== localUser._id && p._id !== localUser.id) || room.participants[0];
        return { 
            name: otherParticipant ? (otherParticipant.name || 'Unknown User') : 'Unknown User',
            avatar: otherParticipant ? otherParticipant.avatar : null,
            isGroup: false
        };
    }

    function renderRooms() {
        const filtered = roomsData.filter(r => {
            const isGroup = r.isGroup || r.type === 'group';
            return currentTab === 'squads' ? isGroup : !isGroup;
        });

        roomsList.innerHTML = '';
        if (filtered.length === 0) {
            roomsList.innerHTML = `<div style="padding:1rem; text-align:center; color:var(--text-secondary);">No ${currentTab} chats yet.</div>`;
            return;
        }

        filtered.forEach(room => {
            const info = getRoomDisplayInfo(room);
            const avatarFallback = info.name.charAt(0).toUpperCase();
            const avatarHtml = info.avatar ? `<img src="${info.avatar}" alt="">` : avatarFallback;
                
            let lastMsgText = 'Say hi!';
            if (room.lastMessage) {
                const isMe = room.lastMessage.sender._id === localUser._id || room.lastMessage.sender === localUser.id;
                lastMsgText = (isMe ? 'You: ' : '') + room.lastMessage.content;
            }

            const roomEl = document.createElement('div');
            roomEl.className = `room-item-premium ${activeRoomId === room._id ? 'active' : ''}`;
            roomEl.onclick = () => selectRoom(room);
            
            roomEl.innerHTML = `
                <div class="room-icon">${info.isGroup ? '👥' : avatarHtml}</div>
                <div class="room-details">
                    <div class="room-name">${info.name}</div>
                    <div class="room-last-message">${lastMsgText}</div>
                </div>
            `;
            roomsList.appendChild(roomEl);
        });
    }

    async function selectRoom(room) {
        activeRoomId = room._id;
        renderRooms(); // visual highlight
        
        noChatSelected.style.display = 'none';
        activeChat.style.display = 'flex';

        const info = getRoomDisplayInfo(room);
        document.getElementById('roomTitle').innerText = info.name;
        document.getElementById('roomStatus').innerText = info.isGroup ? 'Squad' : 'Online';

        const activeRoomAvatar = document.getElementById('activeRoomAvatar');
        if (info.avatar) {
            activeRoomAvatar.src = info.avatar;
            activeRoomAvatar.style.display = 'inline-block';
        } else {
            activeRoomAvatar.style.display = 'none';
        }

        messagesList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Loading messages...</div>';
        await loadMessages(room._id, true);
    }

    async function loadMessages(roomId, scroll = true) {
        try {
            const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const messages = await res.json();
                
                if(messages.length === 0) {
                    messagesList.innerHTML = '<div style="text-align:center; padding:2rem; color:var(--text-secondary);">Start the conversation!</div>';
                    return;
                }

                const prevHeight = messagesList.scrollHeight;

                messagesList.innerHTML = messages.map(msg => {
                    const senderId = msg.sender._id || msg.sender;
                    const isSent = senderId === localUser._id || senderId === localUser.id;
                    const senderName = msg.sender.name || 'User';
                    
                    return `
                        <div class="message-premium ${isSent ? 'sent' : 'received'}">
                            <div class="bubble">
                                ${!isSent ? `<small style="display:block; color:var(--primary-accent); font-weight:700; margin-bottom:0.2rem; font-size:0.75rem;">${senderName}</small>` : ''}
                                <div class="content">${msg.content}</div>
                                <div style="font-size:0.7rem; opacity:0.6; margin-top:0.4rem; text-align:right;">
                                    ${new Date(msg.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
                
                if (scroll) {
                    messagesList.scrollTop = messagesList.scrollHeight;
                }
            }
        } catch(e) { console.error(e); }
    }

    chatForm.onsubmit = async (e) => {
        e.preventDefault();
        const content = messageInput.value.trim();
        if(!content || !activeRoomId) return;
        
        messageInput.value = '';
        try {
            const res = await fetch(`/api/chat/rooms/${activeRoomId}/messages`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ content })
            });
            if (res.ok) {
                await loadMessages(activeRoomId, true);
                loadRooms(); // update sidebar latest msg
            }
        } catch(e) { console.error(e); }
    };

    init();
});
