document.addEventListener('DOMContentLoaded', () => {
    
    // Config
    const API_URL = '/api/auth';

    // Utility for messages
    const showMessage = (msg, isError = false) => {
        const msgDiv = document.getElementById('authMessage');
        if (!msgDiv) return;
        msgDiv.textContent = msg;
        msgDiv.className = isError ? 'error-msg' : 'success-msg';
    };

    // --- LOGIN ---
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('fitnova_token', data.token);
                    localStorage.setItem('fitnova_user', JSON.stringify(data));
                    
                    // Check if health profile is complete
                    if (!data.healthProfile || !data.healthProfile.height) {
                        window.location.href = 'onboarding.html';
                    } else {
                        if (data.role === 'trainer') {
                            window.location.href = 'trainer-dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }
                } else {
                    showMessage(data.message || 'Login failed', true);
                }
            } catch (err) {
                showMessage('Network error. Please try again.', true);
            }
        });
    }

    // --- REGISTER ---
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;

            try {
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, password, role })
                });
                const data = await res.json();
                
                if (res.ok) {
                    localStorage.setItem('fitnova_token', data.token);
                    // newly registered users have no health profile -> send to onboarding
                    window.location.href = 'onboarding.html';
                } else {
                    showMessage(data.message || 'Registration failed', true);
                }
            } catch (err) {
                showMessage('Network error. Please try again.', true);
            }
        });
    }

    // --- ONBOARDING ---
    const onboardingForm = document.getElementById('onboardingForm');
    if (onboardingForm) {
        // Must have token to onboard
        const token = localStorage.getItem('fitnova_token');
        if (!token) {
            window.location.href = 'login.html';
        }

        onboardingForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // New Fields
            const age = document.getElementById('age').value;
            const gender = document.getElementById('gender').value;
            const medicalConditions = document.getElementById('medicalConditions').value || '';
            
            // Existing Fields
            const height = document.getElementById('height').value;
            const weight = document.getElementById('weight').value;
            const caloriesIntake = document.getElementById('caloriesIntake').value;
            const caloriesLoss = document.getElementById('caloriesLoss').value;
            const workoutExperience = document.getElementById('experience').value;

            try {
                const res = await fetch(`${API_URL}/onboarding`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        age: Number(age),
                        gender,
                        medicalConditions,
                        height: Number(height), 
                        weight: Number(weight), 
                        caloriesIntake: Number(caloriesIntake), 
                        caloriesLoss: Number(caloriesLoss), 
                        workoutExperience 
                    })
                });
                const data = await res.json();
                
                if (res.ok) {
                    showMessage('Profile updated successfully! Redirecting...');
                    setTimeout(() => {
                        const currentUser = JSON.parse(localStorage.getItem('fitnova_user'));
                        if (currentUser && currentUser.role === 'trainer') {
                            window.location.href = 'trainer-dashboard.html';
                        } else {
                            window.location.href = 'dashboard.html';
                        }
                    }, 1500);
                } else {
                    showMessage(data.message || 'Failed to update profile', true);
                }
            } catch (err) {
                showMessage('Network error. Please try again.', true);
            }
        });
    }

});

// Helper available globally
window.logout = () => {
    localStorage.removeItem('fitnova_token');
    localStorage.removeItem('fitnova_user');
    window.location.href = 'login.html';
};
