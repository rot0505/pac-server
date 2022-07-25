import express from 'express'

const router = express.Router()
const authRoutes = require('./routes/auth');
const furnitureRoutes = require('./routes/furniture');
const itemRoutes = require('./routes/item');
const equipmentRoutes = require('./routes/equipment');

router.get('/health-check', (req, res) =>
  res.send('OK')
)

router.use('/auth', authRoutes);
router.use('/furniture', furnitureRoutes);
router.use('/item', itemRoutes);
router.use('/equipment', equipmentRoutes);

module.exports = router;