const itemService = require('../services/item')

const saveItem = async (req, res, next) => {
    const {
       account
    } = req.body
    console.log(req.body);
    const fuerniture = await itemService.findItemByAccount(account)
    if (!fuerniture) {
        //must add validate signMsg
        const result = await itemService.addItem(req.body)
        return res.json(result)
    } else {
        const furniture = {
            ...req.body
        }
        const result = await furnitureService.updateItem(account)
        return res.json(result)
    }
}

const loadItem = async (req, res, next) => {
    const {
        account
    } = req.body

    const result = await itemService.findItemByAccount(account)
    return res.json(result)
}


module.exports = {
    saveItem,
    loadItem
}