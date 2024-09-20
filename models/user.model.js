const mongoose = require('mongoose')

const user = new mongoose.Schema(
  {
    firstname: { type: String },
    lastname: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    funded: { type: Number },
    investment: { type:[Object] },
    transaction: { type:[Object], default: [] },
    withdraw: { type:[Object] },
    deposit:{ type:[Object], default:[] },
    rememberme:{type:Boolean},
    verified:{type:Boolean, default:false},
    referral:{type:String,unique:true},
    refBonus:{type:Number},
    referred:{type:[Object],default:[]},
    phonenumber:{type:String,default:''},
    state:{type: String,default:''},
    country:{type: String,default:''},
    zipcode:{type: String,default:''},
    address:{type: String,default:''},
    profilepicture:{type:String,default:'https://res.cloudinary.com/dohhwcaam/image/upload/v1716207772/5907_iwwhqp.jpg'},
    totalprofit:{type:Number,default:0},
    periodicProfit:{type:Number,default:0},
    totaldeposit:{type:Number,default:0},
    totalwithdraw:{type:Number,default:0},
    promo:{type:Boolean,default:false},
    role: {type: String, default: 'user', enum: ['user', 'admin']},
    capital: {type: Number, default: 0},
    walletAddress: {type: String},
    walletType: {type: String },
    loanAmt: {type: Number, default: 0},
    loanStatus: {type: String, default: "" },
    loanDesc: {type: String},
  }
)
const User = mongoose.models.User || mongoose.model('User', user)
module.exports = User