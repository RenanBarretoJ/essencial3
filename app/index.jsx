import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { loadTodayPlan, saveTodayPlan, calcScore, getScoreLabel, getStreak } from '../lib/storage';
import { loadReminderSettings } from '../lib/storage';
import { scheduleReminders } from '../lib/notifications';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  AVAudioSessionCategory,
} from 'expo-speech-recognition';

const LABELS = ['Prioridade 1', 'Prioridade 2', 'Prioridade 3'];
const COLORS = ['#007AFF', '#34C759', '#FF9500'];

export default function HojeScreen() {
  const [priorities, setPriorities] = useState(['', '', '']);
  const [done, setDone] = useState([false, false, false]);
  const [saved, setSaved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [listeningIndex, setListeningIndex] = useState(null);
  const [recognizing, setRecognizing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadTodayPlan().then((plan) => {
        setPriorities(plan.priorities);
        setDone(plan.done);
        setSaved(plan.priorities.some((p) => p.trim().length > 0));
      });
      getStreak().then(setStreak);
    }, [])
  );

  // ─── Eventos de reconhecimento de voz ─────────────────────────────────────
  useSpeechRecognitionEvent('start', () => setRecognizing(true));
  useSpeechRecognitionEvent('end', () => {
    setRecognizing(false);
    setListeningIndex(null);
  });
  useSpeechRecognitionEvent('result', (event) => {
    if (listeningIndex !== null && event.results?.[0]?.transcript) {
      const text = event.results[0].transcript;
      const updated = [...priorities];
      updated[listeningIndex] = text;
      setPriorities(updated);
      setSaved(false);
    }
  });
  useSpeechRecognitionEvent('error', () => {
    setRecognizing(false);
    setListeningIndex(null);
  });

  async function startListening(index) {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      Alert.alert('Permissão necessária', 'Ative o microfone nas configurações do iPhone.');
      return;
    }
    setListeningIndex(index);
    ExpoSpeechRecognitionModule.start({
      lang: 'pt-BR',
      interimResults: true,
      iosCategory: {
        category: AVAudioSessionCategory.PlayAndRecord,
        categoryOptions: ['defaultToSpeaker', 'allowBluetooth'],
        mode: 'measurement',
      },
    });
  }

  function stopListening() {
    ExpoSpeechRecognitionModule.stop();
  }

  const today = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayCapitalized = today.charAt(0).toUpperCase() + today.slice(1);

  function updatePriority(index, value) {
    const updated = [...priorities];
    updated[index] = value;
    setPriorities(updated);
    setSaved(false);
  }

  function toggleDone(index) {
    const updated = [...done];
    updated[index] = !updated[index];
    setDone(updated);
    saveTodayPlan({ priorities, done: updated });
  }

  async function handleSave() {
    const hasContent = priorities.some((p) => p.trim().length > 0);
    if (!hasContent) {
      Alert.alert('Atenção', 'Preencha ao menos uma prioridade.');
      return;
    }
    await saveTodayPlan({ priorities, done });
    const settings = await loadReminderSettings();
    if (settings.enabled) {
      await scheduleReminders(priorities, settings.times);
    }
    setSaved(true);
    const score = calcScore({ priorities, done });
    Alert.alert('✅ Salvo!', `Prioridades salvas!\n${getScoreLabel(score)} — ${score} pontos hoje.`);
  }

  const completedCount = done.filter(Boolean).length;
  const totalFilled = priorities.filter((p) => p.trim().length > 0).length;
  const todayScore = calcScore({ priorities, done });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.dateText}>{todayCapitalized}</Text>
            {streak > 0 && (
              <Text style={styles.streakText}>
                {streak >= 7 ? '🔥' : streak >= 3 ? '⚡' : '🌱'} {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'}
              </Text>
            )}
          </View>
          {totalFilled > 0 && (
            <View style={styles.scoreChip}>
              <Text style={styles.scoreChipText}>{todayScore} pts</Text>
            </View>
          )}
        </View>

        {/* Barra de progresso */}
        {totalFilled > 0 && (
          <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${(completedCount / totalFilled) * 100}%` }]} />
          </View>
        )}

        {/* Card intro */}
        <View style={styles.introCard}>
          <Text style={styles.introEmoji}>🎯</Text>
          <Text style={styles.introText}>
            Quais são suas <Text style={styles.introBold}>3 prioridades</Text> de hoje?
          </Text>
        </View>

        {/* Campos de prioridade */}
        {priorities.map((value, i) => (
          <View key={i} style={styles.priorityRow}>
            <TouchableOpacity
              style={[styles.checkbox, done[i] && styles.checkboxDone]}
              onPress={() => toggleDone(i)}
              disabled={!value.trim()}
            >
              {done[i] && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={[styles.inputWrapper, done[i] && styles.inputWrapperDone]}>
              <View style={[styles.colorDot, { backgroundColor: COLORS[i] }]} />
              <TextInput
                style={[styles.input, done[i] && styles.inputDone]}
                placeholder={LABELS[i]}
                placeholderTextColor="#C7C7CC"
                value={value}
                onChangeText={(text) => updatePriority(i, text)}
                returnKeyType="next"
                maxLength={80}
                editable={!done[i]}
              />
              {/* Botão de voz */}
              <TouchableOpacity
                style={[styles.micButton, listeningIndex === i && styles.micButtonActive]}
                onPress={() => listeningIndex === i ? stopListening() : startListening(i)}
                disabled={done[i] || (recognizing && listeningIndex !== i)}
              >
                {listeningIndex === i && recognizing ? (
                  <ActivityIndicator size="small" color="#FF3B30" />
                ) : (
                  <Text style={styles.micIcon}>🎤</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Dica de voz */}
        <Text style={styles.voiceTip}>Toque em 🎤 para falar a prioridade em voz alta</Text>

        {/* Botão salvar */}
        <TouchableOpacity
          style={[styles.saveButton, saved && styles.saveButtonSaved]}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{saved ? '✓ Salvo' : 'Salvar e agendar lembretes'}</Text>
        </TouchableOpacity>

        {/* Pontuação */}
        {totalFilled > 0 && (
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Pontuação de hoje</Text>
            <Text style={styles.scoreValue}>{todayScore} / 45 pts</Text>
            <Text style={styles.scoreTag}>{getScoreLabel(todayScore)}</Text>
          </View>
        )}

        <Text style={styles.tip}>Máximo de 3 prioridades. Foco total no que importa.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 8,
  },
  dateText: { fontSize: 15, color: '#3C3C43', fontWeight: '500' },
  streakText: { fontSize: 12, color: '#FF9500', fontWeight: '600', marginTop: 2 },
  scoreChip: {
    backgroundColor: '#007AFF', borderRadius: 10,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  scoreChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
  progressBarContainer: {
    height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, marginBottom: 20, overflow: 'hidden',
  },
  progressBar: { height: 4, backgroundColor: '#34C759', borderRadius: 2 },
  introCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 24,
    flexDirection: 'row', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  introEmoji: { fontSize: 28, marginRight: 12 },
  introText: { fontSize: 16, color: '#3C3C43', flex: 1, lineHeight: 22 },
  introBold: { fontWeight: '700', color: '#007AFF' },
  priorityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    borderColor: '#C7C7CC', alignItems: 'center', justifyContent: 'center',
    marginRight: 12, backgroundColor: '#FFFFFF',
  },
  checkboxDone: { backgroundColor: '#34C759', borderColor: '#34C759' },
  checkmark: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  inputWrapper: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  inputWrapperDone: { opacity: 0.6 },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  input: { flex: 1, fontSize: 16, color: '#000000', padding: 0 },
  inputDone: { textDecorationLine: 'line-through', color: '#8E8E93' },
  micButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginLeft: 8,
  },
  micButtonActive: { backgroundColor: '#FFE5E5' },
  micIcon: { fontSize: 16 },
  voiceTip: {
    textAlign: 'center', color: '#8E8E93', fontSize: 12, marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveButtonSaved: { backgroundColor: '#34C759', shadowColor: '#34C759' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', letterSpacing: 0.3 },
  scoreCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16,
    alignItems: 'center', marginTop: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  scoreLabel: { fontSize: 12, color: '#8E8E93', marginBottom: 4 },
  scoreValue: { fontSize: 22, fontWeight: '800', color: '#007AFF', letterSpacing: -0.5 },
  scoreTag: { fontSize: 13, color: '#3C3C43', marginTop: 2 },
  tip: {
    textAlign: 'center', color: '#8E8E93', fontSize: 13, marginTop: 16, lineHeight: 18,
  },
});
