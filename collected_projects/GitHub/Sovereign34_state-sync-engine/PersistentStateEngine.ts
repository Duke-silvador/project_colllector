// PersistentStateEngine.ts
//
// Playwright tabanlı, IResourceAdapter'ı dışarıdan alan jenerik ve uzun ömürlü
// state-gözlem motoru. Ağ trafiği, WebSocket frame'leri ve DOM mutasyonlarını
// dinler; sinyalleri adapter üzerinden StatePayload'a çevirir, doğrular ve
// dışarı event olarak yayınlar. HTTP tabanlı anomalileri (rate limit, 401/403)
// otomatik algılar; site-özel anomalileri (ör. CHALLENGE_DETECTED) dışarıdan
// reportAnomaly() ile kabul eder.

import { EventEmitter } from 'node:events';
import type { Page, Response, WebSocket as PlaywrightWebSocket } from 'playwright';
import type { IResourceAdapter } from './IResourceAdapter';
import type {
  AnomalyPayload,
  AnomalyType,
  ObserverStatus,
  SignalSource,
  StatePayload,
} from './IStateObserver';

export interface PersistentStateEngineConfig {
  /** Fallback polling aralığı (ms). Varsayılan: 5000 */
  pollIntervalMs?: number;
  /** THROTTLED durumunda ilk backoff süresi (ms). Varsayılan: 2000 */
  throttleBackoffBaseMs?: number;
  /** Backoff'un ulaşabileceği üst sınır (ms). Varsayılan: 60000 */
  throttleBackoffMaxMs?: number;
  /** Bu sayıya ulaşan ardışık anomali QUARANTINED'a geçirir. Varsayılan: 5 */
  maxConsecutiveAnomalies?: number;
  /** QUARANTINED durumunda bekleme süresi (ms). Varsayılan: 30000 */
  quarantineCooldownMs?: number;
  /** Bu eşiğin altındaki confidenceScore'lu payload'lar yok sayılır. Varsayılan: 0.5 */
  minConfidenceScore?: number;
  /** Fallback polling açık mı. Varsayılan: true */
  enableFallbackPolling?: boolean;
  /** DOM mutasyon sinyallerinin debounce süresi (ms). Varsayılan: 750 */
  domObservationDebounceMs?: number;
}

const DEFAULT_CONFIG: Required<PersistentStateEngineConfig> = {
  pollIntervalMs: 5_000,
  throttleBackoffBaseMs: 2_000,
  throttleBackoffMaxMs: 60_000,
  maxConsecutiveAnomalies: 5,
  quarantineCooldownMs: 30_000,
  minConfidenceScore: 0.5,
  enableFallbackPolling: true,
  domObservationDebounceMs: 750,
};

export interface PersistentStateEngineEvents {
  state: (payload: StatePayload) => void;
  anomaly: (payload: AnomalyPayload) => void;
  statusChange: (previous: ObserverStatus, current: ObserverStatus) => void;
  error: (error: Error) => void;
}

/** EventEmitter'ı olay isimleri/imzaları üzerinde tip güvenli hale getiren ince sarmalayıcı arayüz. */
export declare interface PersistentStateEngine<TAdapter extends IResourceAdapter = IResourceAdapter> {
  on<E extends keyof PersistentStateEngineEvents>(event: E, listener: PersistentStateEngineEvents[E]): this;
  once<E extends keyof PersistentStateEngineEvents>(event: E, listener: PersistentStateEngineEvents[E]): this;
  off<E extends keyof PersistentStateEngineEvents>(event: E, listener: PersistentStateEngineEvents[E]): this;
  emit<E extends keyof PersistentStateEngineEvents>(
    event: E,
    ...args: Parameters<PersistentStateEngineEvents[E]>
  ): boolean;
}

export class PersistentStateEngine<TAdapter extends IResourceAdapter = IResourceAdapter> extends EventEmitter {
  private readonly adapter: TAdapter;
  private readonly page: Page;
  private readonly config: Required<PersistentStateEngineConfig>;
  private readonly matchPatterns: string[];
  private readonly compiledPatterns: RegExp[];

  private status: ObserverStatus = 'IDLE';
  private disposed = false;

  private consecutiveAnomalies = 0;
  private currentBackoffMs: number;

  private pollTimer: NodeJS.Timeout | null = null;
  private quarantineTimer: NodeJS.Timeout | null = null;
  private domDebounceTimer: NodeJS.Timeout | null = null;

  private readonly domBridgeName: string;
  private readonly handleResponse: (response: Response) => void;
  private readonly handleWebSocket: (ws: PlaywrightWebSocket) => void;
  private readonly handleLoad: () => void;

  constructor(adapter: TAdapter, page: Page, config: PersistentStateEngineConfig = {}) {
    super();
    this.adapter = adapter;
    this.page = page;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.matchPatterns = adapter.getMatchPatterns();
    this.compiledPatterns = this.matchPatterns.map((p) => this.compilePattern(p));
    this.currentBackoffMs = this.config.throttleBackoffBaseMs;
    this.domBridgeName = `__pse_domSignal_${this.sanitizeId(adapter.id)}`;

    this.handleResponse = (response) => {
      void this.onNetworkResponse(response);
    };
    this.handleWebSocket = (ws) => this.onWebSocket(ws);
    this.handleLoad = () => {
      void this.attachDomObservation();
    };
  }

  // ---------------------------------------------------------------------
  // Yaşam döngüsü
  // ---------------------------------------------------------------------

  async start(): Promise<void> {
    if (this.disposed) {
      throw new Error(`[PersistentStateEngine:${this.adapter.id}] dispose edilmiş örnek yeniden başlatılamaz.`);
    }
    if (this.status === 'LISTENING' || this.status === 'THROTTLED') {
      return;
    }

    this.page.on('response', this.handleResponse);
    this.page.on('websocket', this.handleWebSocket);
    this.page.on('load', this.handleLoad);

    await this.attachDomObservation();

    if (this.config.enableFallbackPolling) {
      this.schedulePoll();
    }

    this.transitionStatus('LISTENING');
  }

  async stop(): Promise<void> {
    if (this.status === 'STOPPED') return;

    this.page.off('response', this.handleResponse);
    this.page.off('websocket', this.handleWebSocket);
    this.page.off('load', this.handleLoad);

    this.clearPollTimer();
    this.clearQuarantineTimer();
    if (this.domDebounceTimer) {
      clearTimeout(this.domDebounceTimer);
      this.domDebounceTimer = null;
    }

    await this.detachDomObservation();
    this.transitionStatus('STOPPED');
  }

  dispose(): void {
    void this.stop();
    this.disposed = true;
    this.removeAllListeners();
  }

  getStatus(): ObserverStatus {
    return this.status;
  }

  /** Adapter/dış kod tarafından tespit edilen (ör. CHALLENGE_DETECTED gibi site-özel) anomalileri bildirir. */
  reportAnomaly(anomaly: AnomalyPayload): void {
    this.handleAnomaly(anomaly);
  }

  // ---------------------------------------------------------------------
  // Ağ / WebSocket sinyalleri
  // ---------------------------------------------------------------------

  private async onNetworkResponse(response: Response): Promise<void> {
    if (this.status !== 'LISTENING') return;

    const url = response.url();
    if (!this.matchesPattern(url)) return;

    const anomaly = this.detectHttpAnomaly(response);
    if (anomaly) {
      this.handleAnomaly(anomaly);
      return;
    }

    try {
      const contentType = response.headers()['content-type'] ?? '';
      const rawPayload: unknown = contentType.includes('application/json')
        ? await response.json()
        : await response.text();

      const payload = this.adapter.parseNetworkPayload(url, rawPayload);
      this.ingestPayload(payload);
    } catch (err) {
      this.emitSafeError(err);
    }
  }

  private onWebSocket(ws: PlaywrightWebSocket): void {
    if (!this.matchesPattern(ws.url())) return;

    ws.on('framereceived', (frame) => {
      if (this.status !== 'LISTENING') return;
      try {
        const raw =
          typeof frame.payload === 'string' ? frame.payload : frame.payload.toString('utf-8');
        let parsed: unknown = raw;
        try {
          parsed = JSON.parse(raw);
        } catch {
          // JSON değilse ham metin olarak bırakılır; adapter kendi ayrıştırmasını yapar.
        }
        const payload = this.adapter.parseNetworkPayload(ws.url(), parsed);
        this.ingestPayload(payload);
      } catch (err) {
        this.emitSafeError(err);
      }
    });
  }

  // ---------------------------------------------------------------------
  // DOM gözlemi
  // ---------------------------------------------------------------------

  private async attachDomObservation(): Promise<void> {
    try {
      await this.page.exposeFunction(this.domBridgeName, () => {
        this.scheduleDomInspection();
      }).catch(() => {
        // Fonksiyon zaten bu context'e (navigasyon sonrası dünya) bağlanmış olabilir; yok say.
      });

      await this.page.evaluate((fnName: string) => {
        const w = window as unknown as Record<string, () => void> & { __pseObserver?: MutationObserver };
        w.__pseObserver?.disconnect();
        const observer = new MutationObserver(() => {
          w[fnName]?.();
        });
        const target = document.documentElement ?? document.body;
        if (target) {
          observer.observe(target, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true,
          });
        }
        w.__pseObserver = observer;
      }, this.domBridgeName);
    } catch (err) {
      // Navigasyon sırasında sayfa geçici olarak kullanılamaz durumda olabilir; sonraki 'load' yeniden dener.
      this.emitSafeError(err);
    }
  }

  private async detachDomObservation(): Promise<void> {
    try {
      await this.page.evaluate(() => {
        const w = window as unknown as { __pseObserver?: MutationObserver };
        w.__pseObserver?.disconnect();
        delete w.__pseObserver;
      });
    } catch {
      // Sayfa zaten kapanmış/navigasyon olmuş olabilir; sessizce geç.
    }
  }

  private scheduleDomInspection(): void {
    if (this.domDebounceTimer) return;
    this.domDebounceTimer = setTimeout(() => {
      this.domDebounceTimer = null;
      void this.runDomInspection();
    }, this.config.domObservationDebounceMs);
  }

  private async runDomInspection(): Promise<void> {
    if (this.status !== 'LISTENING') return;
    try {
      const payload = await this.adapter.inspectDomState(this.page);
      this.ingestPayload(payload, 'DOM_DELTA');
    } catch (err) {
      this.emitSafeError(err);
    }
  }

  // ---------------------------------------------------------------------
  // Fallback polling
  // ---------------------------------------------------------------------

  private schedulePoll(): void {
    this.clearPollTimer();
    const delay = this.status === 'THROTTLED' ? this.currentBackoffMs : this.config.pollIntervalMs;

    this.pollTimer = setTimeout(async () => {
      this.pollTimer = null;
      if (this.status === 'LISTENING' || this.status === 'THROTTLED') {
        try {
          const payload = await this.adapter.inspectDomState(this.page);
          this.ingestPayload(payload, 'FALLBACK_POLL');
        } catch (err) {
          this.emitSafeError(err);
        }
        this.schedulePoll();
      }
    }, delay);
  }

  private clearPollTimer(): void {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  // ---------------------------------------------------------------------
  // Payload / anomali işleme
  // ---------------------------------------------------------------------

  private ingestPayload(payload: StatePayload | null, forcedSource?: SignalSource): void {
    if (!payload) return;
    if (payload.confidenceScore < this.config.minConfidenceScore) return;
    if (!this.adapter.validateState(payload)) return;

    this.consecutiveAnomalies = 0;
    this.currentBackoffMs = this.config.throttleBackoffBaseMs;
    if (this.status === 'THROTTLED') {
      this.transitionStatus('LISTENING');
    }

    const finalPayload = forcedSource ? { ...payload, source: forcedSource } : payload;
    this.emit('state', finalPayload);
  }

  private detectHttpAnomaly(response: Response): AnomalyPayload | null {
    const status = response.status();
    let type: AnomalyType | null = null;

    if (status === 429) type = 'RATE_LIMIT_EXCEEDED';
    else if (status === 401) type = 'SESSION_EXPIRED';
    else if (status === 403) type = 'ACCESS_RESTRICTED';

    if (!type) return null;

    return {
      type,
      timestamp: new Date().toISOString(),
      statusCode: status,
      details: { url: response.url() },
    };
  }

  private handleAnomaly(anomaly: AnomalyPayload): void {
    this.emit('anomaly', anomaly);
    this.consecutiveAnomalies += 1;

    if (this.consecutiveAnomalies >= this.config.maxConsecutiveAnomalies) {
      this.enterQuarantine();
      return;
    }

    if (anomaly.type === 'RATE_LIMIT_EXCEEDED') {
      this.currentBackoffMs = Math.min(this.currentBackoffMs * 2, this.config.throttleBackoffMaxMs);
      this.transitionStatus('THROTTLED');
      this.schedulePoll();
      return;
    }

    // SESSION_EXPIRED, ACCESS_RESTRICTED, CHALLENGE_DETECTED: doğrudan karantinaya al.
    this.enterQuarantine();
  }

  private enterQuarantine(): void {
    this.transitionStatus('QUARANTINED');
    this.clearPollTimer();
    this.clearQuarantineTimer();

    this.quarantineTimer = setTimeout(() => {
      this.quarantineTimer = null;
      this.consecutiveAnomalies = 0;
      this.currentBackoffMs = this.config.throttleBackoffBaseMs;

      if (!this.disposed && this.status === 'QUARANTINED') {
        this.transitionStatus('LISTENING');
        if (this.config.enableFallbackPolling) {
          this.schedulePoll();
        }
      }
    }, this.config.quarantineCooldownMs);
  }

  private clearQuarantineTimer(): void {
    if (this.quarantineTimer) {
      clearTimeout(this.quarantineTimer);
      this.quarantineTimer = null;
    }
  }

  // ---------------------------------------------------------------------
  // Yardımcılar
  // ---------------------------------------------------------------------

  private transitionStatus(next: ObserverStatus): void {
    const previous = this.status;
    if (previous === next) return;
    this.status = next;
    this.emit('statusChange', previous, next);
  }

  private compilePattern(pattern: string): RegExp {
    const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
    return new RegExp(`^${escaped}$`);
  }

  private matchesPattern(url: string): boolean {
    return this.compiledPatterns.some((regex) => regex.test(url)) || this.matchPatterns.some((p) => url.includes(p));
  }

  private sanitizeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private emitSafeError(err: unknown): void {
    const error = err instanceof Error ? err : new Error(String(err));
    if (this.listenerCount('error') > 0) {
      this.emit('error', error);
    } else {
      // Node'un EventEmitter'ı dinleyicisiz 'error' event'inde exception fırlatır;
      // burada konsola düşürerek sessiz çökmeyi engelliyoruz.
      // eslint-disable-next-line no-console
      console.error(`[PersistentStateEngine:${this.adapter.id}]`, error);
    }
  }
}
