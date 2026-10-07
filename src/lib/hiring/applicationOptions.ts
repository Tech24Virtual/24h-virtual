// Mirrors the fields on the 24hvirtual.com receptionist application form.

export const APPLICATION_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'interview', label: 'Interview' },
  { value: 'offered', label: 'Offered' },
  { value: 'hired', label: 'Hired' },
  { value: 'rejected', label: 'Rejected' },
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number]['value'];

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800',
  reviewing: 'bg-amber-100 text-amber-800',
  interview: 'bg-purple-100 text-purple-800',
  offered: 'bg-indigo-100 text-indigo-800',
  hired: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export const APPLICATION_LANGUAGES = ['English', 'Spanish', 'French', 'Other'] as const;

export const APPLICATION_COMPANIES = ['24H Virtual', 'Vicky Virtual Receptionists'] as const;

export const HOURS_OPTIONS = ['30+ Hours', '20-29 Hours', 'Under 20 Hours'] as const;

export const SHIFT_OPTIONS = [
  '8:00 am - 4:30 pm',
  '12:00 pm - 9:00 pm',
  '3:30 pm - 12:00 am',
  '12:00 am - 8:00 am',
] as const;

export const EQUIPMENT_ITEMS = [
  { key: 'laptop_or_desktop', label: 'Have access to a laptop or desktop (cannot be chrome book)' },
  { key: 'wired_headset', label: 'Have access to a wired noise-cancelling headset' },
  { key: 'quiet_space', label: 'Quiet space to work' },
  { key: 'independent_learner', label: 'Eager to learn and be an independent learner' },
  { key: 'english', label: 'Excellent spoken and written English' },
  { key: 'spanish', label: 'Excellent spoken and written Spanish' },
  { key: 'french', label: 'Excellent spoken and written French' },
  { key: 'double_monitor', label: 'Double Monitor' },
] as const;

export interface ShiftAvailability {
  weekdays: string[];
  weekends: string[];
}

export const APPLICATION_BUCKET = 'job-applications';
