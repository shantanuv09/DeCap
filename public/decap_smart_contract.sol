// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

contract DecentralizedBank is Ownable {
    uint public interestRateForInvestment = 10;

    struct DepositReceipt {
        address investor;
        uint amount;
        uint timestamp;
    }

    struct LoanRequest {
        uint amount;
        bool approved;
        uint nextDueRepayment;
        uint256 numberOfRepaymentsRemaining;
        uint256 rateOfInterest;
    }

    address[] public investors;
    address[] public borrowers;
    uint public maxLoanAmount = 5 ether;
    mapping(address => LoanRequest) public loanRequests;
    mapping(address => uint) public repayment;
    mapping(address => DepositReceipt[]) public deposits;
    mapping(address => bool) public isInvestor;
    mapping(address => bool) public isBorrower;
    uint public investorCount;
    uint public borrowerCount;
    error LoanPaidError(string message);
    event temp(string message, uint amount);

    event DepositMade(address indexed investor, uint amount, uint timestamp);
    event WithdrawMade(address indexed investor, uint amount, uint timestamp);
    event LoanApproved(address indexed borrower, uint amount, uint timestamp);
    event LoanRejected(address indexed borrower, uint timestamp);

    constructor() Ownable(msg.sender) payable {}

    function initInvestor(address _investor) external onlyOwner {
        require(_investor != address(0), "Can't be zero address");
        require(!isInvestor[_investor], "Investor already exists");
        if (isBorrower[_investor]){
            isBorrower[_investor] = false;
            borrowerCount--;
        }
        investors.push(_investor);
        isInvestor[_investor] = true;
        investorCount++;
    }

    function initBorrower(address _borrower) external onlyOwner {
        require(_borrower != address(0), "Can't be zero address");
        require(!isBorrower[_borrower], "Borrower already exists");
        if (isInvestor[_borrower]){
            isInvestor[_borrower] = false;
            investorCount--;
        }
        borrowers.push(_borrower);
        isBorrower[_borrower] = true;
        borrowerCount++;
    }

    function deposit() external payable {
        require(isInvestor[msg.sender], "Not an investor");
        require(msg.value > 0, "Deposit amount must be greater than 0");
        
        DepositReceipt memory newDeposit = DepositReceipt(msg.sender, msg.value, block.timestamp);
        deposits[msg.sender].push(newDeposit);
    }

    function withdrawDeposit(uint depositIndex) external {
    require(isInvestor[msg.sender], "Not an investor");
    require(deposits[msg.sender].length > depositIndex, "No Deposit Found");
    DepositReceipt memory userDeposit = deposits[msg.sender][depositIndex];
    require(block.timestamp > userDeposit.timestamp + 60, "Deposit is not matured");
    uint amountWithInterest = userDeposit.amount + (userDeposit.amount * interestRateForInvestment/100);
    require(address(this).balance >= amountWithInterest, "Insufficient contract balance");

    deposits[msg.sender][depositIndex] = deposits[msg.sender][deposits[msg.sender].length - 1];
    deposits[msg.sender].pop();

    (bool sent, ) = payable(msg.sender).call{value: amountWithInterest}("");
    require(sent, "Failed to send Ether");

    emit WithdrawMade(msg.sender, amountWithInterest, block.timestamp);
}

    function setInterestRate(uint _rate) external onlyOwner {
        interestRateForInvestment = _rate;
    }

    receive() external payable {}

    function minimumAmount(uint amount) internal pure returns(uint) {
        require(amount > 0 && amount <= 5 ether, "Invalid amount");
        if (amount <= 1 ether) {
            return 0;
        } else if (amount <= 2 ether) {
            return 1 ether;
        } else if (amount <= 4 ether) {
            return 2 ether;
        } else if (amount == 5 ether) {
            return 3 ether;
        }
    }

    function checkLoanEligibility(address borrower, uint amount, uint collateral) internal view returns(bool) {
        require(isBorrower[borrower], "Not a Borrower");
        require(amount <= maxLoanAmount, "Max loan amount exceeded");
        require(collateral >= minimumAmount(amount), "Collateral is less than the limit");
        require(loanRequests[borrower].amount == 0, "Pay Earlier Loan First");
        return true;
    }

    function requestLoan(uint amount, uint collateral, uint256 _numberOfRepaymentsRemaining, uint256 _rateOfInterest) external {
        require(isBorrower[msg.sender], "Not registered as a borrower");
        require(checkLoanEligibility(msg.sender, amount, collateral), "Not eligible for a loan");
        loanRequests[msg.sender] = LoanRequest({
            amount: amount,
            approved: false,
            numberOfRepaymentsRemaining: _numberOfRepaymentsRemaining,
            rateOfInterest : _rateOfInterest,
            nextDueRepayment: block.timestamp + 60
        });
    }

    function doLoanRepayment() public payable {
    require(isBorrower[msg.sender], "Not registered as a borrower.");
    require(loanRequests[msg.sender].approved, "Loan is not approved yet.");
    require(loanRequests[msg.sender].numberOfRepaymentsRemaining > 0, "Loan already fully paid");
    require(loanRequests[msg.sender].nextDueRepayment <= block.timestamp, "Wait till the next due repayment time");
    loanRequests[msg.sender].numberOfRepaymentsRemaining--;
    loanRequests[msg.sender].nextDueRepayment = block.timestamp + 60;

    if (loanRequests[msg.sender].numberOfRepaymentsRemaining == 0) {
        delete loanRequests[msg.sender];
    }
}

    function approveLoan(address borrower) external onlyOwner {
        require(loanRequests[borrower].amount > 0, "Loan request does not exist");
        require(!loanRequests[borrower].approved, "Loan already approved");
        uint loanAmount = loanRequests[borrower].amount;
        require(address(this).balance >= loanAmount, "Insufficient contract balance");
        payable(borrower).transfer(loanAmount);
        loanRequests[borrower].approved = true;
        loanRequests[borrower].nextDueRepayment = block.timestamp;
        emit LoanApproved(borrower, loanAmount, block.timestamp);
    }

    function rejectLoan(address borrower) external onlyOwner {
        require(loanRequests[borrower].amount > 0, "Loan request does not exist");
        require(loanRequests[borrower].approved == false, "Cannot Reject already approved loan request");
        delete loanRequests[borrower];
        emit LoanRejected(borrower, block.timestamp);
    }
}
