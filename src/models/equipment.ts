import mongoose from 'mongoose'

const EquipmentSchema = new mongoose.Schema({
    account: {
        type: String,
        required: true,
    },
    userName:{
        type:String,
        required: true,
    },
    headColor: {
        type: Number,
        required: true,
    },
    headMat: {
        type: Number,
        required: true,
    },
    hairColor: {
        type: Number,
        required: true,
    },
    hairMat: {
        type: Number,
        required: true,
    },
    clothColor: {
        type: Number,
        required: true,
    },
    clothMat: {
        type: Number,
        required: true,
    },
    shoeColor: {
        type: Number,
        required: true,
    },
    shoeMat: {
        type: Number,
        required: true,
    },
    glassColor: {
        type: Number,
        required: true,
    },
    glassMat: {
        type: Number,
        required: true,
    },
    maskColor: {
        type: Number,
        required: true,
    },
    maskMat: {
        type: Number,
        required: true,
    },
})

module.exports = mongoose?.model('Equipment', EquipmentSchema);