const mongoose = require("mongoose");
const {v4: uuidv4}=require('uuid')

const UserSchema = new mongoose.Schema({
    userID:{
        type:String,
        unique:true,
        default:uuidv4,
    },
    name:String,
    email:String,
    password:String
})

const UserModel = mongoose.model("users", UserSchema);

module.exports = UserModel;