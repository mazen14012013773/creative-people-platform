import {
  createReport,
  findFreelancerForEvent,
  findPublicFreelancerById,
  getFreelancerStats,
  getPublicPortfolio,
  getPublicReviews,
  recordProfileEvent,
  searchFreelancers,
} from '../models/freelancer.model';
import { reviewOrder } from '../models/orders.model';
import { getSkillsForUser } from '../models/skill.model';
import type { FreelancerDetail, Pagination } from '../types/freelancer';
import { notifyAdministrators } from '../models/notification.model';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import type {
  CreateReportInput,
  CreateReviewInput,
  FreelancerQueryInput,
} from '../validators/freelancer.validator';
import { emitRealtimeEventToAll } from './realtime.service';

export const listFreelancers = async (
  input: FreelancerQueryInput,
): Promise<{ items: Awaited<ReturnType<typeof searchFreelancers>>['items']; pagination: Pagination }> => {
  const { items, total } = await searchFreelancers({
    q: input.q,
    skillId: input.skill,
    location: input.location,
    governorate: input.governorate,
    budget: input.budget,
    minBudget: input.minBudget,
    maxBudget: input.maxBudget,
    featured: input.featured,
    available: input.available,
    verified: input.verified,
    minRating: input.minRating,
    maxResponseHours: input.maxResponseHours,
    sort: input.sort ?? 'featured',
    page: input.page,
    limit: input.limit,
  });

  return {
    items,
    pagination: buildPagination(input.page, input.limit, total),
  };
};

/** Homepage bar: featured profiles that are still inside their paid window. */
export const listFeaturedProfiles = async (limit: number) => {
  const { items } = await searchFreelancers({ featured: true, page: 1, limit });

  return { items };
};

export const getFreelancerDetail = async (id: string): Promise<FreelancerDetail> => {
  const freelancer = await findPublicFreelancerById(id);

  if (!freelancer) {
    throw new AppError('المستقل غير موجود أو حسابه غير متاح', 404);
  }

  try {
    await recordProfileEvent(id);
    // Keep profile views in dashboard analytics; do not create noisy inbox alerts.
  } catch (error) {
    console.error('Failed to record profile view:', error);
  }

  const [skills, portfolio, reviews, stats] = await Promise.all([
    getSkillsForUser(id),
    getPublicPortfolio(id),
    getPublicReviews(id),
    getFreelancerStats(id),
  ]);

  return { freelancer, skills, portfolio, reviews, stats };
};

export const addReview = async (freelancerId: string, input: CreateReviewInput, buyerId: string) => {
  const order = await reviewOrder(input.orderId, buyerId, input.rating, input.comment, freelancerId);
  emitRealtimeEventToAll('profile');
  return order.review;
};

export const submitReport = async (
  freelancerId: string,
  input: CreateReportInput,
) => {
  const freelancer = await findFreelancerForEvent(freelancerId);

  if (!freelancer) {
    throw new AppError('المستقل غير موجود أو حسابه غير متاح', 404);
  }

  const report = await createReport(freelancerId, input);
  notifyAdministrators('بلاغ جديد على ملف مستقل', input.reason.slice(0, 180), '/admin');
  return report;
};

export const getOwnStats = async (userId: string) => {
  return getFreelancerStats(userId);
};
