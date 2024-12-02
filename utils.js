class DecentralizedBankContract {
  constructor() {
    require("dotenv").config();
    const { Web3 } = require("web3");

    this.web3 = new Web3(
      new Web3.providers.HttpProvider(process.env.GANACHE_URL)
    );

    this.contractABI = require("./DecentralizedBank.json");
    this.contractAddress = process.env.CONTRACT_ADDRESS;
    this.contract = new this.web3.eth.Contract(
      this.contractABI,
      this.contractAddress
    );
  }

  async initInvestor(investorAddress, fromAddress) {
    try {
      const defaultOptions = {
        from: fromAddress,
        gas: "2000000",
        gasPrice: this.web3.utils.toWei("20", "gwei"),
      };
      await this.contract.methods[`initInvestor`](
        investorAddress
      ).send(defaultOptions);
      return {
        status: true,
        investorAddress,
        fullMessage: `Successfully Initialized a new Investor(${investorAddress})`
      };
    } catch (error) {
      return {
        status: false,
        fullMessage: `Error in Initializing a new Investor: ${error}`
      };
    }
  }

  async getBalance(accountAddress) {
    try {
      return this.web3.eth.getBalance(accountAddress).then((balance) => {
        return {
          status: true,
          accountAddress,
          balance: this.web3.utils.fromWei(balance, "ether"),
          fullMessage: `Balance for ${accountAddress}: ${this.web3.utils.fromWei(balance, "ether")} ETH`,
        };
        
      });
    } catch (error) {
      return {
        status: false,
        fullMessage: `Error in retrieving your balance: ${error}`,
      };
    }
  }

  async initBorrower(borrowerAddress, fromAddress) {
    try {
      const accounts = await this.web3.eth.getAccounts();
      const defaultOptions = {
        from: fromAddress,
        gas: "2000000",
        gasPrice: this.web3.utils.toWei("20", "gwei"),
      };
      const result = await this.contract.methods[`initBorrower`](
        borrowerAddress
      ).send(defaultOptions);
      return {
        status: true,
        borrowerAddress,
        fullMessage: `Successfully Initialized a new Borrower (${borrowerAddress}))`
      };
    } catch (error) {
      return {
        status: false,
        fullMessage: `Error in Initializing a new Borrower: ${error}`
      };
    }
  }

  async createDeposit(investorAddress, amount) {
    try {
        const receipt = await this.contract.methods
            .deposit()
            .send({
                from: investorAddress,
                gas: "2000000",
                gasPrice: this.web3.utils.toWei("20", "gwei"),
                value: this.web3.utils.toWei(amount, "ether"),
            });

        return {
            status: true,
            fullMessage: `Successfully created a deposit of ${amount}`,
        };
    } catch (error) {
        return {
            status: false,
            fullMessage: `Error occurred while creating a deposit: ${error.message || error}`,
            error: error
        };
    }
}

  async withdrawDeposit(investorAddress, depositIndex) {
    try {
        const receipt = await this.contract.methods
            .withdrawDeposit(depositIndex)
            .send({
                from: investorAddress,
                gas: "2000000",
                gasPrice: this.web3.utils.toWei("20", "gwei"),
            })

            return {
                state: true,
                fullMessage: `Deposit Withdrawl Successful`
            }
    } catch (error) {
        return {
            status: false,
            fullMessage: `Error occured while withdrawing the deposit: ${error.message || error}`,
            error: error
        }
    }
      
  }

  async requestLoan(
    borrowerAddress,
    amount,
    collateral,
    numOfRepayments,
    interestRate
  ) {
    try {
      amount = this.web3.utils.toWei(amount, 'ether')
        const receipt = await this.contract.methods
        .requestLoan(amount, collateral, numOfRepayments, interestRate)
        .send({
            from: borrowerAddress,
            gas: "2000000",
            gasPrice: this.web3.utils.toWei("20", "gwei")
        })
        

        return {
            state: true,
            fullMessage: `Loan Request Successful`
        }
    } catch (error) {
        return {
            status: false,
            fullMessage: `Error occured while requesting loan: ${error.message || error}`,
            error: error
        }
    }
      
  }

  async approveLoan(borrowerAddress, fromAddress) {
    const accounts = await this.web3.eth.getAccounts();
    try {
        const reciept = await this.contract.methods
      .approveLoan(borrowerAddress)
      .send({
        from: fromAddress,
        gas: "2000000",
        gasPrice: this.web3.utils.toWei("20", "gwei"),
      });

      return {
        status: true,
        fullMessage: `Loan Request Approved for ${borrowerAddress}`
      }
    } catch (error) {
        return {
            status: false,
            fullMessage: `Error occurred while approving the loan request`,
            error
        }
    }
      
  }

  async doLoanRepayment(borrowerAddress, amount) {
    try {
        const receipt = await this.contract.methods
      .doLoanRepayment()
      .send({
        from: borrowerAddress,
        to: process.env.CONTRACT_ADDRESS,
        gas: "2000000",
        gasPrice: this.web3.utils.toWei("20", "gwei"),
        value: this.web3.utils.toWei(amount, 'ether')
      });
      
      return {
        status: true,
        fullMessage: `Successfully Paid the Loan Installment`
      }
    } catch (error) {
      
        return {
          status: false,
          fullMessage: error.message
        }
    }
      
  }

  async rejectLoan(borrowerAddress, fromAddress) {
    const accounts = await this.web3.eth.getAccounts();
    try {
        const reciept = await this.contract.methods
      .rejectLoan(borrowerAddress)
      .send({
        from: fromAddress,
        gas: "2000000",
        gasPrice: this.web3.utils.toWei("20", "gwei"),
      });

      return {
        status: true,
        fullMessage: `Rejected the Loan Request Successfully`
      }
    } catch (error) {
        return {
            status: false,
            fullMessage: `Error occurred while reject the loan request`,
            error
        }
    }
      
  }
}

module.exports = DecentralizedBankContract;
