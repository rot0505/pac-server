import mongoose from 'mongoose'

const ItemSchema = new mongoose.Schema({
    account: {
        type: String,
        required: true,
    },
    danceNo1:{
        type: Number,
        required: true,
    },
    danceNo2: {
        type: Number,
        required: true,
    },
    danceNo3: {
        type: Number,
        required: true,
    },
    gestureNo1: {
        type: Number,
        required: true,
    },
    gestureNo2: {
        type: Number,
        required: true,
    },
    gestureNo3: {
        type: Number,
        required: true,
    },
})

module.exports = mongoose?.model('Item', ItemSchema);