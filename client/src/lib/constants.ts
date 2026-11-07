export const EGYPT_GOVERNORATES = [
  'القاهرة',
  'الجيزة',
  'القليوبية',
  'الإسكندرية',
  'الدقهلية',
  'الشرقية',
  'المنوفية',
  'البحيرة',
  'الغربية',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'بني سويف',
  'الفيوم',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'البحر الأحمر',
  'الوادي الجديد',
  'مطروح',
] as const;

export const SORT_OPTIONS = [
  { value: 'featured', label: 'الأكثر تميزاً' },
  { value: 'rating', label: 'الأعلى تقييماً' },
  { value: 'response', label: 'الأسرع رداً' },
  { value: 'newest', label: 'الأحدث انضماماً' },
] as const;

export type FreelancerSort =
  | 'featured'
  | 'rating'
  | 'newest'
  | 'response';
