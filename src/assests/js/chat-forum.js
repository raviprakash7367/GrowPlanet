document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButton');
    const messageContainer = document.getElementById('messageContainer');
    const roomList = document.getElementById('roomList');
    const userList = document.getElementById('userList');
    const currentRoomTitle = document.getElementById('currentRoom');
    const languageSelect = document.getElementById('messageLanguage');

    let currentRoom = 'general';
    let username = '';

    // Get username from the server (you'll need to implement this)
    socket.on('connect', () => {
        socket.emit('getUsername');
    });

    socket.on('setUsername', (name) => {
        username = name;
    });

    // Room management
    roomList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const newRoom = e.target.dataset.room;
            if (newRoom !== currentRoom) {
                socket.emit('leaveRoom', currentRoom);
                socket.emit('joinRoom', newRoom);
                currentRoom = newRoom;
                currentRoomTitle.textContent = e.target.textContent;
                
                // Update active room visual
                document.querySelector('.chat-rooms li.active').classList.remove('active');
                e.target.classList.add('active');
                
                // Clear messages when switching rooms
                messageContainer.innerHTML = '';
            }
        }
    });

    // Send message
    function sendMessage() {
        const message = messageInput.value.trim();
        const language = languageSelect.value;
        
        if (message) {
            socket.emit('chatMessage', {
                room: currentRoom,
                message,
                language,
                username
            });
            messageInput.value = '';
        }
    }

    sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Receive message
    socket.on('message', (data) => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.username === username ? 'sent' : 'received'}`;
        
        const messageInfo = document.createElement('div');
        messageInfo.className = 'message-info';
        messageInfo.textContent = `${data.username} • ${new Date().toLocaleTimeString()} • ${data.language === 'hi' ? 'हिंदी' : 'English'}`;
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = data.message;
        
        messageDiv.appendChild(messageInfo);
        messageDiv.appendChild(messageText);
        messageContainer.appendChild(messageDiv);
        
        // Auto scroll to bottom
        messageContainer.scrollTop = messageContainer.scrollHeight;
    });

    // Update online users
    socket.on('updateUsers', (users) => {
        userList.innerHTML = '';
        users.forEach(user => {
            const li = document.createElement('li');
            li.textContent = user;
            userList.appendChild(li);
        });
    });

    // Join default room
    socket.emit('joinRoom', currentRoom);

    // Market Price Functionality
    const fetchPricesBtn = document.getElementById('fetchPricesBtn');
    const marketPriceDisplay = document.getElementById('marketPriceDisplay');
    const priceContent = marketPriceDisplay.querySelector('.price-content');
    const lastUpdated = marketPriceDisplay.querySelector('.last-updated');

    async function fetchMarketPrices() {
        try {
            priceContent.innerHTML = `<p>${translations[currentLanguage].loading_prices}</p>`;
            marketPriceDisplay.style.display = 'block';

            const response = await fetch('/api/market-prices');
            const data = await response.json();

            if (data.success) {
                priceContent.innerHTML = '';
                data.data.forEach(item => {
                    const priceItem = document.createElement('div');
                    priceItem.className = 'price-item';
                    
                    const commodityName = currentLanguage === 'hi' ? item.commodityHindi : item.commodity;
                    
                    priceItem.innerHTML = `
                        <h4>${commodityName}</h4>
                        <div class="price-details">
                            <div class="main-price">
                                <span class="price-label">${translations[currentLanguage].modal_price}:</span>
                                <span class="price-value">₹${item.modalPrice}</span>
                                <span class="trend ${item.trend}">
                                    <i class="fas fa-arrow-${item.trend}"></i>
                                </span>
                            </div>
                            <div class="price-range">
                                <span class="price-label">${translations[currentLanguage].price_range}:</span>
                                <span class="price-value">₹${item.minPrice} - ₹${item.maxPrice}</span>
                            </div>
                        </div>
                        <div class="date">${item.date}</div>
                    `;
                    priceContent.appendChild(priceItem);
                });

                lastUpdated.textContent = `${translations[currentLanguage].last_updated}: ${new Date(data.lastUpdated).toLocaleString()}`;
            } else {
                throw new Error('Failed to fetch prices');
            }
        } catch (error) {
            priceContent.innerHTML = `<p class="error">${translations[currentLanguage].error_fetching_prices}</p>`;
        }
    }

    fetchPricesBtn.addEventListener('click', fetchMarketPrices);

    // Show/hide market price display based on room
    roomList.addEventListener('click', (e) => {
        if (e.target.tagName === 'LI') {
            const newRoom = e.target.dataset.room;
            marketPriceDisplay.style.display = newRoom === 'market' ? 'block' : 'none';
            // ... existing room change code ...
        }
    });
}); 