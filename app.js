const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')
const User = require('./models/user.model')
const Loan = require('./models/loan')
const Admin = require('./models/admin')
const jwt = require('jsonwebtoken')
const path = require('path')
var serveStatic = require('serve-static')
const Token = require('./models/token')
const crypto = require('crypto')
const P2p = require('./models/p2p')
dotenv.config()

const app = express()

app.use(cors())

app.use(serveStatic(path.join(process.cwd(), '/dist')))
app.get(
  [
    '/',
    '/dashboard',
    '/myprofile',
    '/login',
    '/signup',
    '/withdraw',
    '/plans',
    '/referrals',
    '/admin',
    '/fundwallet',
    '/transactions',
    '/investments',
    '/deposit',
    '/checkout',
    '/withdrawlogs',
    '/faq',
    '/about',
    '/policy',
    '/buybitcoin',
    '/users/:id/verify/:token',
    '/admin',
    '/ref_register/:ref',
    '/resetpassword/:token'
  ],
  (req, res) => res.sendFile(path.join(process.cwd(), '/dist/index.html'))
)
app.use('/static', express.static('dist/static'))

app.set('view engine', 'pug');
app.set('views', path.join(__dirname, 'views'));

const port = process.env.PORT || 5000

app.use(express.json())

mongoose.set('strictQuery', false)
mongoose.connect(process.env.ATLAS_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((error) => {
    console.error('Error connecting to MongoDB', error);
  });
// mongoose.connect(process.env.ATLAS_URI, console.log('database is connected'))

app.get('/api/verify', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.rememberme === true) {
      res.json({
        status: 'ok',
      })
    }
    else {
      res.json({
        status: 'false',
      })
    }
  } catch (error) {
    res.json({ status: `error ${error}` })
  }
})

const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  })
};

const success = (statusCode, res, user, message) => {
  const token = createToken(user.id);
  const url = `${process.env.BASE_URL}auth/${user._id}/verify/${token}`;

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + 30 * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    // secure: req.secure || req.headers['x-access-token'] === 'http'
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    role: user.role,
    message,
    url,
    user
  });
}



app.post('/api/register', async (req, res) => {
  const email = req.body.email;
  const password = req.body.password;
  const firstname = req.body.firstname;
  const lastname = req.body.lastname;
  const refer = req.body.refer;
  const referralLink = crypto.randomBytes(8).toString("hex")
  const base = process.env.BASE_URL
  const country = req.body.country

  try {
    const user = await User.findOne({ email: email })

    if (user) {
      console.log('user already exists')
      return res.json({
        status: 'bad',
        message: 'Invalid email or user already exists'
      })
    }
    else if (refer !== '') {
      const referringUser = await User.findOne({ referral: refer })
      const now = new Date()
      if (referringUser) {
        await User.updateOne({ referral: refer }, {
          $push: {
            referred: {
              // firstname:req.body.firstName,
              // lastname: req.body.lastName,
              email: req.body.email,
              date: now.toLocaleString(),
              bonus: 20
            }
          }

        })
        await User.updateOne({ referral: refer }, {
          $set: { refBonus: referringUser.refBonus + 100 }
        })
      }
      else {
        return res.json({
          status: "bad",
          message: "Sorry this user does not exist"
        })
      }
    }

    const newUser = await User.create({
      firstname: firstname,
      lastname: lastname,
      email: email,
      password: password,
      country: country,
      funded: 0,
      investment: [],
      transaction: [],
      withdraw: [],
      rememberme: false,
      referral: `${referralLink}`,
      refBonus: 0,
      referred: [],
      periodicProfit: 0,
      role: 'user',
      // verified: true
    })

    const token = createToken(newUser.id);
    const url = `${process.env.BASE_URL}users/${newUser._id}/verify/${token}`

    return res.json({
      status: 'ok',
      newUser,
      url
    })

  } catch (error) {
    console.log(error)
    res.send(error)
  }
})

app.get('/:id/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id })
    if (!user) {
      return res.json({ status: 400 })
    }
    else {
      await User.updateOne({ _id: user._id }, {
        $set: { verified: true }
      })
      res.json({ status: 200 })
    }
    // const token = await Token.findOne({userId:user._id,token:req.params.token})

    // if(!token){
    //   return res.json({status:400})
    // }
    // await User.updateOne({_id:user._id},{
    //   $set:{verified:true}
    // })
    // await token.remove()
    // res.json({status:200})
  } catch (error) {
    console.log(error)
    res.json({ status: `internal server error ${error}` })
  }
})

app.get('/api/getData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    res.json({
      status: 'ok',
      firstname: user.firstname,
      lastname: user.lastname,
      email: user.email,
      funded: user.funded,
      invest: user.investment,
      transaction: user.transaction,
      withdraw: user.withdraw,
      refBonus: user.refBonus,
      referred: user.referred,
      referral: user.referral,
      phonenumber: user.phonenumber,
      state: user.state,
      zipcode: user.zipcode,
      address: user.address,
      profilepicture: user.profilepicture,
      country: user.country,
      totalprofit: user.totalprofit,
      totaldeposit: user.totaldeposit,
      totalwithdraw: user.totalwithdraw,
      deposit: user.deposit,
      promo: user.promo,
      periodicProfit: user.periodicProfit,
      role: user.role,
      loanAmt: user.loanAmt,
      loanStatus: user.loanStatus
    })
  } catch (error) {
    res.json({ status: 'error', message: error.message })
  }
})

app.get('/api/getp2pdata', async (req, res) => {
  const data = await P2p.findOne({ _id: '66542351827fedb29a501401' })
  return res.json({ status: 'ok', data })
})

app.patch('/api/updateUserPassword', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user.password !== req.body.currentPass) {
      return res.json({ status: 400, message: "invaild password" })
    }
    else {
        await User.updateOne({
          email: user.email
        }, {
          $set: { 
            password: req.body.password
          }
        })
      console.log({
        msg: "hello dear i want to validate this data",
        image: user.password
      })
      return res.json({ status: 200, message: "password reset successful" })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500, message: "Something went wrong, please try again later" })
  }
})

app.post('/api/updateUserData', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user && req.body.profilepicture !== undefined) {
      if (user.phonenumber !== req.body.phonenumber || user.state !== req.body.state || user.profilepicture !== req.body.profilepicture) {
        await User.updateOne({
          email: user.email
        }, {
          $set: {
            phonenumber: req.body.phonenumber,
            profilepicture: req.body.profilepicture,
            state: req.body.state,
            zipcode: req.body.zipcode,
            country: req.body.country,
            address: req.body.address,
            firstname: req.body.firstname,
            lastname: req.body.lastname
          }
        })
      }
      return res.json({ status: 200 })
    }
    else {
      console.log({
        msg: "hello dear i want to validate this",
        image: user.profilepicture
      })
      return res.json({ stauts: 400, profile: user.profilepicture })
    }
  } catch (error) {
    console.log(error)
    return res.json({ status: 500 })
  }
})


app.post('/api/fundwallet', async (req, res) => {
  try {
    const email = req.body.email
    const incomingAmount = req.body.amount
    const user = await User.findOne({ email: email })
    await User.updateOne(
      { email: email }, {
      $set: {
        funded: incomingAmount + user.funded,
        capital: user.capital + incomingAmount,
        totaldeposit: user.totaldeposit + incomingAmount
      }
    }
    )
    await User.updateOne(
      { email: email },
      {
        $push: {
          deposit: {
            date: new Date().toLocaleString(),
            amount: incomingAmount,
            id: crypto.randomBytes(32).toString("hex"),
            balance: incomingAmount + user.funded
          }
        }, transaction: {
          type: 'Deposit',
          amount: incomingAmount,
          date: new Date().toLocaleString(),
          balance: incomingAmount + user.funded,
          id: crypto.randomBytes(32).toString("hex"),
        }
      }
    )
    res.json({ status: 'ok', funded: req.body.amount, name: user.firstname, email: user.email })
  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})

app.post('/api/admin', async (req, res) => {
  const admin = await Admin.findOne({ email: req.body.email })
  if (admin) {
    return res.json({ status: 200 })
  }
  else {
    return res.json({ status: 400 })
  }
})


app.post('/api/deleteUser', async (req, res) => {
  try {
    await User.deleteOne({ email: req.body.email })
    return res.json({ status: 200 })
  } catch (error) {
    return res.json({ status: 500, msg: `${error}` })
  }
})

app.post('/api/withdraw', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })
    if (user.totalprofit >= req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount, totalwithdraw: user.totalwithdraw + req.body.WithdrawAmount, capital: user.capital - req.body.WithdrawAmount } }
      )
      await User.updateOne(
        { email: email },
        {
          $push: {
            withdraw: {
              date: new Date().toLocaleString(),
              amount: req.body.WithdrawAmount,
              id: crypto.randomBytes(32).toString("hex"),
              balance: user.funded - req.body.WithdrawAmount
            }
          }
        }
      )
      const now = new Date()
      await User.updateOne(
        { email: email },
        {
          $push: {
            transaction: {
              type: 'withdraw',
              amount: req.body.WithdrawAmount,
              date: now.toLocaleString(),
              balance: user.funded - req.body.WithdrawAmount,
              id: crypto.randomBytes(32).toString("hex"),
            }
          }
        }
      )

      res.json({ status: 'ok', withdraw: req.body.WithdrawAmount, name: user.firstname, email: user.email })
    }
    else if (new Date().getTime() - user.withdrawDuration >= 1728000000 && user.withdrawDuration !== 0 && user.capital < req.body.WithdrawAmount) {
      await User.updateOne(
        { email: email },
        { $set: { funded: user.funded - req.body.WithdrawAmount, totalwithdraw: user.totalwithdraw + req.body.WithdrawAmount, capital: user.capital - req.body.WithdrawAmount } }
      )
      await User.updateOne(
        { email: email },
        {
          $push: {
            withdraw: {
              date: new Date().toLocaleString(),
              amount: req.body.WithdrawAmount,
              id: crypto.randomBytes(32).toString("hex"),
              balance: user.funded - req.body.WithdrawAmount
            }
          }
        }
      )
      const now = new Date()
      await User.updateOne(
        { email: email },
        {
          $push: {
            transaction: {
              type: 'withdraw',
              amount: req.body.WithdrawAmount,
              date: now.toLocaleString(),
              balance: user.funded - req.body.WithdrawAmount,
              id: crypto.randomBytes(32).toString("hex"),
            }
          }
        }
      )
      res.json({ status: 'ok', withdraw: req.body.WithdrawAmount })
    }
    else {
      res.json({ status: 400, message: 'insufficient Amount! You cannot withdraw from your capital yet. you can only withdraw your profit after the first 10 days of investment, Thanks.' })
    }
  }
  catch (error) {
    console.log(error)
    res.json({ status: 'error', message: 'internal server error' })
  }
})

app.post('/api/sendproof', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    if (user) {
      return res.json({ status: 200, name: user.firstname, email: user.email })
    }
    else {
      return res.json({ status: 500 })
    }
  } catch (error) {
    res.json({ status: 404 })
  }
})


app.post('/api/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,
  })
  if (user) {
    if (user.password !== req.body.password) {
      return res.json({ status: 404, })
    }
    else if (user.verified) {
      const token = jwt.sign(
        {
          email: user.email,
          password: user.password
        },
        'secret1258'
      )
      await User.updateOne({ email: user.email }, { $set: { rememberme: req.body.rememberme } })
      return res.json({ status: 'ok', user: token, role: user.role })
    }
    else {
      return res.json({ status: 400 })
    }
  }

  else {
    return res.json({ status: 'error', user: false })
  }
})

// app.post('/api/v2/myadmin', async(req, res) => {
//   const reso = await Admin.create({
//     email: 'kultureassetsworldwide@gmail',
//     password: 'pass1234'
//   })
//   res.send(reso)
//   console.log('admin is active lefronce')
// })

app.patch('/api/p2pdetails', async (req, res) => {
  const hey = await P2p.updateOne(
    { _id: '66542351827fedb29a501401' },
    {
      $set: {
        price: req.body.price,
        accountNo: req.body.accountNo,
        accountName: req.body.accountName,
        bankName: req.body.bankName
      }
    })
  // 66542351827fedb29a501401
  console.log(hey)
  return res.send(hey)
})

app.post('/api/loan', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const loanAmt = req.body.loanAmount;
    const bal = loanAmt + user.loanAmt;

    console.log({
      loanAmt: req.body.loanAmount,
      loanDesc: req.body.description
    })

    if (user.loanStatus === 'pending') {
      return res.json({
        status: 'bad',
        message: "sorry your preivous loan is still been processed, Please try again later"
      })
    }
    else if (user.capital < 1000) {
      return res.json({
        status: 'bad',
        message: 'You are not eligible for this loan, Please fund your account to continue.'
      })
    }
    else {
      const applyLoan = await User.updateOne(
        { email: email },
        {
          $set: {
            loanAmt: bal,
            loanDesc: req.body.description,
            loanStatus: 'pending',
          },
          $push: {
            transaction: {
              type: 'Loan',
              amount: loanAmt,
              date: new Date().toLocaleString(),
              balance: loanAmt + user.funded,
              id: crypto.randomBytes(10).toString("hex"),
            }
          }
        }
      );
      // await Loan.create({
      //   loanAmount: req.body.loanAmount,
      //   loanDesc: req.body.description,
      //   loanBalance: +req.body.loanAmount,
      //   user: user.id
      // })
      if (applyLoan) {
        return res.json({
          status: 'ok',
          message: "Your have successfully applied for this loan",
          name: user.firstname,
          email: user.email
        })
      }
      else {
        return res.json({
          status: 'bad',
          message: "Sorry an error occured, please try again later"
        })
      }
    }
  } catch (error) {
    res.json({ status: 404 })
    console.log(error)
  }
})

app.post('/api/p2ptran', async (req, res) => {
  const token = req.headers['x-access-token']
  try {
    const decode = jwt.verify(token, 'secret1258')
    const email = decode.email
    const user = await User.findOne({ email: email })

    const convertedAmt = req.body.convertTo;

    console.log({
      loanDesc: req.body.convertTo
    })

    await User.updateOne(
      { email: email }, {
      $set: {
        // funded: convertedAmt + user.funded,
        // capital :user.capital + convertedAmt,
        totaldeposit: user.totaldeposit + convertedAmt
      },
    })

    await User.updateOne(
      { email: email },
      {
        $push: {
          deposit: { 
            date: new Date().toLocaleString(),
            amount: convertedAmt,
            id: crypto.randomBytes(8).toString("hex"),
            balance: convertedAmt + user.funded
          }
        }, transaction: {
          type: 'P2p Deposit',
          amount: convertedAmt,
          date: new Date().toLocaleString(),
          balance: convertedAmt + user.funded,
          id: crypto.randomBytes(8).toString("hex"),
        }
      }
    )
    res.json({ status: 'ok', funded: req.body.convertedAmt, name: user.name, email: user.email })

  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }

})

// omo i am towork on this shitty thing again ooh God


app.patch('/api/userloan', async (req, res) => {
  // hello this is usersloan
  try {

    const email = req.body.email;
    const user = await User.findOne({ email: email })

    console.log({
      loanemail: email,
      loanDesc: "yh sure to send an email to the admin"
    })

    if(user.loanStatus === 'pending') {
    const first = await User.updateOne(
      { email: email },{
      $set : {
        loanStatus: "approved",
        funded: user.loanAmt + user.funded,
        capital: user.capital + user.loanAmt
      }
    }
    )
    if(first) {
      console.log("done the first part of the job")
      await User.updateOne(
        { email: email },{
        $set : {
          loanAmt: 0
        }
      }
      )
    }
    
    res.json({ status: 'ok', message: "Your loan has been approved"})
    }
    else {
      res.json({
        status: 400,
        message: "No pending loan application"
      })
    }
  } catch (error) {
    console.log(error)
    res.json({ status: 'error' })
  }
})


app.get('/api/getUsers', async (req, res) => {
  // const users = await User.find()
  const users = await User.find({ role: "user" });
  res.json(users)
})


app.get('/api/getuserstat', async (req, res) => {
  // hello i am right here
  const users = await User.find({ role: "user" });
  const verified = await User.find({ role: "user", verified: "true" });
  const unverified = await User.find({ role: "user", verified: "false" });


  return res.json({ users: users.length, verify: verified.length, unverified: unverified.length })
})

// hey will be working on this next

// app.post('/api/invest', async (req, res) => {
//   const token = req.headers['x-access-token'];
//   try {
//     const decode = jwt.verify(token, 'secret1258');
//     const email = decode.email;
//     const user = await User.findOne({ email: email });

//     const calculateDurationInMilliseconds = (durationInDays) => {
//       const millisecondsInADay = 24 * 60 * 60 * 1000;
//       return durationInDays * millisecondsInADay;
//     };

//     const calculateProfit = (amount, percent) => {
//       return (amount * percent) / 100;
//     };

//     const durations = {
//       'daily': 5,
//       // 'daily': 1,
//       // '48h': 2,
//       // '72h': 3,
//       '5d': 5,
//       // '15d': 15,
//       // '30d': 30,
//     };

//     const duration = req.body.duration;
//     const percent = req.body.percent;
//     console.log({ duration, percent })
//     // !durations.hasOwnProperty(duration) ||
//     if (!percent) {
//       return res.status(400).json({
//         message: 'Invalid duration or percentage provided.',
//       });
//     }

//     const durationInDays = durations[duration];
//     const durationInMilliseconds = calculateDurationInMilliseconds(durationInDays);
//     const profitPercent = parseFloat(percent.replace('%', ''));
//     const profit = calculateProfit(req.body.amount, profitPercent);

//     if (user.capital >= req.body.amount) {
//       const now = new Date();
//       const endDate = new Date(now.getTime() + durationInMilliseconds);
//       await User.updateOne(
//         { email: email },
//         {
//           $push: {
//             investment: {
//               type: 'investment',
//               amount: req.body.amount,
//               plan: req.body.plan,
//               percent: req.body.percent,
//               startDate: now.toLocaleString(),
//               endDate: endDate.toLocaleString(),
//               profit: profit,
//               ended: endDate.getTime(),
//               started: now.getTime(),
//               periodicProfit: 0,
//             },
//             transaction: {
//               type: 'investment',
//               amount: req.body.amount,
//               date: now.toLocaleString(),
//               balance: user.funded,
//               id: crypto.randomBytes(8).toString('hex'),
//             },
//           },
//         }
//       );
//       await User.updateOne(
//         { email: email },
//         {
//           $set: {
//             capital: user.capital - req.body.amount,
//             totalprofit: user.totalprofit + profit,
//             withdrawDuration: now.getTime(),
//           },
//         }
//       );
//       return res.json({
//         status: 'ok',
//         amount: req.body.amount,
//         name: user.firstname,
//         email: user.email,
//         periodicProfit: user.periodicProfit,
//       });
//     } else {
//       return res.status(400).json({
//         message: 'You do not have sufficient funds in your account.',
//       });
//     }
//   } catch (error) {
//     return res.status(500).json({ status: 500, error: error });
//   }
// });


// const changeInvestment = async (user, now) => {
//   const updatedInvestments = user.investment.map(async (invest) => {
//     if (isNaN(invest.started)) {
//       return invest;
//     }
//     if (user.investment == []) {
//       return
//     }
//     if (now - invest.started >= invest.ended) {
//       return invest;
//     }
//     if (isNaN(invest.profit)) {
//       return
//     }
//     if (isNaN(invest.profit)) {
//       return invest;
//     }

//     if (invest.profit <= 14) {
//       console.log(user.funded)
//       await User.updateOne(
//         { email: user.email },
//         {
//           $set: {
//             funded: user.funded + Math.round(2 / 100 * invest.profit),
//             periodicProfit: user.periodicProfit + Math.round(2 / 100 * invest.profit),
//             capital: user.capital + Math.round(2 / 100 * invest.profit),
//           }
//         }
//       )
//     }

//     // if(invest.profit > 14 && invest.profit <= 40){
//     //     console.log(user.funded)
//     //     await User.updateOne(
//     //       { email: user.email },
//     //       {
//     //         $set:{
//     //           funded:user.funded + Math.round(2.5/100 * invest.profit),
//     //           periodicProfit:user.periodicProfit + Math.round(2.5/100 * invest.profit),
//     //           capital:user.capital + Math.round(2.5/100 * invest.profit),
//     //         }
//     //       }
//     //     )
//     //   }
//     //   else{
//     //     await User.updateOne(
//     //       { email: user.email },
//     //       {
//     //         $set:{
//     //           funded:user.funded + Math.round(4/100 * invest.profit),
//     //           periodicProfit:user.periodicProfit + Math.round(4/100 * invest.profit),
//     //           capital:user.capital + Math.round(4/100 * invest.profit),
//     //         }
//     //       }
//     //     )
//     //   }

//     const profit = Math.round(2 / 100 * invest.profit);
//     await User.updateOne(
//       { email: user.email, 'investment._id': invest._id },
//       {
//         $set: {
//           funded: user.funded + profit,
//           periodicProfit: user.periodicProfit + profit,
//           capital: user.capital + profit,
//           'investment.$.profit': profit,
//         },
//       }
//     );
//     return {
//       ...invest,
//       profit: profit,
//     };
//   });
//   return Promise.all(updatedInvestments);
// };


app.post('/api/invest', async (req, res) => {
  const token = req.headers['x-access-token'];
  try {
    const decode = jwt.verify(token, 'secret1258');
    const email = decode.email;
    const user = await User.findOne({ email: email });
    // const HOURS_IN_A_DAY = 24;


    const durations = {
      '24h': 1,
      '48h': 2,
      '72h': 3,
      '10d': 10,
      '15d': 15,
      '30d': 30,
    };

    const duration = req.body.duration;
    const percent = req.body.percent;

    // !durations.hasOwnProperty(duration) |

    if (!percent) {
      return res.status(400).json({
        message: 'Invalid duration or percentage provided.',
      });
    }


    
    const calculateDurationInMilliseconds = (durationInDays) => {
      const millisecondsInADay = 24 * 60 * 60 * 1000;
      return durationInDays * millisecondsInADay;
    };
    const durationInDays = 10;
    const durationInMilliseconds = calculateDurationInMilliseconds(durationInDays);

    const calculateProfit = (amount, percent) => {
      // const Fv = (amount) * (1 + percent/100)**durationInDays 
      // const Pv = Fv - amount
      // console.log({Pv, amount, percent, Fv,durationInDays})
      // return Pv;
      // return (amount * 1 + percent) / 100;
      
      const Fv = (amount) * (percent);
      console.log({amount, percent, Fv,durationInDays})
      return Fv;
    };
const profitPercent = parseFloat(percent.replace('%', ''));

    const profit = calculateProfit(req.body.amount, profitPercent);
    console.log({profit, profitPercent,durationInMilliseconds})

    if (user.capital >= req.body.amount) {
      const now = new Date();
      const endDate = new Date(now.getTime() + durationInMilliseconds);
      await User.updateOne(
        { email: email },
        {
          $push: {
            investment: {
              type: 'investment',
              amount: req.body.amount,
              plan: req.body.plan,
              percent: req.body.percent,
              startDate: now.toLocaleString(),
              endDate: endDate.toLocaleString(),
              profit: profit,
              ended: endDate.getTime(),
              started: now.getTime(),
              periodicProfit: 0,
            },
            transaction: {
              type: 'investment',
              amount: req.body.amount,
              date: now.toLocaleString(),
              balance: user.funded,
              id: crypto.randomBytes(10).toString('hex'),
            },
          },
        }
      );
      await User.updateOne(
        { email: email },
        {
          $set: {
            capital: user.capital - req.body.amount,
            totalprofit: user.totalprofit + profit,
            withdrawDuration: now.getTime(),
          },
        }
      );
      return res.json({
        status: 'ok',
        amount: req.body.amount,
        name: user.firstname,
        email: user.email,
        periodicProfit: user.periodicProfit,
      });
    } else {
      return res.status(400).json({
        message: 'You do not have sufficient funds in your account.',
      });
    }
  } catch (error) {
    console.log(error)
    return res.status(500).json({ status: 500, error: error });
  }
});

app.get('/api/cron', async (req, res) => {
  const now = new Date();

  try {
    mongoose.connect(process.env.ATLAS_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const users = await User.find();
    const profitIncrement = (profit, periods) => profit / periods;
    const stopInvestment = now.getTime();
    console.log({stopInvestment, profitIncrement});

    let results = [];

    for (const user of users) {
      for (const investment of user.investment) {
        if (stopInvestment < investment.ended) { // Check if the duration of 5 days is completed
          const increment = profitIncrement(investment.profit, 10);
          console.log({
            endedDate: investment.ended,
            started: investment.started,
            increment,
            investment: investment.profit
          });

          const addProfit = await User.updateOne(
            { _id: user._id, 'investment.investmentId': investment.investmentId },
            { 
              $inc: { 
                'investment.$.periodicProfit': +increment, 
                'investment.$.amount': increment, 
                funded: increment 
              }
            }
          );

          if (addProfit) {
            results.push({status: 200, userId: user._id, investmentId: investment.investmentId, date: stopInvestment});
          } else {
            results.push({status: 400, userId: user._id, investmentId: investment.investmentId, date: stopInvestment, end: investment.ended});
          }
        } else if (stopInvestment >= investment.ended) {
          console.log("hello the investment has ended");
          results.push({
            status: 200,
            userId: user._id,
            investmentId: investment.investmentId,
            message: "hello the investment has ended"
          });
        } else {
          console.log("investment ended");
          results.push({
            status: 400,
            userId: user._id,
            investmentId: investment.investmentId,
            message: "investment ended"
          });
        }
      }
    }

    // Return results after processing all users and investments
    return res.json(results);
  } catch (error) {
    console.error('Error updating user balances:', error);
    return res.json({
      status: 500,
      error
    });
  }
});



// app.get('/api/cronjob', async (req, res) => {
//   const now = new Date();

//   try {
//     // mongoose.connect(process.env.ATLAS_URI)
//     mongoose.connect(process.env.ATLAS_URI, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     })
//     const users = (await User.find()) ?? []
//     // const users = await User.find();
//     const profitIncrement = (profit, periods) => profit / periods;
//     const stopInvestment = now.getTime();
//     console.log(stopInvestment)

//     for (const user of users) {
//       for (const investment of user.investment) {
//         if (stopInvestment < investment.ended) { // Check if the duration of 5 days is completed
//           const increment = profitIncrement(investment.profit, 5);
//           console.log({
//             endedDate: investment.ended,
//             started: investment.started,
//             increment,
//             investment: investment.profit
//           })

//         const addprofit =  await User.updateOne(
//             { _id: user._id, 'investment.investmentId': investment.investmentId },
//             { $inc: { 
//               'investment.$.periodicProfit': +increment, 
//               // 'investment.$.amount': increment, 
//               funded: +increment 
//             } }
//           );
//           if (addprofit) {
//             return res.json({status: 200, date: stopInvestment})
//           } else {
//             console.log("very bad stuff")
//             return res.json({status: 400, date: stopInvestment, end: investment.ended})
//           }
//         }
//         else if(stopInvestment >= investment.ended ) {
//           console.log("hello the investment has ended")
//           return res.json({
//             message: "hello the investment has ended"
//           })
//         }
//         else {
//           console.log("investment ended")
//           return res.json({
//             status: 400,
//             message: "investment ended"
//           })
//         }
//       }
//     }
//   } catch (error) {
//     console.error('Error updating user balances:', error);
//     return res.json({
//       status: 500,
//       error
//     })
//   }
// })




// working on the forgotten password
app.post('/api/forgottenpassword', async (req, res) => {
  
  try{
  const user = await User.findOne({ email: req.body.email });

  if (user) {
  console.log(user)
    console.log("hey there")

  // const resetToken = user.createPasswordResetToken();
  const resetToken =  crypto.randomBytes(32).toString('hex')
  const passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex')
  const passwordResetExpires = Date.now() + 15 * 60 * 1000;


  await user.save({ passwordResetToken, passwordResetExpires});

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/resetPassword/${resetToken}`;

  console.log({
    passwordResetExpires,
    passwordResetToken,
    resetToken,
    resetURL
  })

    res.status(200).json({
      status: 'success',
      message: 'Token sent to phone number',
      resetURL,
    });

  }

  else if (user.verified === false) {
    return res.json({
      status: 400,
      message: "Sorry this account is not verified, verify to contd"
    })
  }
  else {
    return res.json({
      status: 400,
      message: "Sorry this account does not exist"
    })
  }
  

  } 
  catch (err) {
    console.log(err)
    return res.json({
      status: 400,
      message: err
    });
  }

  })


  app.post("/api/resetpassword/:token", async (req, res) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: {$gt: Date.now() }
    });

    if (!user) {
      return res.json({
        status: 400, 
        message: "Token is invalid or has expired"
      })
    }

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.json({
      status: 200,
      message: "password changed"
    })

  })    


module.exports = app