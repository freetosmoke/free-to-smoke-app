# Sistema di Debug Avanzato - Guida Completa

## Panoramica

Il sistema di debug avanzato fornisce strumenti completi per il monitoraggio, la diagnostica e la risoluzione dei problemi nel codice React. Include logging strutturato, monitoraggio delle performance, gestione degli errori e un'interfaccia utente avanzata.

## Caratteristiche Principali

### 🔍 **Logging Avanzato**
- 5 livelli di log: `error`, `warn`, `info`, `debug`, `trace`
- Logging strutturato con metadati
- Stack trace automatico per gli errori
- Persistenza locale dei log
- Filtri e ricerca avanzata

### ⚡ **Monitoraggio Performance**
- Timer automatici per funzioni
- Misurazione di operazioni async
- Metriche dettagliate di performance
- Identificazione di bottleneck

### 🛡️ **Gestione Errori**
- Cattura automatica di errori globali
- Gestione di promise rejections
- Callback personalizzabili per errori
- Notifiche visive per errori critici

### 📊 **Interfaccia Utente**
- Panel di debug interattivo
- Statistiche in tempo reale
- Esportazione dati (JSON/CSV)
- Configurazione dinamica

## Installazione e Setup

### 1. Importazione Base

```typescript
import { debugSystem, useDebug } from '../utils/debugSystem';
import DebugButton from '../components/DebugButton';
```

### 2. Configurazione Globale

```typescript
// Configurazione personalizzata
debugSystem.configure({
  enabled: true,
  level: 'debug',
  persistLogs: true,
  maxLogEntries: 1000,
  showStackTrace: true,
  enablePerformanceMonitoring: true
});
```

### 3. Integrazione nell'App

```tsx
function App() {
  return (
    <div className="app">
      {/* Il tuo contenuto */}
      <DebugButton position="bottom-right" />
    </div>
  );
}
```

## Utilizzo nei Componenti React

### Hook useDebug

```tsx
import { useDebug } from '../utils/debugSystem';

const MyComponent: React.FC = () => {
  const debug = useDebug('MyComponent');
  
  useEffect(() => {
    debug.info('Componente inizializzato');
  }, []);
  
  const handleClick = () => {
    debug.debug('Pulsante cliccato', { timestamp: Date.now() });
  };
  
  return <button onClick={handleClick}>Click me</button>;
};
```

### Logging Strutturato

```typescript
// Diversi livelli di log
debug.error('Errore critico', error, 'ComponentName');
debug.warn('Attenzione', { data: 'warning data' });
debug.info('Informazione', { userId: 123 });
debug.debug('Debug info', { state: componentState });
debug.trace('Trace dettagliato', { callStack: true });
```

## Monitoraggio Performance

### Timer Manuali

```typescript
// Avvia timer
debugSystem.startPerformanceTimer('operationName', { metadata: 'extra info' });

// ... operazione da misurare ...

// Termina timer
const duration = debugSystem.endPerformanceTimer('operationName');
console.log(`Operazione completata in ${duration}ms`);
```

### Wrapper Automatici

```typescript
// Per funzioni sincrone
const result = debug.measurePerformance('calculateData', () => {
  return heavyCalculation();
});

// Per funzioni asincrone
const data = await debug.measurePerformanceAsync('fetchData', async () => {
  return await api.getData();
});
```

### Decorator per Classi

```typescript
class MyService {
  @debugMethod
  async processData(data: any) {
    // Il metodo sarà automaticamente monitorato
    return processedData;
  }
}
```

## Gestione Errori Avanzata

### Callback Personalizzati

```typescript
// Registra callback per errori
debugSystem.onError((error, context) => {
  // Invia errore a servizio di monitoring
  errorReportingService.report(error, context);
  
  // Mostra notifica all'utente
  showErrorNotification(error.message);
});
```

### Logging Errori Strutturato

```typescript
try {
  await riskyOperation();
} catch (error) {
  debug.error('Operazione fallita', error, 'MyComponent');
  // L'errore viene automaticamente tracciato con stack trace
}
```

## Analisi e Statistiche

### Recupero Log Filtrati

```typescript
// Filtra log per livello
const errorLogs = debugSystem.getLogs({ level: 'error' });

// Filtra per componente
const componentLogs = debugSystem.getLogs({ component: 'HomePage' });

// Filtra per periodo
const recentLogs = debugSystem.getLogs({
  startTime: new Date(Date.now() - 3600000), // Ultima ora
  endTime: new Date()
});
```

### Statistiche Dettagliate

```typescript
const stats = debugSystem.getLogStats();
console.log({
  total: stats.total,
  errorRate: stats.errorRate,
  byLevel: stats.byLevel,
  byComponent: stats.byComponent
});
```

## Esportazione Dati

### Esportazione Programmatica

```typescript
// Esporta come JSON
const jsonData = debugSystem.exportLogs('json');

// Esporta come CSV
const csvData = debugSystem.exportLogs('csv');

// Salva su file
const blob = new Blob([jsonData], { type: 'application/json' });
const url = URL.createObjectURL(blob);
// ... logica di download
```

## Debug Condizionale

### Utility per Debug Condizionale

```typescript
import { conditionalDebug } from '../utils/debugSystem';

// Debug solo in determinate condizioni
conditionalDebug.when(isDevelopment).log('Debug info', data);
conditionalDebug.when(user.isAdmin).error('Admin error', error);
```

## Configurazione Avanzata

### Configurazione per Ambiente

```typescript
// Configurazione per sviluppo
if (process.env.NODE_ENV === 'development') {
  debugSystem.configure({
    enabled: true,
    level: 'trace',
    showStackTrace: true,
    enablePerformanceMonitoring: true
  });
}

// Configurazione per produzione
if (process.env.NODE_ENV === 'production') {
  debugSystem.configure({
    enabled: false, // Disabilita in produzione
    level: 'error', // Solo errori critici
    persistLogs: false
  });
}
```

### Configurazione Dinamica

```typescript
// Cambia configurazione a runtime
const updateDebugLevel = (level: string) => {
  debugSystem.configure({ level });
};

// Abilita/disabilita debug
const toggleDebug = (enabled: boolean) => {
  debugSystem.configure({ enabled });
};
```

## Interfaccia Utente

### Componente DebugButton

```tsx
// Posizionamento personalizzato
<DebugButton position="top-left" />
<DebugButton position="bottom-right" />

// Mostra anche in produzione (sconsigliato)
<DebugButton showInProduction={true} />
```

### Funzionalità del Panel

1. **Tab Log**: Visualizza tutti i log con filtri avanzati
2. **Tab Statistiche**: Mostra metriche e analisi
3. **Tab Configurazione**: Permette modifiche in tempo reale

### Filtri Disponibili

- **Livello**: Filtra per livello di log
- **Componente**: Filtra per componente specifico
- **Ricerca**: Cerca nel testo dei messaggi
- **Periodo**: Filtra per intervallo temporale

## Best Practices

### 1. Naming Convention

```typescript
// Usa nomi descrittivi per i componenti
const debug = useDebug('UserProfileForm');
const debug = useDebug('PaymentProcessor');
const debug = useDebug('DataVisualization');
```

### 2. Livelli di Log Appropriati

```typescript
// ERROR: Solo per errori critici
debug.error('Database connection failed', error);

// WARN: Per situazioni anomale ma gestibili
debug.warn('API response slow', { responseTime: 5000 });

// INFO: Per eventi importanti
debug.info('User logged in', { userId: user.id });

// DEBUG: Per informazioni di sviluppo
debug.debug('Component state updated', { newState });

// TRACE: Per debugging dettagliato
debug.trace('Function called', { args, context });
```

### 3. Dati Strutturati

```typescript
// Buono: Dati strutturati
debug.info('Order processed', {
  orderId: order.id,
  amount: order.total,
  userId: user.id,
  timestamp: Date.now()
});

// Evita: Stringhe non strutturate
debug.info(`Order ${order.id} processed for user ${user.id}`);
```

### 4. Performance Monitoring

```typescript
// Monitora operazioni critiche
const result = await debug.measurePerformanceAsync('criticalOperation', async () => {
  return await heavyDatabaseQuery();
});

// Monitora rendering di componenti pesanti
const renderedComponent = debug.measurePerformance('renderHeavyComponent', () => {
  return <HeavyComponent data={largeDataset} />;
});
```

### 5. Gestione Errori

```typescript
// Sempre loggare errori con contesto
try {
  await riskyOperation();
} catch (error) {
  debug.error('Operation failed', error, {
    operation: 'riskyOperation',
    userId: currentUser?.id,
    timestamp: Date.now(),
    context: additionalContext
  });
  throw error; // Re-throw se necessario
}
```

## Troubleshooting

### Problemi Comuni

1. **Log non visibili**: Verifica che `enabled: true` nella configurazione
2. **Performance timer non funziona**: Assicurati che `enablePerformanceMonitoring: true`
3. **Log non persistiti**: Controlla che `persistLogs: true` e che localStorage sia disponibile
4. **Troppi log**: Riduci il livello di log o aumenta `maxLogEntries`

### Debug del Sistema di Debug

```typescript
// Verifica configurazione corrente
console.log('Debug config:', debugSystem.getConfig());

// Verifica statistiche
console.log('Debug stats:', debugSystem.getLogStats());

// Test del sistema
debugSystem.debug('Test message', { test: true });
```

## Esempi Pratici

### Esempio 1: Form con Validazione

```tsx
const ContactForm: React.FC = () => {
  const debug = useDebug('ContactForm');
  const [formData, setFormData] = useState({});
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    debug.info('Form submission started', { formData });
    
    try {
      const result = await debug.measurePerformanceAsync('submitForm', async () => {
        return await api.submitContact(formData);
      });
      
      debug.info('Form submitted successfully', { result });
    } catch (error) {
      debug.error('Form submission failed', error, { formData });
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* form fields */}
    </form>
  );
};
```

### Esempio 2: Data Fetching con Cache

```tsx
const useDataFetcher = (url: string) => {
  const debug = useDebug('DataFetcher');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      debug.info('Starting data fetch', { url });
      setLoading(true);
      
      try {
        const result = await debug.measurePerformanceAsync('fetchData', async () => {
          const response = await fetch(url);
          return response.json();
        });
        
        setData(result);
        debug.info('Data fetch successful', { url, dataSize: JSON.stringify(result).length });
      } catch (error) {
        debug.error('Data fetch failed', error, { url });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [url]);
  
  return { data, loading };
};
```

## Integrazione con Altri Strumenti

### Sentry Integration

```typescript
debugSystem.onError((error, context) => {
  Sentry.captureException(error, {
    tags: {
      component: context?.component,
      level: 'error'
    },
    extra: context
  });
});
```

### Analytics Integration

```typescript
debugSystem.onError((error, context) => {
  analytics.track('Error Occurred', {
    error: error.message,
    component: context?.component,
    timestamp: Date.now()
  });
});
```

## Conclusione

Il sistema di debug avanzato fornisce tutti gli strumenti necessari per:

- ✅ Identificare rapidamente problemi nel codice
- ✅ Monitorare le performance dell'applicazione
- ✅ Tracciare il comportamento degli utenti
- ✅ Analizzare errori e anomalie
- ✅ Ottimizzare l'esperienza di sviluppo

Utilizza questo sistema per migliorare la qualità del codice e accelerare il processo di debugging e ottimizzazione.