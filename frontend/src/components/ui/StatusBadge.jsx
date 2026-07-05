import clsx from 'clsx';

const variants = {
  draft: 'bg-gray-100 text-gray-700',
  reviewed: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  closed: 'bg-purple-100 text-purple-700',
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-amber-100 text-amber-700',
  high: 'bg-red-100 text-red-700',
  access: 'bg-indigo-100 text-indigo-700',
  issue: 'bg-orange-100 text-orange-700',
  information: 'bg-cyan-100 text-cyan-700',
  change: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700',
};

export default function StatusBadge({ value, className }) {
  const key = value?.toLowerCase();
  return (
    <span className={clsx('badge capitalize', variants[key] || 'bg-gray-100 text-gray-700', className)}>
      {value}
    </span>
  );
}
