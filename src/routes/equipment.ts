import express from 'express'

const {
    authenticate,
    authError
} = require('../middlewares/auth')

const router = express.Router()

const equipmentCtrl = require('../controllers/equipment')

router.post('/saveEquipment', equipmentCtrl.saveEquipment)

router.post('/loadEquipment', equipmentCtrl.loadEquipment)

module.exports = router