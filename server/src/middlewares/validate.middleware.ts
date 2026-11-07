import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodTypeAny } from 'zod';
import { AppError } from '../utils/app-error';

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

const formatIssues = (error: ZodError) => {
  return error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));
};

export const validate = (schemas: RequestSchemas) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      if (schemas.query) {
        Object.assign(req.query, schemas.query.parse(req.query));
      }

      if (schemas.params) {
        Object.assign(req.params, schemas.params.parse(req.params));
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new AppError('البيانات المدخلة غير صالحة', 422, formatIssues(error)));
        return;
      }

      next(error);
    }
  };
};
