import { Router } from 'express';
import { getBookInfo } from '../controllers/bookController.js';

const router = Router();

router.get('/info', getBookInfo);

export default router;
