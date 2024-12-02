document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission

    // Get values from the form
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    // Form Validation
    if (!username || !password) {
        alert("Both fields are required!");
        return;
    }

    // Prepare data to send
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

        const data = await response.json(); // Parse JSON response

        console.log('Response:', data);  // Log the response for debugging
        
        if (response.ok) {
            // On successful login, save the tokens and redirect
            sessionStorage.setItem('accessToken', data.accessToken);
            sessionStorage.setItem('refreshToken', data.refreshToken);

            alert("Login successful!");
            window.location.href = '/dashboard.html'; // Redirect to the dashboard or home page
        } else {
            // Show error message from the backend
            alert(data.message || "Login failed. Please try again.");
        }
    } catch (error) {
        console.error("Error during login:", error);  // Log any frontend error
        alert("Failed to log in, please try again.");
    }
});
