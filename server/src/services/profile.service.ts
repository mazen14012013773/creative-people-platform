import {
  getOwnProfile,
  updateFreelancerProfile,
} from '../models/freelancer.model';
import { AppError } from '../utils/app-error';
import { deleteLocalImage } from './upload.service';
import { moderateProfileWrite } from './system.service';
import { emitRealtimeEventToAll } from './realtime.service';
import type { UpdateProfileInput } from '../validators/freelancer.validator';

export const getProfile = async (userId: string) => {
  const profile = await getOwnProfile(userId);

  if (!profile.user) {
    throw new AppError('ملف المستقل غير موجود', 404);
  }

  return profile;
};

export const updateProfile = async (
  userId: string,
  input: UpdateProfileInput,
) => {
  const profile = await getOwnProfile(userId);

  if (!profile.user) {
    throw new AppError('ملف المستقل غير موجود', 404);
  }

  const { blockedMessage } = await moderateProfileWrite(userId, {
    name: input.name,
    title: input.title,
    bio: input.bio,
    location: input.location,
  });

  if (blockedMessage) {
    throw new AppError(blockedMessage, 422);
  }

  await updateFreelancerProfile(userId, input);
  emitRealtimeEventToAll('profile');

  const updatedProfile = await getOwnProfile(userId);

  if (
    input.avatarUrl !== undefined &&
    profile.user.avatarUrl &&
    profile.user.avatarUrl !== updatedProfile.user?.avatarUrl
  ) {
    try {
      await deleteLocalImage(profile.user.avatarUrl);
    } catch (error) {
      console.error('Failed to delete previous avatar:', error);
    }
  }

  return updatedProfile;
};

export const setAvatar = async (userId: string, avatarUrl: string) => {
  const profile = await getOwnProfile(userId);

  await updateFreelancerProfile(userId, { avatarUrl });
  emitRealtimeEventToAll('profile');

  if (profile.user?.avatarUrl && profile.user.avatarUrl !== avatarUrl) {
    try {
      await deleteLocalImage(profile.user.avatarUrl);
    } catch (error) {
      console.error('Failed to delete previous avatar:', error);
    }
  }

  return avatarUrl;
};
