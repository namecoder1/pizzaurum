# Guida al Testing delle Notifiche

## Panoramica

Questa guida spiega come testare le notifiche push in diversi ambienti di sviluppo.

## Ambiente di Sviluppo (Development)

### Problema Comune
```
Error: no valid "aps-environment" authorization string found for the application
```

### Soluzione: Notifiche Locali
Le notifiche locali funzionano perfettamente in development mode e non richiedono configurazione server.

#### Componente di Test
```tsx
import LocalNotificationTest from '@/components/(private)/(customer)/local-notification-test';

// Nel tuo componente
<LocalNotificationTest />
```

#### Funzionalità Disponibili
- ✅ Invia notifica immediata
- ✅ Programma notifica ritardata
- ✅ Cancella tutte le notifiche
- ✅ Navigazione automatica al bottom sheet

### Test della Navigazione
1. Apri l'app in development
2. Vai alla pagina dove hai aggiunto `LocalNotificationTest`
3. Clicca "Invia Notifica Locale"
4. Clicca sulla notifica ricevuta
5. Verifica che l'app navighi a `/orders` e apra il bottom sheet

## Ambiente di Produzione (Production)

### EAS Build
Per testare le notifiche remote, devi fare un build con EAS:

```bash
# Build per iOS
eas build --platform ios --profile production

# Build per Android
eas build --platform android --profile production
```

### Dispositivo Fisico
Le notifiche remote funzionano solo su dispositivi fisici con provisioning profile valido.

## Configurazione per Test

### 1. Aggiungi il Componente di Test
```tsx
// In una pagina di test o admin
import LocalNotificationTest from '@/components/(private)/(customer)/local-notification-test';

export default function TestPage() {
  return (
    <View>
      <LocalNotificationTest />
    </View>
  );
}
```

### 2. Verifica i Permessi
Il sistema richiede automaticamente i permessi per le notifiche.

### 3. Controlla i Log
I log mostrano lo stato delle notifiche:
```
✅ Notification permissions granted
✅ Local notification sent successfully
📱 Notification tapped: {"type":"order_status_update","orderId":"test-order-123"}
📱 Opening order from notification: test-order-123
```

## Test delle Funzionalità

### Test di Navigazione
1. **Notifica Immediata**: Verifica che cliccando sulla notifica si apra il bottom sheet
2. **Notifica Ritardata**: Verifica che la notifica programmata funzioni
3. **Navigazione Manuale**: Usa il pulsante "Test Navigazione Manuale"

### Test di Gestione Errori
1. **Permessi Negati**: Verifica il comportamento quando i permessi sono negati
2. **App in Background**: Verifica che le notifiche funzionino quando l'app è in background
3. **App Chiusa**: Verifica che le notifiche aprano l'app correttamente

## Debugging

### Log Utili
```bash
# Controlla i log per errori
npx expo logs

# Log specifici per notifiche
📱 Notification received: Test Notifica Locale
📱 Notification tapped: {"type":"order_status_update","orderId":"test-order-123"}
📱 Opening order from notification: test-order-123
```

### Problemi Comuni
1. **Notifica non ricevuta**: Verifica i permessi
2. **Navigazione non funziona**: Controlla la struttura dei dati
3. **Bottom sheet non si apre**: Verifica che l'ordine esista

## Best Practices

### Development
- ✅ Usa notifiche locali per testare
- ✅ Testa su dispositivo fisico quando possibile
- ✅ Verifica i log per errori

### Production
- ✅ Usa EAS Build per notifiche remote
- ✅ Testa su dispositivi fisici
- ✅ Monitora i log di produzione

### Codice
- ✅ Gestisci sempre gli errori
- ✅ Usa log dettagliati per debugging
- ✅ Testa tutti i percorsi di navigazione
