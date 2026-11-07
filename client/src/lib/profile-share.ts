export const getProfileUrl = (freelancerId: string): string => {
  return `${window.location.origin}/freelancers/${freelancerId}`;
};
