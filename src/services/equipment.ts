const Equipment = require('../models/equipment')

const findEquipmentByAccount = async (account: string) => {
    const equipment = await Equipment.findOne({ account: account })
    return equipment
}

const addEquipment = async (equipment: any) => {
    const equipmentData = {
        ...equipment,
    }
    const newEquipment = new Equipment(equipmentData)
    const equipmentRes = await newEquipment.save()
    return equipmentRes
}

const updateEquipment = async (equipment: any) => {

    await Equipment.findOneAndUpdate({ account: equipment.account }, equipment)
    const res = await Equipment.findOne({ account: equipment.account })
    return res
}

module.exports = {
    findEquipmentByAccount,
    addEquipment,
    updateEquipment,
}