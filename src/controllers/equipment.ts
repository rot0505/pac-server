const equipmentService = require('../services/equipment')

const saveEquipment = async (req, res, next) => {
    const {
        account
    } = req.body
    console.log(req.body);
    const equipment = await equipmentService.findEquipmentByAccount(account)
    if (!equipment) {
        //must add validate signMsg
        const result = await equipmentService.addEquipment(req.body)
        return res.json(result)
    } else {
        const equipment = {
            ...req.body
        }
        const result = await equipmentService.updateEquipment(equipment)
        return res.json(result)
    }
}

const loadEquipment = async (req, res, next) => {
    const {
        account
    } = req.body

    const result = await equipmentService.findEquipmentByAccount(account)
    return res.json(result)
}


module.exports = {
    saveEquipment,
    loadEquipment
}