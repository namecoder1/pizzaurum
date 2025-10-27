# Webhook Setup - Guida Rapida

## 🎯 TL;DR - Quale Setup Uso?

### Setup Diretto (ATTUALE) ⚡️
**Per sviluppo quotidiano veloce**

```bash
# Terminale 1
npx expo start -c

# Terminale 2
npm run stripe
```

**Log webhook:** Solo in Terminale 1 (Expo)

---

### Setup Ngrok (COME IERI) 🔍
**Per vedere log in tutti i terminali**

```bash
# Terminale 1
npx expo start -c

# Terminale 2
npm run stripe:ngrok
# Copia l'URL (es. https://abc123.ngrok-free.app)

# Terminale 3
stripe listen --forward-to https://abc123.ngrok-free.app/api/stripe/webhook
```

**Log webhook:** In TUTTI e 3 i terminali

**IMPORTANTE:** Aggiorna `.env`:
```bash
EXPO_PUBLIC_BASE_URL=https://abc123.ngrok-free.app
```

Poi riavvia Expo e l'app mobile.

---

## 📊 Confronto Rapido

| Cosa | Setup Diretto | Setup Ngrok |
|------|---------------|-------------|
| Terminali | 2 | 3 |
| Log webhook | Solo Expo | Expo + Stripe + Ngrok |
| Configurazione | Nessuna | Aggiorna URL ogni volta |
| URL cambia? | ❌ No | ✅ Sì (ogni restart) |
| Velocità | ⚡️ Veloce | 🐌 Setup più lento |

---

## 🔍 Perché Ieri Vedevi i Log anche in Stripe CLI?

**Setup di IERI (con ngrok):**
```
App → Stripe → Ngrok → Stripe CLI → Localhost
                              ↑
                        Log anche qui!
```

**Setup di OGGI (diretto):**
```
App → Stripe → Direttamente Localhost
                       ↑
              Log solo qui!
```

---

## 🚀 Quick Start

### Tornare al Setup di Ieri (3 Terminali + Log Multipli)

1. **Avvia ngrok:**
   ```bash
   npm run stripe:ngrok
   ```

2. **Copia l'URL** (es. `https://abc123.ngrok-free.app`)

3. **In un altro terminale, avvia Expo:**
   ```bash
   npx expo start -c
   ```

4. **In un altro terminale, avvia Stripe CLI:**
   ```bash
   stripe listen --forward-to https://abc123.ngrok-free.app/api/stripe/webhook
   ```

5. **Aggiorna `.env`:**
   ```bash
   EXPO_PUBLIC_BASE_URL=https://abc123.ngrok-free.app
   ```

6. **Riavvia l'app mobile**

✅ Ora vedrai i log in tutti e 3 i terminali!

---

## 🔧 Troubleshooting Rapido

### "Non vedo log in npm run stripe"
- ✅ **NORMALE** con setup diretto
- 🔍 Guarda nel terminale Expo invece
- 💡 Se vuoi log lì, usa setup ngrok

### "L'app non si connette"
- ⚠️ Hai aggiornato `EXPO_PUBLIC_BASE_URL`?
- ⚠️ Hai riavviato Expo?
- ⚠️ Hai riavviato l'app mobile?

### "URL ngrok non funziona"
- 🔄 L'URL cambia ogni volta che riavvii ngrok
- 📝 Aggiorna `.env` con il nuovo URL
- 🔄 Riavvia Expo e l'app

---

## 📚 Documentazione Completa

Per la guida completa, vedi: [`stripe-webhook-troubleshooting.md`](./stripe-webhook-troubleshooting.md)

