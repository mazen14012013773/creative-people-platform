import type { Request, Response } from 'express';
import {
  addReview,
  getFreelancerDetail,
  listFeaturedProfiles,
  listFreelancers,
  submitReport,
} from '../services/freelancer.service';
import type {
  CreateReportInput,
  CreateReviewInput,
  FeaturedFreelancersQueryInput,
  FreelancerQueryInput,
} from '../validators/freelancer.validator';

export const list = async (req: Request, res: Response): Promise<void> => {
  const result = await listFreelancers(req.query as unknown as FreelancerQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const featured = async (req: Request, res: Response): Promise<void> => {
  const query = req.query as unknown as FeaturedFreelancersQueryInput;
  const result = await listFeaturedProfiles(query.limit);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const detail = async (req: Request, res: Response): Promise<void> => {
  const result = await getFreelancerDetail(String(req.params.id));

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const createReviewHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const review = await addReview(
    String(req.params.id),
    req.body as CreateReviewInput,
    req.user!.id,
  );

  res.status(201).json({
    success: true,
    message: 'تم إضافة تقييمك بنجاح، شكراً لك',
    data: { review },
  });
};

export const favorite = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { saved: true } });
};

export const createReportHandler = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const report = await submitReport(
    String(req.params.id),
    req.body as CreateReportInput,
  );

  res.status(201).json({
    success: true,
    message: 'تم إرسال البلاغ للإدارة، شكراً لمساعدتك',
    data: { report },
  });
};
