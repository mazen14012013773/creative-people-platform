import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from '../utils/app-error';

interface HttpSyntaxError extends Error {
  status: number;
  type: string;
}

const isHttpSyntaxError = (error: unknown): error is HttpSyntaxError => {
  return (
    error instanceof Error &&
    'status' in error &&
    typeof (error as HttpSyntaxError).status === 'number' &&
    (error as HttpSyntaxError).type === 'entity.parse.failed'
  );
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `المسار غير موجود: ${req.method} ${req.originalUrl}`,
  });
};

export const errorHandler = (
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (error instanceof ZodError) {
    res.status(422).json({
      success: false,
      message: 'البيانات المدخلة غير صالحة',
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.details !== undefined ? { errors: error.details } : {}),
    });
    return;
  }

  if (error instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'حجم أحد الملفات يتجاوز الحد المسموح لهذا النوع من الرفع.'
          : 'تعذر قراءة الملف المرفوع. اختر ملفات مسموحًا بها وحاول مرة أخرى.',
    });
    return;
  }

  if (isHttpSyntaxError(error)) {
    res.status(400).json({
      success: false,
      message: 'صيغة JSON في الطلب غير صحيحة',
    });
    return;
  }

  console.error('Unhandled error:', error);

  res.status(500).json({
    success: false,
    message: 'حدث خطأ غير متوقع، يرجى المحاولة لاحقاً',
    ...(env.NODE_ENV === 'development' && error instanceof Error
      ? { stack: error.stack }
      : {}),
  });
};
