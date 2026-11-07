export type ServiceStatus = 'active' | 'inactive';
export type ServiceMediaType = 'image' | 'video' | 'link';
export interface ServiceMedia { url: string; type: ServiceMediaType; }
export interface ServiceMediaInput { url?: string; type: ServiceMediaType; }
export interface ServiceSource { title: string; url: string; }

export interface Service {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  title: string;
  description: string;
  category: string;
  price: number;
  avgRating: number;
  reviewCount: number;
  media: ServiceMedia[];
  sources: ServiceSource[];
  status: ServiceStatus;
  isFeatured: boolean;
  featuredUntil: string | null;
  createdAt: string;
}

export interface ServiceDraft {
  title: string;
  description: string;
  category: string;
  price?: number;
  status?: ServiceStatus;
  media?: ServiceMediaInput[];
  sources?: ServiceSource[];
}
