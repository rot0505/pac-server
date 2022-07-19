import express from 'express'

const {
    authenticate,
    authError
} = require('../middlewares/auth')

const router = express.Router()

const itemCtrl = require('../controllers/item')

router.post('/saveItem', itemCtrl.saveItem)

router.post('/loadItem', itemCtrl.loadItem)

module.exports = router