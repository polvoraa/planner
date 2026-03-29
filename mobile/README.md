# Planner Mobile

Aplicativo Expo/React Native que espelha a estrutura principal do `plan/`:

- Home
- Tarefas
- Mensagens
- Perfil

## API

O app usa `EXPO_PUBLIC_API_URL` para falar com a API.

Exemplo:

```env
EXPO_PUBLIC_API_URL=https://planner-jz7g.onrender.com/api
```

Se a variavel nao existir, o app usa esse mesmo endpoint do Render como fallback.

## Desenvolvimento

```bash
npm install
npm run start
```

## Android local

```bash
npm run android
```

## APK com EAS

1. Faça login na sua conta Expo:

```bash
npx eas-cli@latest login
```

2. Gere o APK:

```bash
npm run apk
```

O perfil `preview` em `eas.json` gera `apk`.

## Observacoes

- O mobile usa `Bearer token` salvo com `expo-secure-store`.
- O backend foi adaptado com `/api/mobile/auth/login`.
- O site web em `plan/` continua usando sessao por cookie e nao foi substituido.
