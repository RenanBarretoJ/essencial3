import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { loadReminderSettings, saveReminderSettings, loadTodayPlan } from '../lib/storage';
import { scheduleReminders, cancelAllReminders, requestPermissions } from '../lib/notifications';

const DEFAULT_TIMES = ['07:00', '09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00'];

export default function LembretesScreen() {
  const [enabled, setEnabled] = useState(true);
  const [selectedTimes, setSelectedTimes] = useState(['09:00', '13:00', '18:00']);

  useFocusEffect(
    useCallback(() => {
      loadReminderSettings().then((s) => {
        setEnabled(s.enabled);
        setSelectedTimes(s.times);
      });
    }, [])
  );

  async function toggleEnabled(value) {
    setEnabled(value);
    const settings = { enabled: value, times: selectedTimes };
    await saveReminderSettings(settings);

    if (!value) {
      await cancelAllReminders();
    } else {
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert(
          'Permissão necessária',
          'Ative as notificações do Foco3 nas Configurações do iPhone.',
          [{ text: 'OK' }]
        );
        setEnabled(false);
        return;
      }
      const plan = await loadTodayPlan();
      await scheduleReminders(plan.priorities, selectedTimes);
    }
  }

  async function toggleTime(time) {
    let updated;
    if (selectedTimes.includes(time)) {
      if (selectedTimes.length === 1) {
        Alert.alert('Mínimo 1 horário', 'Mantenha ao menos um horário de lembrete.');
        return;
      }
      updated = selectedTimes.filter((t) => t !== time);
    } else {
      if (selectedTimes.length >= 6) {
        Alert.alert('Máximo 6 horários', 'Selecione no máximo 6 horários por dia.');
        return;
      }
      updated = [...selectedTimes, time].sort();
    }

    setSelectedTimes(updated);
    const settings = { enabled, times: updated };
    await saveReminderSettings(settings);

    if (enabled) {
      const plan = await loadTodayPlan();
      await scheduleReminders(plan.priorities, updated);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Toggle principal */}
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.toggleTitle}>Notificações</Text>
            <Text style={styles.toggleSub}>Receber lembretes ao longo do dia</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={toggleEnabled}
            trackColor={{ false: '#E5E5EA', true: '#34C759' }}
            thumbColor={Platform.OS === 'android' ? '#FFFFFF' : undefined}
          />
        </View>
      </View>

      {/* Seleção de horários */}
      <Text style={styles.sectionTitle}>Horários dos lembretes</Text>
      <Text style={styles.sectionSub}>
        Selecione até 6 horários · {selectedTimes.length} selecionado
        {selectedTimes.length !== 1 ? 's' : ''}
      </Text>

      <View style={styles.timesGrid}>
        {DEFAULT_TIMES.map((time) => {
          const active = selectedTimes.includes(time);
          return (
            <TouchableOpacity
              key={time}
              style={[styles.timeChip, active && styles.timeChipActive, !enabled && styles.timeChipDisabled]}
              onPress={() => enabled && toggleTime(time)}
              disabled={!enabled}
            >
              <Text style={[styles.timeChipText, active && styles.timeChipTextActive]}>
                {time}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Preview do que será enviado */}
      <Text style={styles.sectionTitle}>Como será a notificação</Text>
      <View style={styles.previewCard}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewApp}>Foco3</Text>
          <Text style={styles.previewTime}>agora</Text>
        </View>
        <Text style={styles.previewTitle}>🎯 Foco do dia</Text>
        <Text style={styles.previewBody}>Prioridade 1 · Prioridade 2 · Prioridade 3</Text>
      </View>

      {/* Dica */}
      <View style={styles.tipBox}>
        <Text style={styles.tipIcon}>💡</Text>
        <Text style={styles.tipText}>
          Os lembretes são agendados ao salvar suas prioridades na aba{' '}
          <Text style={styles.tipBold}>Hoje</Text>. Notificações locais — funcionam sem internet.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scroll: {
    padding: 20,
    paddingBottom: 48,
  },
  card: {
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 2,
  },
  toggleSub: {
    fontSize: 13,
    color: '#8E8E93',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
    letterSpacing: 0.2,
  },
  sectionSub: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 14,
  },
  timesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 32,
  },
  timeChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  timeChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  timeChipDisabled: {
    opacity: 0.4,
  },
  timeChipText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3C3C43',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 10,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  previewApp: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  previewTime: {
    fontSize: 12,
    color: '#C7C7CC',
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 3,
  },
  previewBody: {
    fontSize: 14,
    color: '#3C3C43',
    lineHeight: 20,
  },
  tipBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tipIcon: {
    fontSize: 18,
    marginRight: 10,
    marginTop: 1,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: '#5C4A00',
    lineHeight: 19,
  },
  tipBold: {
    fontWeight: '700',
  },
});
