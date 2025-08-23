import {
  clearQueryCache,
  getOrdersOptimized,
  getOrdersOptimizedWithCache,
  getOrderStats,
  getOrdersWithCursor,
  getOrdersWithProducts
} from '@/lib/optimized-queries';
import { printLog } from '@/lib/utils';

// ============================================================================
// TEST PERFORMANCE QUERY OTTIMIZZATE
// ============================================================================

interface PerformanceTestResult {
  testName: string;
  duration: number;
  dataSize: number;
  cacheHit?: boolean;
  error?: string;
}

export class PerformanceTester {
  private results: PerformanceTestResult[] = [];

  // Test singolo
  private async runTest<T>(
    testName: string,
    testFunction: () => Promise<T>
  ): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    
    try {
      const result = await testFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const dataSize = Array.isArray(result) ? result.length : 1;
      
      const testResult: PerformanceTestResult = {
        testName,
        duration,
        dataSize
      };
      
      this.results.push(testResult);
      printLog(`✅ ${testName}: ${duration.toFixed(2)}ms (${dataSize} items)`);
      
      return testResult;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      const testResult: PerformanceTestResult = {
        testName,
        duration,
        dataSize: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      
      this.results.push(testResult);
      printLog(`❌ ${testName}: ${duration.toFixed(2)}ms - ERROR: ${testResult.error}`, true);
      
      return testResult;
    }
  }

  // Test query ordini ottimizzate
  async testOptimizedOrders(userId?: string) {
    await this.runTest(
      'Query ordini ottimizzate (prima pagina)',
      () => getOrdersOptimized(
        userId ? { userId } : {},
        { page: 1, limit: 10 }
      )
    );

    await this.runTest(
      'Query ordini ottimizzate (seconda pagina)',
      () => getOrdersOptimized(
        userId ? { userId } : {},
        { page: 2, limit: 10 }
      )
    );

    await this.runTest(
      'Query ordini con filtri',
      () => getOrdersOptimized(
        userId ? { userId, status: 'pending' } : { status: 'pending' },
        { page: 1, limit: 5 }
      )
    );
  }

  // Test query con prodotti
  async testOrdersWithProducts(userId?: string) {
    await this.runTest(
      'Query ordini con prodotti completi',
      () => getOrdersWithProducts(
        userId ? { userId } : {},
        { page: 1, limit: 5 }
      )
    );
  }

  // Test cursor-based pagination
  async testCursorPagination(userId?: string) {
    await this.runTest(
      'Query cursor-based pagination',
      () => getOrdersWithCursor(
        undefined,
        20,
        userId ? { userId } : {}
      )
    );
  }

  // Test caching
  async testCaching() {
    // Prima chiamata (cache miss)
    await this.runTest(
      'Query con cache (prima chiamata)',
      () => getOrdersOptimizedWithCache(
        { status: 'pending' },
        { page: 1, limit: 10 },
        'test_cache_key'
      )
    );

    // Seconda chiamata (cache hit)
    await this.runTest(
      'Query con cache (seconda chiamata)',
      () => getOrdersOptimizedWithCache(
        { status: 'pending' },
        { page: 1, limit: 10 },
        'test_cache_key'
      )
    );
  }

  // Test statistiche
  async testStats(userId?: string) {
    await this.runTest(
      'Query statistiche ordini',
      () => getOrderStats(userId)
    );
  }

  // Test completo
  async runAllTests(userId?: string) {
    printLog('🚀 Iniziando test performance query ottimizzate...');
    
    // Pulisci cache prima dei test
    clearQueryCache();
    
    // Esegui tutti i test
    await this.testOptimizedOrders(userId);
    await this.testOrdersWithProducts(userId);
    await this.testCursorPagination(userId);
    await this.testCaching();
    await this.testStats(userId);
    
    // Test aggiuntivi per query globali (senza user ID)
    if (!userId) {
      await this.testGlobalQueries();
    }
    
    // Genera report
    this.generateReport();
  }

  // Test per query globali (admin)
  async testGlobalQueries() {
    await this.runTest(
      'Query ordini globali (admin)',
      () => getOrdersOptimized(
        {},
        { page: 1, limit: 10 }
      )
    );

    await this.runTest(
      'Query ordini per status globale',
      () => getOrdersOptimized(
        { status: 'pending' },
        { page: 1, limit: 10 }
      )
    );

    await this.runTest(
      'Query ordini per delivery globale',
      () => getOrdersOptimized(
        { isDelivery: true },
        { page: 1, limit: 10 }
      )
    );

    await this.runTest(
      'Query ordini recenti (ultimi 7 giorni)',
      () => getOrdersOptimized(
        { 
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() 
        },
        { page: 1, limit: 10 }
      )
    );
  }

  // Genera report delle performance
  generateReport() {
    printLog('\n📊 REPORT PERFORMANCE QUERY OTTIMIZZATE');
    printLog('==========================================');
    
    const successfulTests = this.results.filter(r => !r.error);
    const failedTests = this.results.filter(r => r.error);
    
    if (successfulTests.length > 0) {
      const avgDuration = successfulTests.reduce((sum, r) => sum + r.duration, 0) / successfulTests.length;
      const minDuration = Math.min(...successfulTests.map(r => r.duration));
      const maxDuration = Math.max(...successfulTests.map(r => r.duration));
      
      printLog(`✅ Test completati: ${successfulTests.length}/${this.results.length}`);
      printLog(`⏱️  Durata media: ${avgDuration.toFixed(2)}ms`);
      printLog(`⚡ Durata minima: ${minDuration.toFixed(2)}ms`);
      printLog(`🐌 Durata massima: ${maxDuration.toFixed(2)}ms`);
      
      // Ordina per durata
      const sortedTests = [...successfulTests].sort((a, b) => a.duration - b.duration);
      
      printLog('\n🏆 TOP 5 QUERY PIÙ VELOCI:');
      sortedTests.slice(0, 5).forEach((test, index) => {
        printLog(`${index + 1}. ${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
      
      printLog('\n🐌 TOP 5 QUERY PIÙ LENTE:');
      sortedTests.slice(-5).reverse().forEach((test, index) => {
        printLog(`${index + 1}. ${test.testName}: ${test.duration.toFixed(2)}ms`);
      });
    }
    
    if (failedTests.length > 0) {
      printLog(`\n❌ Test falliti: ${failedTests.length}`);
      failedTests.forEach(test => {
        printLog(`- ${test.testName}: ${test.error}`, true);
      });
    }
    
    // Raccomandazioni
    this.generateRecommendations();
  }

  // Genera raccomandazioni basate sui risultati
  generateRecommendations() {
    printLog('\n💡 RACCOMANDAZIONI:');
    
    const slowQueries = this.results.filter(r => r.duration > 100 && !r.error);
    const fastQueries = this.results.filter(r => r.duration < 50 && !r.error);
    
    if (slowQueries.length > 0) {
      printLog('⚠️  Query lente (>100ms) rilevate:');
      slowQueries.forEach(query => {
        printLog(`- ${query.testName}: ${query.duration.toFixed(2)}ms`);
        printLog(`  → Considera l'implementazione di indici specifici`);
        printLog(`  → Valuta l'uso di caching per questa query`);
      });
    }
    
    if (fastQueries.length > 0) {
      printLog('✅ Query veloci (<50ms) rilevate:');
      fastQueries.forEach(query => {
        printLog(`- ${query.testName}: ${query.duration.toFixed(2)}ms`);
      });
    }
    
    const avgDuration = this.results
      .filter(r => !r.error)
      .reduce((sum, r) => sum + r.duration, 0) / this.results.filter(r => !r.error).length;
    
    if (avgDuration < 50) {
      printLog('🎉 Performance eccellenti! Le query sono ottimizzate.');
    } else if (avgDuration < 100) {
      printLog('👍 Performance buone. Considera ulteriori ottimizzazioni per query specifiche.');
    } else {
      printLog('⚠️  Performance da migliorare. Implementa gli indici database e ottimizza le query lente.');
    }
  }

  // Pulisci risultati
  clearResults() {
    this.results = [];
  }

  // Ottieni risultati
  getResults(): PerformanceTestResult[] {
    return [...this.results];
  }
}

// ============================================================================
// FUNZIONI DI UTILITY PER TEST
// ============================================================================

// Test rapido delle performance
export async function quickPerformanceTest(userId?: string) {
  const tester = new PerformanceTester();
  await tester.runAllTests(userId);
  return tester.getResults();
}

// Test comparativo tra query vecchie e nuove
export async function compareQueryPerformance(userId?: string) {
  printLog('🔄 Test comparativo performance query...');
  
  const { supabaseClient } = await import('@/lib/supabase-manager');
  
  // Test query vecchia (SELECT *)
  const oldQueryStart = performance.now();
  try {
    const supabase = supabaseClient();
    await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20);
  } catch (error) {
    printLog('❌ Errore query vecchia:', error, true);
  }
  const oldQueryEnd = performance.now();
  const oldQueryDuration = oldQueryEnd - oldQueryStart;
  
  // Test query nuova (ottimizzata)
  const newQueryStart = performance.now();
  try {
    await getOrdersOptimized(
      { userId },
      { page: 1, limit: 20 }
    );
  } catch (error) {
    printLog('❌ Errore query nuova:', error, true);
  }
  const newQueryEnd = performance.now();
  const newQueryDuration = newQueryEnd - newQueryStart;
  
  // Calcola miglioramento
  const improvement = ((oldQueryDuration - newQueryDuration) / oldQueryDuration) * 100;
  
  printLog('\n📊 COMPARAZIONE PERFORMANCE:');
  printLog(`Query vecchia (SELECT *): ${oldQueryDuration.toFixed(2)}ms`);
  printLog(`Query nuova (ottimizzata): ${newQueryDuration.toFixed(2)}ms`);
  printLog(`Miglioramento: ${improvement.toFixed(1)}%`);
  
  if (improvement > 0) {
    printLog('✅ La query ottimizzata è più veloce!');
  } else {
    printLog('⚠️  La query ottimizzata non mostra miglioramenti significativi.');
  }
  
  return {
    oldQueryDuration,
    newQueryDuration,
    improvement
  };
}

// Test stress con multiple chiamate
export async function stressTest(iterations: number = 10, userId?: string) {
  printLog(`🔥 Stress test con ${iterations} iterazioni...`);
  
  const durations: number[] = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    try {
      await getOrdersOptimized(
        { userId },
        { page: 1, limit: 20 }
      );
    } catch (error) {
      printLog(`❌ Errore iterazione ${i + 1}:`, error, true);
    }
    const end = performance.now();
    durations.push(end - start);
    
    // Pausa breve tra le chiamate
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);
  
  printLog('\n📊 RISULTATI STRESS TEST:');
  printLog(`Durata media: ${avgDuration.toFixed(2)}ms`);
  printLog(`Durata minima: ${minDuration.toFixed(2)}ms`);
  printLog(`Durata massima: ${maxDuration.toFixed(2)}ms`);
  printLog(`Deviazione: ${((maxDuration - minDuration) / avgDuration * 100).toFixed(1)}%`);
  
  return {
    durations,
    avgDuration,
    minDuration,
    maxDuration
  };
}
