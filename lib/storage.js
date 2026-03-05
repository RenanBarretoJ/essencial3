import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO, differenceInCalendarDays } from 'date-fns';

const TODAY_KEY = () => `dayplan_${format(new Date(), 'yyyy-MM-dd')}`;
const REMINDERS_KEY = 'reminder_settings';
const HISTORY_KEY = 'history_index';

export const defaultDayPlan = {
  priorities: ['', '', ''],
  done: [false, false, false],
};

export const defaultReminderSettings = {
  enabled: true,
  times: ['09:00', '13:00', '18:00'],
};

// ─── Pontuação ────────────────────────────────────────────────────────────────
export function calcScore(plan) {
  if (!plan) return 0;
  const completed = plan.done.filter(Boolean).length;
  const filled = plan.priorities.filter((p) => p.trim().length > 0).length;
  if (filled === 0) return 0;
  const base = completed * 10;
  const bonus = completed === 3 ? 15 : completed === filled && filled > 0 ? 5 : 0;
  return base + bonus;
}

export function getScoreLabel(score) {
  if (score >= 45) return '🔥 Perfeito!';
  if (score >= 30) return '⭐ Muito bom!';
  if (score >= 20) return '👍 Bom!';
  if (score >= 10) return '📌 Em progresso';
  return '😴 Sem atividade';
}

// ─── Plano do dia ─────────────────────────────────────────────────────────────
export async function loadTodayPlan() {
  try {
    const raw = await AsyncStorage.getItem(TODAY_KEY());
    return raw ? JSON.parse(raw) : { ...defaultDayPlan };
  } catch {
    return { ...defaultDayPlan };
  }
}

export async function saveTodayPlan(plan) {
  const key = TODAY_KEY();
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  await AsyncStorage.setItem(key, JSON.stringify(plan));
  await _upsertHistory(dateStr, plan);
}

// ─── Histórico ────────────────────────────────────────────────────────────────
async function _upsertHistory(dateStr, plan) {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    const index = raw ? JSON.parse(raw) : {};
    index[dateStr] = {
      priorities: plan.priorities,
      done: plan.done,
      score: calcScore(plan),
      savedAt: new Date().toISOString(),
    };
    // Manter apenas últimos 90 dias
    const keys = Object.keys(index).sort().slice(-90);
    const trimmed = {};
    keys.forEach((k) => { trimmed[k] = index[k]; });
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}

export async function loadHistory() {
  try {
    const raw = await AsyncStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// ─── Streak ───────────────────────────────────────────────────────────────────
export async function getStreak() {
  const history = await loadHistory();
  const today = format(new Date(), 'yyyy-MM-dd');
  let streak = 0;
  let checkDate = new Date();

  while (true) {
    const dateStr = format(checkDate, 'yyyy-MM-dd');
    const entry = history[dateStr];
    const hasActivity = entry && entry.priorities.some((p) => p.trim().length > 0);

    if (!hasActivity) {
      // Se hoje ainda não salvou, não quebra o streak
      if (dateStr === today && streak === 0) {
        checkDate = new Date(checkDate.getTime() - 86400000);
        continue;
      }
      break;
    }
    streak++;
    checkDate = new Date(checkDate.getTime() - 86400000);
  }
  return streak;
}

// ─── Stats mensais ────────────────────────────────────────────────────────────
export async function getMonthlyStats() {
  const history = await loadHistory();
  const now = new Date();
  const monthStr = format(now, 'yyyy-MM');

  const days = Object.entries(history).filter(([date]) => date.startsWith(monthStr));
  const totalScore = days.reduce((sum, [, v]) => sum + (v.score || 0), 0);
  const maxScore = days.length * 45;
  const activeDays = days.filter(([, v]) => v.priorities.some((p) => p.trim().length > 0)).length;
  const completedDays = days.filter(([, v]) => v.done.filter(Boolean).length === 3).length;

  const totalDone = days.reduce((sum, [, v]) => sum + v.done.filter(Boolean).length, 0);
  const totalFilled = days.reduce((sum, [, v]) => sum + v.priorities.filter((p) => p.trim().length > 0).length, 0);

  return {
    totalScore,
    maxScore,
    activeDays,
    completedDays,
    completionRate: totalFilled > 0 ? Math.round((totalDone / totalFilled) * 100) : 0,
    daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    days,
  };
}

// ─── Últimos 30 dias ──────────────────────────────────────────────────────────
export async function getLast30Days() {
  const history = await loadHistory();
  const result = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = format(d, 'yyyy-MM-dd');
    result.push({
      date: dateStr,
      label: format(d, 'dd/MM'),
      ...(history[dateStr] || { priorities: ['', '', ''], done: [false, false, false], score: 0 }),
    });
  }
  return result;
}

// ─── Configurações de lembretes ───────────────────────────────────────────────
export async function loadReminderSettings() {
  try {
    const raw = await AsyncStorage.getItem(REMINDERS_KEY);
    return raw ? JSON.parse(raw) : defaultReminderSettings;
  } catch {
    return defaultReminderSettings;
  }
}

export async function saveReminderSettings(settings) {
  await AsyncStorage.setItem(REMINDERS_KEY, JSON.stringify(settings));
}
