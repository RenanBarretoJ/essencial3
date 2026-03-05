import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  loadTodayPlan,
  calcScore,
  getScoreLabel,
  getStreak,
  getMonthlyStats,
  getLast30Days,
} from '../lib/storage';

export default function DashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [todayScore, setTodayScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [monthly, setMonthly] = useState(null);
  const [last30, setLast30] = useState([]);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        setLoading(true);
        const [plan, s, m, l30] = await Promise.all([
          loadTodayPlan(),
          getStreak(),
          getMonthlyStats(),
          getLast30Days(),
        ]);
        setTodayScore(calcScore(plan));
        setStreak(s);
        setMonthly(m);
        setLast30(l30);
        setLoading(false);
      }
      load();
    }, [])
  );

  const monthName = format(new Date(), 'MMMM yyyy', { locale: ptBR });
  const monthNameCap = monthName.charAt(0).toUpperCase() + monthName.slice(1);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const scorePercent = monthly?.maxScore > 0
    ? Math.min((monthly.totalScore / monthly.maxScore) * 100, 100)
    : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>

      {/* Pontuação de hoje */}
      <View style={styles.todayCard}>
        <View style={styles.todayLeft}>
          <Text style={styles.todayLabel}>Pontuação de hoje</Text>
          <Text style={styles.todayScore}>{todayScore} pts</Text>
          <Text style={styles.todayTag}>{getScoreLabel(todayScore)}</Text>
        </View>
        <View style={styles.scoreCircle}>
          <Text style={styles.scoreCircleText}>{todayScore}</Text>
          <Text style={styles.scoreCircleMax}>/45</Text>
        </View>
      </View>

      {/* Streak */}
      <View style={styles.streakCard}>
        <Text style={styles.streakEmoji}>{streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🌱'}</Text>
        <View style={styles.streakInfo}>
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>
            {streak === 1 ? 'dia seguido' : 'dias seguidos'}
          </Text>
        </View>
        <Text style={styles.streakMsg}>
          {streak === 0 ? 'Comece hoje!' : streak < 3 ? 'Continue assim!' : streak < 7 ? 'Ótimo ritmo!' : 'Incrível! 🏆'}
        </Text>
      </View>

      {/* Stats do mês */}
      <Text style={styles.sectionTitle}>{monthNameCap}</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{monthly?.totalScore || 0}</Text>
          <Text style={styles.statLabel}>pontos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{monthly?.activeDays || 0}</Text>
          <Text style={styles.statLabel}>dias ativos</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{monthly?.completionRate || 0}%</Text>
          <Text style={styles.statLabel}>conclusão</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{monthly?.completedDays || 0}</Text>
          <Text style={styles.statLabel}>dias perfeitos</Text>
        </View>
      </View>

      {/* Barra de progresso mensal */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Progresso do mês</Text>
          <Text style={styles.progressValue}>
            {monthly?.totalScore || 0} / {monthly?.maxScore || 0} pts
          </Text>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${scorePercent}%` }]} />
        </View>
        <Text style={styles.progressSub}>
          {monthly?.activeDays || 0} de {monthly?.daysInMonth || 30} dias com atividade
        </Text>
      </View>

      {/* Histórico 30 dias */}
      <Text style={styles.sectionTitle}>Últimos 30 dias</Text>
      <View style={styles.calendarGrid}>
        {last30.map((day) => {
          const score = day.score || 0;
          const filled = day.priorities?.filter((p) => p.trim().length > 0).length || 0;
          const isToday = day.date === format(new Date(), 'yyyy-MM-dd');
          let bg = '#E5E5EA';
          if (filled > 0 && score >= 45) bg = '#34C759';
          else if (filled > 0 && score >= 20) bg = '#007AFF';
          else if (filled > 0) bg = '#FF9500';

          return (
            <View key={day.date} style={[styles.dayCell, { backgroundColor: bg }, isToday && styles.dayCellToday]}>
              <Text style={[styles.dayCellText, filled > 0 && styles.dayCellTextActive]}>
                {day.label.split('/')[0]}
              </Text>
              {filled > 0 && (
                <Text style={styles.dayCellScore}>{score}</Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#34C759' }]} />
          <Text style={styles.legendText}>Perfeito (45pts)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#007AFF' }]} />
          <Text style={styles.legendText}>Bom (20-44pts)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#FF9500' }]} />
          <Text style={styles.legendText}>Parcial (1-19pts)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E5E5EA' }]} />
          <Text style={styles.legendText}>Sem atividade</Text>
        </View>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 20, paddingBottom: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },

  todayCard: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  todayLeft: { flex: 1 },
  todayLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '500', marginBottom: 4 },
  todayScore: { color: '#FFFFFF', fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  todayTag: { color: 'rgba(255,255,255,0.9)', fontSize: 14, fontWeight: '600', marginTop: 4 },
  scoreCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  scoreCircleText: { color: '#FFFFFF', fontSize: 22, fontWeight: '800' },
  scoreCircleMax: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },

  streakCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  streakEmoji: { fontSize: 36, marginRight: 14 },
  streakInfo: { flex: 1 },
  streakNumber: { fontSize: 28, fontWeight: '800', color: '#000', letterSpacing: -1 },
  streakLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '500' },
  streakMsg: { fontSize: 13, color: '#007AFF', fontWeight: '600' },

  sectionTitle: {
    fontSize: 17, fontWeight: '700', color: '#000',
    marginBottom: 12, letterSpacing: 0.2,
  },

  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14,
  },
  statBox: {
    flex: 1, minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: '#007AFF', letterSpacing: -1 },
  statLabel: { fontSize: 12, color: '#8E8E93', fontWeight: '500', marginTop: 2 },

  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  progressTitle: { fontSize: 15, fontWeight: '600', color: '#000' },
  progressValue: { fontSize: 13, color: '#007AFF', fontWeight: '700' },
  progressBarBg: {
    height: 10, backgroundColor: '#E5E5EA', borderRadius: 5, overflow: 'hidden', marginBottom: 8,
  },
  progressBarFill: {
    height: 10, backgroundColor: '#007AFF', borderRadius: 5,
  },
  progressSub: { fontSize: 12, color: '#8E8E93' },

  calendarGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16,
  },
  dayCell: {
    width: 44, height: 44, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  dayCellToday: {
    borderWidth: 2, borderColor: '#007AFF',
  },
  dayCellText: { fontSize: 11, fontWeight: '600', color: '#8E8E93' },
  dayCellTextActive: { color: '#FFFFFF' },
  dayCellScore: { fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: '700' },

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 11, color: '#8E8E93' },
});
