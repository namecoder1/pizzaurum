# Sistema di Invio Email di Acquisto

## Panoramica

Il sistema di invio email di acquisto è stato completamente riprogettato per prevenire l'invio di email duplicate e garantire che ogni ordine riceva una sola email di conferma.

## Problema Risolto

Prima della riprogettazione, le email venivano inviate da molteplici punti dell'applicazione:
- `checkout.tsx` - invio immediato dopo creazione ordine
- `mobile-cart.tsx` - invio immediato dopo creazione ordine
- `orders.tsx` - invio per l'ordine più recente quando si carica la pagina
- `[id].tsx` - invio quando si visualizza il dettaglio dell'ordine

Questo causava **invii multipli** della stessa email di conferma.

## Soluzione Implementata

### 1. Hook Centralizzati

#### `usePurchaseEmailManager`
- Gestisce l'invio delle email per le pagine di visualizzazione ordini
- Mantiene una cache degli ordini già processati nella sessione
- Previene race conditions con `useRef`
- Aggiorna immediatamente il campo `is_email_sent` nel database

#### `useImmediatePurchaseEmail`
- Gestisce l'invio immediato delle email dopo la creazione dell'ordine
- Utilizzato nei componenti di checkout
- Controlla sempre lo stato del database prima dell'invio

### 2. Strategia di Prevenzione Duplicati

#### Controllo Database
```typescript
// Controlla sempre se l'email è già stata inviata
const { data: orderData } = await supabase
  .from("orders")
  .select("is_email_sent")
  .eq("id", orderId)
  .single();

if (orderData?.is_email_sent === true) {
  return true; // Email già inviata, salta
}
```

#### Aggiornamento Immediato
```typescript
// Marca immediatamente come "in invio" per prevenire race conditions
await supabase
  .from("orders")
  .update({ is_email_sent: true })
  .eq("id", orderId)
  .eq("is_email_sent", false); // Solo se non già inviata
```

#### Gestione Errori
```typescript
// Se l'invio fallisce, ripristina il flag
if (emailError) {
  await supabase
    .from("orders")
    .update({ is_email_sent: false })
    .eq("id", orderId);
}
```

### 3. Flusso di Invio

#### Ordini Web (checkout.tsx)
1. Ordine creato
2. `useImmediatePurchaseEmail` invia email immediatamente
3. Campo `is_email_sent` aggiornato a `true`

#### Ordini Mobile (mobile-cart.tsx)
1. Ordine creato
2. `useImmediatePurchaseEmail` invia email immediatamente
3. Campo `is_email_sent` aggiornato a `true`

#### Pagina Ordini (orders.tsx)
1. Caricamento pagina
2. `usePurchaseEmailManager` controlla ordine più recente
3. Se `is_email_sent = false`, invia email
4. Se `is_email_sent = true`, salta completamente

#### Dettaglio Ordine ([id].tsx)
1. Caricamento pagina
2. `usePurchaseEmailManager` controlla ordine specifico
3. Se `is_email_sent = false`, invia email
4. Se `is_email_sent = true`, salta completamente

## Vantaggi

1. **Nessun Duplicato**: Ogni ordine riceve una sola email
2. **Robustezza**: Gestione errori e rollback automatico
3. **Performance**: Cache locale per evitare controlli ridondanti
4. **Scalabilità**: Sistema centralizzato facilmente estendibile
5. **Debugging**: Log dettagliati per tracciare il flusso

## Monitoraggio

Il sistema include log dettagliati per monitorare:
- Tentativi di invio email
- Email già inviate (skipped)
- Errori di invio
- Rollback automatici
- Race conditions prevenute

## Esempio di Log

```
📧 Email not sent yet for order abc123, proceeding with send...
✅ Purchase confirmation email sent successfully for order abc123
📧 Email already sent for order abc123, SKIPPING COMPLETELY...
🔄 Reverted is_email_sent flag for order abc123 due to email failure
```
