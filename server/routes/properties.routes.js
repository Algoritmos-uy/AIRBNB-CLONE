// Routes for properties
import { Router } from 'express';
import { getAllProperties, getPropertyById } from '../controllers/properties.controller.js';

const router = Router();

router.get('/', getAllProperties);
router.get('/:id', getPropertyById);

export default router;