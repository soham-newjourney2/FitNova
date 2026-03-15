// Common API call utility
async function apiCall(url, method = 'GET', body = null) {
    const token = localStorage.getItem('fitnova_token');
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('No token found');
    }

    const options = {
        method,
        headers: {
            'Authorization': `Bearer ${token}`
        }
    };

    if (body) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'API call failed');
        }
        return await response.json();
    } catch (error) {
        throw error;
    }
}
