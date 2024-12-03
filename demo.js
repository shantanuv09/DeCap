const jwt = require('jsonwebtoken')
const bcrypt = require('bcrypt')
const mongoose = require('mongoose');
const express = require("express");
const app = express();
require('jwt-decode')
app.use(express.json());
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});
require("dotenv").config();
const DecentralizedBankContract = require("./utils.js");
const { status, type } = require("express/lib/response.js");
const { jwtDecode } = require("jwt-decode");
const path = require("path");
const { stat } = require("fs");
const dbc = new DecentralizedBankContract();

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    address: {
        type: String,
        required: true,
        unique: true
    },
    privilege: {
        type: String,
        required: true
    },
    hashedPassword: {
        type: String,
        required: true,
        unique: true
    },
    refreshToken: {
        type: String,
        default: ""
    },
    loanAmount: {
        type: Number,
        default: 0
    }
});

const loanRequestSchema = new mongoose.Schema({
    address: {
        type: String,
        required: true,
        unique: true
    },
    loanAmount: {
        type: Number,
        required: true
    }
})

app.use(express.static(path.join(__dirname, "public")));

const User = mongoose.model('user', userSchema);
const Loan = mongoose.model('loanRequest', loanRequestSchema);
mongoose.connect('mongodb://127.0.0.1:27017/project').then(() => console.log("MongoDB Connected")).catch((err) => console.log(err));

app.post("/create-user", async (req, res) => {
    const { username, password, confirmPassword, address }= req.body
    if (!username || !password || !confirmPassword || !address) return res.sendStatus(400, 'All fields must be entered!!!');
    if (!(password === confirmPassword)) return res.sendStatus(400, 'Passwords do not match!!!');
    let hashedPassword = await bcrypt.hash(password, 10);
    
    try {
        const result = await User.create({
            username: username,
            address: address,
            hashedPassword: hashedPassword,
            privilege: 'user'
        })
        res.status(201).json({
            message: `Successfully create the user`
        });
    } catch (error) {
        res.status(400).json({
            message: `Error in creating the user`
        });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Enter the credentials!!!' });
    }

    let dbUser = await User.findOne({ username: username });
    if (!dbUser) {
        return res.status(400).json({ message: 'Incorrect credentials!!!' });
    }
    
    try {
        if (await bcrypt.compare(password, dbUser.hashedPassword)) {
            const accessToken = generateAccessToken(dbUser.address, dbUser.privilege);
            const refreshToken = jwt.sign(dbUser.address, process.env.REFRESH_TOKEN_SECRET);

            await User.findOneAndUpdate({ address: dbUser.address }, { refreshToken });

            res.status(200).json({
                accessToken,
                refreshToken
            });
        } else {
            res.status(400).json({ message: 'Incorrect credentials!!!' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error!' });
    }
});

app.post('/logout', authenticateToken, async (req, res) => {
    let refreshToken = req.body.refreshToken
    if (refreshToken == null) return res.status(400);
    await User.findOneAndUpdate({refreshToken}, {refreshToken: ''});
    return res.sendStatus(200);
});

app.get('/loan-requests', authenticateToken, async (req, res) => {
    try {
        let response = await Loan.findOne({});
        res.json({status: true, response}).status(200)
    } catch (err) {
        res.json({status: false}).status(500)
        console.log(err)
    }
});

app.post('/token', async (req, res) => {
    const refreshToken = req.body.refreshToken

    try {
        if (refreshToken == null){
            return res.json({
                message: 'No refresh token in request body'
            }).status(401);
        }
        let token = await User.findOne({ refreshToken });
        if (!token){
            return res.json({
                message: 'Invalid Refresh Token'
            }).status(401);
        }
        if (!(token.refreshToken === refreshToken)){
            return res.json({
                message: 'Invalid Refresh Token'
            }).status(403);
        }
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
            if (err) return res.sendStatus(403)
            const accessToken = generateAccessToken(user, token.privilege)
            res.json({
                accessToken
            })
          })
    } catch (err){
        console.error(err);
        res.status(500).json({ message: 'Server error!' });
    }
    
});

app.get('/dashboard.html', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.sendFile(path.join("<path-to-dashboard.html>", 'public', 'dashboard.html'));
});

function generateAccessToken(user, privilege) {
    return jwt.sign({
        address: user,
        privilege: privilege,
    }, process.env.JWT_SECRET, { expiresIn: 60 })
  }

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]
  if (token == null) return res.json({
    message: 'Unauthorized'
  }).status(401)

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

  
app.get("/user/:user/balance", authenticateToken, async (req, res) => {
    const user = req.params.user;
    const decoded_token = jwtDecode(req.headers['authorization'].split(' ')[1].toString())
    
    try {
        if (!(user === decoded_token.address)){
            throw "Error"
        }
      let balance = await dbc.getBalance(user);
      if (!balance) {
        throw "Error";
      }
      res.json(balance);
    } catch (error) {
      res.json({ status: false, message: "Something went wrong.", error }).status(400);
    }
});

app.post("/initialize/investor/:user", authenticateToken, async (req, res) => {
    const { user } = req.params;
    const decoded_token = jwtDecode(req.headers['authorization'].split(' ')[1].toString())
    try {
        let result = await dbc.initInvestor(user, decoded_token.address);
        if (result.status == false) {
            throw "Error";
        }
        await User.findOneAndUpdate({
            address: user
        }, {privilege: 'investor'});
        res.json(result).status(201);
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong.`, error
        }).status(400);
    }
});

app.post("/initialize/borrower/:user", authenticateToken, async (req, res) => {
    const { user } = req.params;
    const decoded_token = jwtDecode(req.headers['authorization'].split(' ')[1].toString())
    try {
        let result = await dbc.initBorrower(user, decoded_token.address);
        if (result.status == false) {
            throw "Error";
        }
        await User.findOneAndUpdate({
            address: user
        }, {privilege: 'borrower'});
        res.json(result).status(201);
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong.`, 
            error
        }).status(400);
    }
});

app.post("/user/:investor/create-deposit", authenticateToken, async (req, res) => {
    const investor = req.params.investor;
    const { amount } = req.body;
    if (!amount) {
        return res.status(400).json({
            status: false,
            fullMessage: "Amount is required to create a deposit.",
        });
    }

    try {
        let result = await dbc.createDeposit(investor, amount);
        if (result.status == false) {
            throw "Error";
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({
            status: false,
            fullMessage: "Something went wrong while creating the deposit.",
            error
        });
    }
});

app.post("/user/:investor/withdraw-deposit", authenticateToken, async (req, res) => {
    const investor = req.params.investor;
    const { depositIndex } = req.body;


    if (!depositIndex && depositIndex!=0) {
        return res.json({
            status: false,
            fullMessage: "deposit index is required to withdraw the deposit.",
        }).status(400);
    }

    try {
        let result = await dbc.withdrawDeposit(investor, depositIndex);
        if (result.status == false) {
            throw "Error";
        }
        res.json(result);
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong while withdrawing the deposit.`,
            error
        });
    }
});

app.post("/user/:borrower/request-loan", authenticateToken, async (req, res) =>{
    const { borrower } = req.params
    const { amount } = req.body
    const collateral = 10000
    const numOfRepayments = 2
    const interestRate = 2
    
    await User.findOneAndUpdate({address: borrower}, {loanAmount: amount});

    if (!amount || !collateral || !numOfRepayments || !interestRate) {
        return res.json({
            status: false,
            fullMessage: "Incomplete Input Parameters Provided.",
        }).status(400);
    }

    try {
        let result = await dbc.requestLoan(borrower, amount,
            collateral,
            numOfRepayments,
            interestRate);
        if (result.status == false) {
                throw "Error";
        }
        await Loan.create({
            address: borrower,
            loanAmount: amount
        });
        res.json({
            status: true,
            fullMessage: `Loan Request Sent Successfully.`
        })
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong while requesting the loan.`,
            error
        }).status(400)
    }
});

app.post("/approve-loan/:borrower", authenticateToken, async (req, res) => {
    const { borrower } = req.params;
    
    if (!borrower) {
        res.json ({
            status: false,
            fullMessage: `Provide address who's loan is to be approved`
        }).status(400);
    }
    const decoded_token = jwtDecode(req.headers['authorization'].split(' ')[1].toString())
    try {
        let result = await dbc.approveLoan(borrower, decoded_token.address);
        if (result.status == false) {
            throw "Error";
        }
        await Loan.findOneAndDelete(
            {address: borrower}
        )
        res.json({
            status: true,
            fullMessage: `Successfully Approved the Loan Request`
        }).status(200);
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong while approving the loan request`,
            error
        }).status(400);
    }
});

app.post("/reject-loan/:borrower", authenticateToken, async (req, res) => {
    const { borrower } = req.params;

    if (!borrower) {
        res.json ({
            status: false,
            fullMessage: `Provide address who's loan is to be approved`
        }).status(400);
    }
    const decoded_token = jwtDecode(req.headers['authorization'].split(' ')[1].toString())
    try {
        let result = await dbc.rejectLoan(borrower, decoded_token.address);
        if (result.status == false) {
            throw "Error";
        }
        await Loan.findOneAndDelete(
            {address: borrower}
        )
        res.json({
            status: true,
            fullMessage: `Successfully Rejected the Loan Request`,
            result
        }).status(200);
    } catch (error) {
        res.json({
            status: false,
            fullMessage: `Something went wrong while rejecting the loan request`,
            error
        }).status(400);
    }
});

app.post("/user/:borrower/payLoan", authenticateToken, async (req, res) => {
    const { borrower } = req.params;
    let amount = await User.findOne({address: borrower})
    if (amount.loanAmount === "") return res.json({
        status: false,
        fullMessage: `No Loan Record Found`
    }).status(400);
    let final_amount = amount.loanAmount/2 + ((amount.loanAmount*10)/(2*100))
    try {
        let result = await dbc.doLoanRepayment(borrower, final_amount);
        if (result.status == false) {
            res.status(400).json({
                status: false,
                fullMessage: `Wait for the next due installement`
            })
        } else {
            res.json({
                status:true,
                fullMessage: `Successfully Paid Loan Installment`
            }).status(200);
        }
    } catch (error) {
        res.json({
            status:false,
            fullMessage: `Failed to Pay Loan Installment`
        }).status(400);
    }
});

app.get("/getUsers", authenticateToken, async (req, res) => {
    try{
        let users = await User.find({}, {address: 1, privilege: 1});
        if (Object.keys(users).length === 0) {
            return res.json({
                status: false,
                fullMessage: `Users not found`
            }).status(400);
        }
        res.json(users).status(200);
    } catch (err){
        console.log(err)
        return res.json({
            status: false,
            fullMessage: `Error getting user information`
        }).status(500);
    }
});

app.listen(3000, () => {
    console.log("Your server is running on port 3000...");
})