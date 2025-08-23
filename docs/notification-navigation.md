# Navigazione dalle Notifiche Push

## Panoramica

Il sistema di notifiche push è stato esteso per supportare la navigazione automatica alla pagina ordini con apertura del bottom sheet dell'ordine specifico quando l'utente clicca su una notifica di cambio stato ordine.

## Funzionalità

### ✅ **Navigazione Automatica**
- Cliccando su una notifica di cambio stato ordine, l'app naviga automaticamente alla pagina `/orders`
- Su mobile, il bottom sheet dell'ordine si apre automaticamente
- Su web, naviga semplicemente alla pagina ordini

### ✅ **Gestione Background/Foreground**
- Funziona sia quando l'app è in background che in foreground
- Gestione automatica dei permessi per le notifiche
- Configurazione automatica del canale Android

### ✅ **Dati di Navigazione**
Le notifiche includono dati strutturati per la navigazione:
```json
{
  "type": "order_status_update",
  "orderId": "abc123",
  "navigation": {
    "screen": "orders",
    "params": {
      "openOrderId": "abc123"
    }
  }
}
```

## Implementazione

### 1. Hook Principali

#### `useNotificationNavigation`
- Gestisce il tap sulle notifiche
- Naviga automaticamente alla pagina corretta
- Supporta callback personalizzate

#### `useBackgroundNotificationHandler`
- Configura i permessi per le notifiche
- Gestisce le notifiche in background
- Fornisce funzioni di test

### 2. Flusso di Navigazione

1. **Notifica Ricevuta**: L'utente riceve una notifica di cambio stato ordine
2. **Tap sulla Notifica**: L'utente clicca sulla notifica
3. **Navigazione Automatica**: L'app naviga a `/orders?openOrderId=abc123`
4. **Apertura Bottom Sheet**: Il bottom sheet dell'ordine si apre automaticamente

### 3. Integrazione nelle Pagine

#### `orders.tsx`
```typescript
// Gestisce il parametro openOrderId
useEffect(() => {
  if (openOrderId && enrichedOrders.length > 0) {
    const orderToOpen = enrichedOrders.find(order => order.id === openOrderId);
    if (orderToOpen) {
      setSelectedOrder(orderToOpen);
      bottomSheetRef.current?.present();
    }
  }
}, [openOrderId, enrichedOrders]);
```

#### `_layout.tsx`
```typescript
// Inizializza il gestore delle notifiche
function AppContent() {
  useBackgroundNotificationHandler();
  // ...
}
```

## Configurazione

### Permessi Android
Il sistema configura automaticamente:
- Canale "Orders" con priorità alta
- Pattern di vibrazione personalizzato
- Colore LED per le notifiche

### Permessi iOS
Richiede automaticamente i permessi per:
- Notifiche push
- Badge
- Suoni

## Test

### Componente di Test
`NotificationTest` fornisce pulsanti per:
- Inviare notifiche di test
- Testare la navigazione manuale
- Verificare il funzionamento del sistema

### Log di Debug
Il sistema include log dettagliati:
```
📱 Notification received: Ordine confermato! 🎉
📱 Notification tapped: {"type":"order_status_update","orderId":"abc123"}
📱 Opening order from notification: abc123
```

## Utilizzo

### Per gli Sviluppatori
1. Le notifiche vengono inviate automaticamente dal sistema esistente
2. La navigazione è gestita automaticamente
3. Nessuna modifica necessaria al codice esistente

### Per gli Utenti
1. Ricevono notifiche per i cambi di stato ordine
2. Cliccano sulla notifica
3. L'app si apre automaticamente con l'ordine visualizzato

## Vantaggi

- ✅ **UX Migliorata**: Navigazione diretta all'ordine rilevante
- ✅ **Automatico**: Nessuna configurazione manuale richiesta
- ✅ **Robusto**: Gestione errori e fallback
- ✅ **Cross-Platform**: Funziona su iOS e Android
- ✅ **Debugging**: Log dettagliati per il monitoraggio

## Troubleshooting

### Errore "aps-environment" in Development
**Problema**: `Error: no valid "aps-environment" authorization string found for the application`

**Causa**: Le notifiche push remote richiedono un provisioning profile valido che non è disponibile in development mode.

**Soluzioni**:
1. **Usa notifiche locali per testare** (raccomandato per development)
2. **Build con EAS Build** per testare notifiche remote
3. **Usa un dispositivo fisico** con provisioning profile valido

### Notifiche Locali vs Remote
- **Locali**: Funzionano in development, non richiedono server
- **Remote**: Richiedono EAS Build o provisioning profile valido

### Notifiche non ricevute
1. Verificare i permessi dell'app
2. Controllare la configurazione del dispositivo
3. Verificare la connessione internet

### Navigazione non funziona
1. Controllare i log per errori
2. Verificare che l'ordine esista
3. Controllare la struttura dei dati della notifica

### Bottom Sheet non si apre
1. Verificare che il componente sia montato
2. Controllare i delay di apertura
3. Verificare che l'ordine sia caricato
