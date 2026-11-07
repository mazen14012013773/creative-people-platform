import { createService, deleteService, findServiceById, listActiveServices, listServicesByFreelancer, serviceHasOrders, updateService } from '../models/services.model';
import type { ServiceDraft } from '../types/service';
import { AppError } from '../utils/app-error';
import { scanText } from '../utils/moderation';
import { emitRealtimeEventToAll } from './realtime.service';
import type { ServiceCreateInput, ServiceUpdateInput } from '../validators/service.validator';

const assertSafeText = (values: Array<string | undefined>): void => {
  if (values.some((value) => value && scanText(value).length > 0)) {
    throw new AppError('لا يُسمح بإضافة أرقام أو بريد أو روابط خارجية إلى الخدمة', 400);
  }
};

export const getServices = async (freelancerId?: string) => listActiveServices(freelancerId);
export const getMyServices = async (freelancerId: string) => listServicesByFreelancer(freelancerId);

export const addService = async (freelancerId: string, input: ServiceCreateInput) => {
  assertSafeText([input.title, input.description, input.category]);
  const service = await createService(freelancerId, input as ServiceDraft);
  emitRealtimeEventToAll('services');
  return service;
};

export const editService = async (id: string, freelancerId: string, patch: ServiceUpdateInput) => {
  const existing = await findServiceById(id);
  if (!existing || existing.freelancerId !== freelancerId) throw new AppError('الخدمة غير موجودة', 404);
  assertSafeText([patch.title, patch.description, patch.category]);
  const service = await updateService(id, freelancerId, patch);
  emitRealtimeEventToAll('services');
  return service;
};

export const removeService = async (id: string, freelancerId: string): Promise<void> => {
  const service = await findServiceById(id);
  if (service && service.freelancerId !== freelancerId) throw new AppError('الخدمة غير موجودة', 404);
  if (await serviceHasOrders(id)) throw new AppError('لا يمكن حذف خدمة لها سجل طلبات؛ عطّلها بدلاً من ذلك.', 409);
  if (!await deleteService(id, freelancerId)) throw new AppError('الخدمة غير موجودة', 404);
  emitRealtimeEventToAll('services');
};
