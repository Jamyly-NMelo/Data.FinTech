import { usePreferences } from '@/lib/preferences';

const LIGHT = ['#0F2C59', '#4EAE94', '#F8B959', '#2F6FB0', '#C4573C'];
const DARK = ['#4EAE94', '#F8B959', '#5B9BE0', '#A98BE0', '#E08A72'];

export const SERIES_MINT = '#4EAE94';
export const SERIES_TERRACOTTA = '#C4573C';

/** Paleta e eixos dos gráficos, coerentes com o tema ativo. */
export function useChartTheme() {
  const { theme } = usePreferences();
  const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark);

  return {
    isDark,
    colors: isDark ? DARK : LIGHT,
    grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,44,89,0.08)',
    axis: isDark ? '#9AA7BD' : '#5B6B7F',
    income: isDark ? '#4EAE94' : '#2E8C74',
    expense: isDark ? '#E08A72' : '#C4573C',
    tooltip: {
      background: isDark ? '#1E2640' : '#FFFFFF',
      border: isDark ? '1px solid #2E3856' : '1px solid rgba(15,44,89,0.12)',
      borderRadius: '12px',
      fontSize: '12px',
      boxShadow: '0 12px 32px -18px rgba(15,44,89,0.4)',
      color: isDark ? '#EDF1F7' : '#222831',
    },
  };
}