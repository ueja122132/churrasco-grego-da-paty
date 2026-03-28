import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeAgo(dateString: string) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Há 1 dia';
  if (diffDays < 30) return `Há ${diffDays} dias`;

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return 'Há 1 mês';
  if (diffMonths < 12) return `Há ${diffMonths} meses`;

  const diffYears = Math.floor(diffMonths / 12);
  return diffYears === 1 ? 'Há 1 ano' : `Há ${diffYears} anos`;
}
