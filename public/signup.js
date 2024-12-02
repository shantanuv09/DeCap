document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const walletAddress = document.getElementById("walletAddress").value;

    // Form Validation
    if (!username || !password || !confirmPassword || !walletAddress) {
        alert("All fields must be filled!");
        return;
    }

    if (password !== confirmPassword) {
        alert("Passwords do not match!");
        return;
    }

    const userData = {
        username,
        password,
        confirmPassword,
        address: walletAddress
    };

    try {
        const response = await fetch('http://localhost:3000/create-user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        const data = await response.json();

        if (response.ok) {
            alert("User created successfully!");
            window.location.href = '/login.html';
        } else {
            alert(data.message || "Error occurred while creating the user.");
        }
    } catch (error) {
        console.error("Error during sign-up:", error);
        alert("Failed to create user, please try again.");
    }
});
