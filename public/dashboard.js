window.onload = () => {

    let token = sessionStorage.getItem('accessToken');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    let decodedToken = jwt_decode(token);
    const privilege = decodedToken.privilege;
    const address = decodedToken.address;
    try {

        // Show/Hide sections based on privilege
        if (privilege === 'investor') {
            document.getElementById('balance-section').style.display = 'block';
            document.getElementById('deposit-section').style.display = 'block';
            document.getElementById('withdraw-section').style.display = 'block';
        }
        if (privilege === 'borrower') {
            document.getElementById('balance-section').style.display = 'block';
            document.getElementById('loan-section').style.display = 'block';
            document.getElementById('pay-loan-section').style.display = 'block';
        }
        if (privilege === 'owner') {
            document.getElementById('loan-request-card').style.display = 'block';
            document.getElementById('initialize-investor-section').style.display = 'block';
            document.getElementById('initialize-borrower-section').style.display = 'block';
            document.getElementById('openSidebarBtn').style.display = 'block';
            document.getElementById('sidebar').style.display = 'block';
        }
    } catch (error) {
        alert(error);
        window.location.href = 'login.html';
    }

    // Get Balance button
    document.getElementById('getBalanceBtn').addEventListener('click', async () => {
        try {
            const response = await fetch(`http://localhost:3000/user/${address}/balance`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                balanceText.textContent = 'Failed to fetch balance';
                return;
            }

            const balanceData = await response.json();
            balanceText.textContent = `Balance: ${balanceData.balance}ETH`;
        } catch (error) {
            balanceText.textContent = 'Error fetching balance';
        }
    });

    // Deposit button
    document.getElementById('depositBtn').addEventListener('click', async () => {
        const amount = document.getElementById('depositAmount').value;
        if (!amount) return alert('Please enter a valid deposit amount');

        try {
            const response = await fetch(`http://localhost:3000/user/${address}/create-deposit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });

            if (response.ok) {
                alert('Deposit successful');
            } else {
                alert('Failed to deposit');
            }
        } catch (error) {
            alert('Error making deposit');
        }
    });

    // Withdraw button
    document.getElementById('withdrawBtn').addEventListener('click', async () => {
        try {
            const response = await fetch(`http://localhost:3000/user/${address}/withdraw-deposit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ depositIndex: 0 })
            });
            if (response.ok) {
                alert('Withdrawal successful');
            } else {
                alert('Failed to withdraw');
            }
        } catch (error) {
            alert('Error withdrawing');
        }
    });

    // Request Loan button
    document.getElementById('requestLoanBtn').addEventListener('click', async () => {
        const amount = document.getElementById('loanAmount').value;
        if (!amount) return alert('Please enter a loan amount');

        try {
            const response = await fetch(`http://localhost:3000/user/${address}/request-loan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ amount })
            });

            if (response.ok) {
                alert('Loan requested successfully');
            } else {
                alert('Failed to request loan');
            }
        } catch (error) {
            alert('Error requesting loan');
        }
    });

    async function loadUsers() {
        const userListContainer = document.getElementById('userList');
        try {
            const response = await fetch('http://localhost:3000/getUsers', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            const users = Array.isArray(data) ? data : data.users || [];
    
            userListContainer.innerHTML = '';

            users.forEach(user => {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<strong>Wallet Address:</strong> ${user.address}<br><strong>Privilege:</strong> ${user.privilege}`;
                userListContainer.appendChild(listItem);
            });
        } catch (error) {
            alert('Error fetching user list');
        }
    }
    
    document.getElementById('openSidebarBtn').addEventListener('click', () => {
        loadUsers();
        document.getElementById('sidebar').classList.add('open');
    });
    
    // Close sidebar function
    document.getElementById('closeSidebar').addEventListener('click', () => {
        document.getElementById('sidebar').classList.remove('open');
    });

    async function loadLoanRequest() {
        try {
            const response = await fetch('http://localhost:3000/loan-requests', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const loanRequest = await response.json();
    
            if (loanRequest.status === true && loanRequest.response) {
                document.getElementById('borrower-address').textContent = loanRequest.response.address;
                document.getElementById('loan-amount').textContent = `${loanRequest.response.loanAmount} ETH`;
                document.getElementById('loan-request-card').style.display = 'block';
    
                // Approve button action
                document.getElementById('approveLoanBtn').onclick = async () => {
                    await handleLoanAction('approve', loanRequest.response.address);
                };
    
                // Reject button action
                document.getElementById('rejectLoanBtn').onclick = async () => {
                    await handleLoanAction('reject', loanRequest.response.address);
                };
            } else {
                document.getElementById('loan-request-card').style.display = 'none';
            }
        } catch (error) {
            console.error("Error fetching loan request:", error);
            document.getElementById('loan-request-card').style.display = 'none';
        }
    }
    
    
    async function handleLoanAction(action, address) {
        try {
            const endpoint = action === 'approve' ? `/approve-loan/${address}` : `/reject-loan/${address}`;
            const response = await fetch(`http://localhost:3000${endpoint}`, { 
                method: 'POST', 
                headers: {
                'Authorization': `Bearer ${token}`
            } });
            if (response.ok) {
                alert(`${action === 'approve' ? 'Approved' : 'Rejected'} loan successfully`);
                document.getElementById('loan-request-card').style.display = 'none';
            } else {
                alert('Failed to perform the action');
            }
        } catch (error) {
            console.error("Error handling loan action:", error);
        }
    }
    
    window.onload = loadLoanRequest();

    // Pay Loan button
    document.getElementById('payLoanBtn').addEventListener('click', async () => {
        try {
            const response = await fetch(`http://localhost:3000/user/${address}/payLoan`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {
                alert('Loan payment successful');
            } else {
                alert('Failed to pay loan');
            }
        } catch (error) {
            alert('Error paying loan');
        }
    });

    // Initialize Investor button (owner only)
    document.getElementById('initializeInvestorBtn').addEventListener('click', async () => {
        const investorAddress = document.getElementById('investorAddress').value;
        if (!investorAddress) return alert('Please enter an investor address');

        try {
            const response = await fetch(`http://localhost:3000/initialize/investor/${investorAddress}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            if (response.ok) {

                alert('Investor initialized');
            } else {
                alert('Failed to initialize investor');
            }
        } catch (error) {
            alert('Error initializing investor');
        }
    });

    // Initialize Borrower button (owner only)
    document.getElementById('initializeBorrowerBtn').addEventListener('click', async () => {
        const borrowerAddress = document.getElementById('borrowerAddress').value;
        if (!borrowerAddress) return alert('Please enter a borrower address');

        try {
            const response = await fetch(`http://localhost:3000/initialize/borrower/${borrowerAddress}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                alert('Borrower initialized');
            } else {
                alert('Failed to initialize borrower');
            }
        } catch (error) {
            alert('Error initializing borrower');
        }
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', async () => {
        try {
            let refreshToken = sessionStorage.getItem('refreshToken');
            const response = await fetch(`http://localhost:3000/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });
            if (response.ok) {
                alert('Logged out successfully');
            }
        } catch (error) {
            alert(`Error Occured`)
        }
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        window.location.href = 'login.html';
    });

    // refresh token button
    document.getElementById('refreshBtn').addEventListener('click', async () => {
        try {
            let refreshToken = sessionStorage.getItem('refreshToken');
            const response = await fetch(`http://localhost:3000/token`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken })
            });
            const data = await response.json();
            if (response.ok) {
                alert('Access Token Refreshed');
                sessionStorage.setItem('accessToken', data.accessToken);
                token = sessionStorage.getItem('accessToken');
            } else {
                alert('Failed to refresh access token');
            }
        } catch (error) {
            alert('Error refreshing access token');
        }
        
    })
};