const Item = require('../models/item')

const findItemByAccount = async (account: string) => {
    const item = await Item.findOne({ account: account })
    return item
}

const addItem = async (item: any) => {
    const itemData = {
        ...item,
    }
    const newItem = new Item(itemData)
    const itemRes = await newItem.save()
    return itemRes
}

const updateItem = async (item: any) => {

    await Item.findOneAndUpdate({ account: item.account }, item)
    const res = await Item.findOne({ account: item.account })
    return res
}

module.exports = {
    findItemByAccount,
    addItem,
    updateItem,
}