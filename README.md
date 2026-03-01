# Essencial 3 📱

Um app iOS de produtividade focado em simplicidade extrema.

**A regra central:** você define no máximo **3 prioridades** por dia — e o app te lembra delas ao longo do dia.

## Funcionalidades

- **Tela Hoje** — define suas 3 prioridades do dia com checkboxes de progresso
- **Lembretes** — notificações locais nos horários que você escolher (sem internet)
- **Persistência local** — seus dados ficam no dispositivo via AsyncStorage

## Tecnologias

- [React Native](https://reactnative.dev/) + [Expo SDK 55](https://expo.dev/)
- [Expo Router](https://expo.github.io/router/) — navegação file-based
- [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications/) — notificações locais
- [@react-native-async-storage/async-storage](https://react-native-async-storage.github.io/async-storage/) — persistência local

## Como rodar localmente

```bash
# Instalar dependências
npm install

# Iniciar o servidor de desenvolvimento
npx expo start
```

Escaneie o QR code com o **Expo Go** no seu iPhone.

## Build para iOS (sem Mac)

```bash
# Instalar EAS CLI
npm install -g eas-cli

# Login na conta Expo
eas login

# Configurar projeto
eas build:configure

# Build na nuvem
eas build --platform ios

# Publicar na App Store
eas submit --platform ios
```

## Estrutura do projeto

```
app/
├── _layout.jsx      ← navegação por abas
├── index.jsx        ← tela Hoje
└── lembretes.jsx    ← tela Lembretes
lib/
├── storage.js       ← AsyncStorage helpers
└── notifications.js ← agendamento de notificações
```
