import express from 'express';
import * as deviceController from '../controllers/deviceController.js';
import { verifyAuth } from '../middlewares/jwtAuth.js';

const router = express.Router();

router.use(verifyAuth);

router.get('/', deviceController.getAllDevices);
router.post('/', deviceController.createDevice);
router.put('/:id', deviceController.updateDevice);
router.delete('/:id', deviceController.deleteDevice);
router.post('/:id/test', deviceController.testConnection);

export default router;
