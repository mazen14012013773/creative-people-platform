import { Router } from 'express';
import { getSkills } from '../controllers/skills.controller';
import { asyncHandler } from '../utils/async-handler';

export const skillsRouter = Router();

skillsRouter.get('/', asyncHandler(getSkills));
