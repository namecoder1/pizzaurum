# Stripe Webhook Troubleshooting Guide

## ⚠️ IMPORTANTE: Dove guardare i log webhook

### Setup Attuale (DIRETTO) - 2 Terminali
**I log dei pagamenti reali appaiono nel terminale di Expo, NON in `npm run stripe`!**

**Flusso:**
```
App → Stripe → Direttamente Localhost → Log solo in Expo
```

Questo è il **comportamento corretto** per il setup diretto perché:
- I pagamenti dall'app vanno direttamente all'endpoint webhook di Expo
- `npm run stripe` serve SOLO per testare con `stripe trigger`
- Se vedi log come questi nel terminale Expo, tutto funziona: ✅
  ```
  🔔 Webhook received: {...}
  📨 Processing webhook event: payment_intent.succeeded
  ✅ Order created successfully
  ```

### Setup con Ngrok (INTERCETTATO) - 3 Terminali
**Con ngrok, i log appaiono in ENTRAMBI i terminali (Expo E Stripe CLI)!**

**Flusso:**
```
App → Stripe → Ngrok → Stripe CLI → Localhost → Log in ENTRAMBI
```

Se vuoi vedere i log anche nel terminale Stripe CLI, devi usare [ngrok](#come-tornare-al-setup-con-ngrok).

---

## Come Tornare al Setup con Ngrok

Se ieri vedevi i log anche in Stripe CLI, probabilmente avevi ngrok attivo. Ecco come ripristinare quel setup:

### Passaggio 1: Installa Ngrok (se non ce l'hai)
```bash
# Con Homebrew (Mac)
brew install ngrok/ngrok/ngrok

# Oppure scarica da https://ngrok.com/download
```

### Passaggio 2: Autentica Ngrok (prima volta)
```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
# Ottieni il token da https://dashboard.ngrok.com/get-started/your-authtoken
```

### Passaggio 3: Avvia i 3 Terminali

**Terminale 1: Expo Dev Server**
```bash
npx expo start -c
```

**Terminale 2: Ngrok**
```bash
ngrok http 8081
```

Vedrai qualcosa tipo:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:8081
```

**COPIA** quell'URL `https://abc123.ngrok-free.app` ⬅️ **IMPORTANTE!**

**Terminale 3: Stripe CLI**
```bash
# Sostituisci abc123 con il tuo URL ngrok
stripe listen --forward-to https://abc123.ngrok-free.app/api/stripe/webhook
```

### Passaggio 4: Aggiorna l'URL nell'App

Devi dire all'app di usare l'URL ngrok invece di localhost.

**Opzione A: Variabile d'ambiente (consigliato)**
Nel tuo `.env`:
```bash
EXPO_PUBLIC_BASE_URL=https://abc123.ngrok-free.app
```

Poi riavvia Expo:
```bash
npx expo start -c
```

**Opzione B: Hardcode temporaneo**
In `utils/config.ts`, cambia temporaneamente:
```typescript
// baseUrl: process.env.EXPO_PUBLIC_BASE_URL || 'http://localhost:8081'
baseUrl: 'https://abc123.ngrok-free.app'  // URL ngrok temporaneo
```

### Risultato Finale

Con questo setup vedrai:

**Terminale Expo (Terminale 1):**
```
🔔 Webhook received: {...}
📨 Processing webhook event: payment_intent.succeeded
✅ Order created successfully
```

**Stripe CLI (Terminale 3):**
```
2025-10-07 10:11:15   --> payment_intent.succeeded [evt_xxx]
2025-10-07 10:11:15  <--  [200] POST https://abc123.ngrok-free.app/api/stripe/webhook
```

**Ngrok (Terminale 2):**
```
POST /api/stripe/webhook    200 OK
```

🎉 **Log in TUTTI e 3 i terminali!**

---

## Problema: Webhook non riceve eventi da pagamenti reali

### Sintomi
- ✅ `stripe trigger` funziona e mostra i log
- ❌ Pagamenti reali dall'app non generano webhook
- ❌ Ordini non vengono salvati nel database
- ❌ Nessun log nel terminale `npm run stripe`

### Cause Principali

#### 1. **Webhook non configurato nel Dashboard Stripe**
**Problema**: Stripe non sa dove inviare i webhook per pagamenti reali.

**Soluzione**:
1. Vai su [Dashboard Stripe Test](https://dashboard.stripe.com/test/webhooks)
2. Clicca **"Add endpoint"**
3. **Endpoint URL**: `https://your-ngrok-url.ngrok-free.app/api/stripe/webhook`
4. **Events to send**:
   - `payment_intent.succeeded` ✅
   - `checkout.session.completed` ✅
   - `payment_intent.payment_failed` ✅
5. Clicca **"Add endpoint"**

#### 2. **Stripe CLI non riceve eventi reali**
**Problema**: `stripe listen` funziona solo per eventi di test, non per pagamenti reali.

**Soluzione**: Usa ngrok per esporre il localhost:
```bash
# Terminale 1: Ngrok
ngrok http 8081

# Terminale 2: Stripe CLI con ngrok
stripe listen --forward-to https://your-ngrok-url.ngrok-free.app/api/stripe/webhook
```

#### 3. **Bypass della firma non funziona**
**Problema**: Webhook rifiuta eventi perché la firma non è valida.

**Soluzione**: Verifica la configurazione in `utils/server-config.ts`:
```typescript
export function shouldBypassSignatureVerification(): boolean {
  const isDev = currentEnv === 'development' || currentEnv === 'dev' || process.env.NODE_ENV === 'development';
  const shouldBypass = serverConfig.webhook.bypassSignatureInDev && isDev;
  return shouldBypass;
}
```

#### 4. **Variabili d'ambiente mancanti**
**Problema**: Supabase admin client non si inizializza.

**Soluzione**: Verifica che siano impostate:
```bash
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
```

### Setup Completo per Sviluppo

#### Setup Semplice (RACCOMANDATO) - 2 Terminali
Questo è il setup che usi attualmente ed è **perfetto per sviluppo veloce**:

**Terminale 1: Expo Dev Server**
```bash
npx expo start -c
```

**Terminale 2: Stripe CLI (per test manuali)**
```bash
npm run stripe
```

**Dove guardare i log:**
- ✅ **Log webhook**: nel Terminale 1 (Expo)
- ✅ **Log test manuali**: nel Terminale 2 (Stripe CLI quando usi `stripe trigger`)
- ✅ **Log pagamenti reali**: nel Terminale 1 (Expo)

**Comportamento normale:**
- `npm run stripe` NON mostra log dei pagamenti reali dall'app
- I log dei pagamenti reali appaiono SOLO nel terminale Expo
- Questo è il comportamento CORRETTO per setup diretto! ✅

**Pro:**
- ✅ Setup veloce (2 terminali)
- ✅ Nessuna configurazione extra
- ✅ Funziona sempre (localhost non cambia)

**Contro:**
- ⚠️ Log solo in un posto (Expo)
- ⚠️ Non puoi usare Stripe Dashboard per inviare webhook

---

#### Setup Avanzato con Ngrok - 3 Terminali
Usa questo se vuoi vedere log in entrambi i terminali (come ieri):

**Terminale 1: Expo Dev Server**
```bash
npx expo start -c
```

**Terminale 2: Ngrok**
```bash
ngrok http 8081
```

**Terminale 3: Stripe CLI**
```bash
# Copia URL da Terminale 2 e sostituiscilo qui
stripe listen --forward-to https://abc123.ngrok-free.app/api/stripe/webhook
```

**Dove guardare i log:**
- ✅ **Log webhook**: in TUTTI e 3 i terminali
- ✅ **Log dettagliati**: nel Terminale Expo
- ✅ **Log Stripe eventi**: nel Terminale Stripe CLI
- ✅ **Log HTTP**: nel Terminale Ngrok

**Pro:**
- ✅ Log in tutti i terminali
- ✅ Puoi testare da Stripe Dashboard
- ✅ Debugging più dettagliato

**Contro:**
- ⚠️ Setup più complesso (3 terminali)
- ⚠️ URL ngrok cambia ad ogni restart
- ⚠️ Devi aggiornare `EXPO_PUBLIC_BASE_URL` ogni volta

**Importante con Ngrok:**
- Copia l'URL ngrok (es. `https://abc123.ngrok-free.app`)
- Usa quell'URL nel comando `stripe listen`
- Aggiorna `EXPO_PUBLIC_BASE_URL` con quell'URL
- L'URL cambia ogni volta che riavvii ngrok
- Devi riavviare l'app Expo dopo aver cambiato l'URL

### Configurazione Webhook nel Dashboard

1. **Vai su Dashboard Stripe Test**
2. **Webhooks** → **Add endpoint**
3. **Endpoint URL**: `https://your-ngrok-url.ngrok-free.app/api/stripe/webhook`
4. **Events to send**:
   - `payment_intent.succeeded`
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
5. **Save**

### Test del Webhook

#### Test con Stripe CLI
```bash
# Testa payment_intent.succeeded
stripe trigger payment_intent.succeeded

# Testa checkout.session.completed
stripe trigger checkout.session.completed
```

#### Test con API
```bash
# Testa connessione database
curl -X POST http://localhost:8081/api/test-webhook-db

# Testa webhook con dati reali
curl -X POST http://localhost:8081/api/test-webhook-real
```

### Log da Controllare

#### Terminale Expo Dev
```
🔔 Webhook received: {...}
📨 Processing webhook event: payment_intent.succeeded
🔧 Attempting to get Supabase admin client...
✅ User verified in database: [nome utente]
📝 Creating order with data: {...}
✅ Order created successfully for session: [session_id]
```

#### Terminale Stripe CLI
```
2025-10-06 11:30:25   --> payment_intent.succeeded [evt_xxx]
2025-10-06 11:30:25  <--  [200] POST http://localhost:8081/api/stripe/webhook [evt_xxx]
```

### Errori Comuni e Soluzioni

#### "No signature provided"
**Causa**: Bypass della firma non funziona
**Soluzione**: Verifica `shouldBypassSignatureVerification()` in `utils/server-config.ts`

#### "Invalid webhook payload"
**Causa**: Firma non valida o payload corrotto
**Soluzione**: Usa ngrok invece di localhost diretto

#### "Supabase admin client not initialized"
**Causa**: Variabili d'ambiente mancanti
**Soluzione**: Verifica `SUPABASE_SERVICE_ROLE_KEY` e `EXPO_PUBLIC_SUPABASE_URL`

#### "User not found in database"
**Causa**: `user_id` nel metadata non esiste nel database
**Soluzione**: Verifica che l'utente sia registrato in Supabase

#### "Order already exists"
**Causa**: Webhook viene chiamato più volte
**Soluzione**: Controllo duplicati già implementato nel webhook

### Checklist per Debug

- [ ] Ngrok è attivo e raggiungibile (se usi setup avanzato)
- [ ] Webhook configurato nel Dashboard Stripe (se usi setup avanzato)
- [ ] Stripe CLI in ascolto sull'URL corretto
- [ ] Variabili d'ambiente impostate
- [ ] Bypass della firma funziona in sviluppo
- [ ] Supabase admin client si inizializza
- [ ] Utente esiste nel database
- [ ] Log appaiono nei terminali corretti

### Comandi Utili

```bash
# Verifica ngrok (se attivo)
curl http://localhost:4040/api/tunnels

# Testa webhook endpoint
curl -X POST https://your-ngrok-url.ngrok-free.app/api/stripe/webhook

# Verifica variabili d'ambiente
echo $SUPABASE_SERVICE_ROLE_KEY
echo $EXPO_PUBLIC_SUPABASE_URL

# Testa connessione Supabase
curl -X POST http://localhost:8081/api/test-supabase-admin
```

### Note Importanti

1. **Ngrok URL cambia** ogni volta che riavvii ngrok
2. **Webhook nel Dashboard** deve essere aggiornato con il nuovo URL
3. **Stripe CLI** deve essere riavviato con il nuovo URL
4. **EXPO_PUBLIC_BASE_URL** deve essere aggiornato con il nuovo URL
5. **Test sempre** con `stripe trigger` prima di testare pagamenti reali
6. **Log sono fondamentali** per il debug - controlla sempre i terminali corretti

### Produzione

Per produzione, configura il webhook nel Dashboard Stripe con l'URL del tuo server di produzione, non con ngrok.

### Confronto Setup

| Caratteristica | Setup Diretto (2 terminali) | Setup Ngrok (3 terminali) |
|----------------|----------------------------|---------------------------|
| Velocità setup | ⚡️ Veloce | 🐌 Più lento |
| Log webhook | Solo Expo | Expo + Stripe CLI + Ngrok |
| URL cambia? | ❌ No | ✅ Sì (ogni restart) |
| Dashboard Stripe | ❌ Non usabile | ✅ Usabile |
| Configurazione | Minima | Media |
| **Raccomandato per** | Sviluppo quotidiano | Debug avanzato |

### Quale Setup Usare?

**Usa Setup Diretto (2 terminali) se:**
- Vuoi sviluppare velocemente
- Non hai bisogno di log multipli
- Non usi Stripe Dashboard per testare

**Usa Setup Ngrok (3 terminali) se:**
- Vuoi vedere log in tutti i terminali (come ieri)
- Hai bisogno di debugging avanzato
- Vuoi testare da Stripe Dashboard
- Vuoi condividere l'endpoint con altri
