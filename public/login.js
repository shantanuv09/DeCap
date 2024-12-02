document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Form Validation
    if (!username || !password) {
        alert("Both fields are required!");
        return;
    }

    const loginData = {
        username,
        password
    };

    try {
        const response = await fetch('http://localhost:3000/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData),
        });

        const data = await response.json();

        console.log('Response:', data);
        
        if (response.ok) {
            sessionStorage.setItem('accessToken', data.accessToken);
            sessionStorage.setItem('refreshToken', data.refreshToken);

            alert("Login successful!");
            window.location.href = '/dashboard.html';
        } else {
            alert(data.message || "Login failed. Please try again.");
        }
    } catch (error) {
        console.error("Error during login:", error);
        alert("Failed to log in, please try again.");
    }
});
