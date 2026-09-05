/**
 * IStateObserver.ts
 *
 * Jenerik, event-driven state observation mimarisi için tip tanımları.
 * Bu dosya herhangi bir domain'e özgü bilgi içermez; tamamen soyut
 * mühendislik kavramlarıyla ifade edilmiştir.
 */

/**
 * Bir durum sinyalinin hangi kaynaktan geldiğini belirtir.
 */
export type SignalSource =
  | 'NETWORK_XHR'
  | 'WEBSOCKET'
  | 'DOM_DELTA'
  | 'FALLBACK_POLL';

/**
 * Bir observer'ın o anki operasyonel durumu.
 */
export type ObserverStatus =
  | 'IDLE'
  | 'LISTENING'
  | 'THROTTLED'
  | 'QUARANTINED'
  | 'STOPPED';

/**
 * Observer tarafından yakalanan tekil bir durum anlık görüntüsü (snapshot).
 */
export interface StatePayload {
  /** Bu payload'a ait benzersiz tanımlayıcı. */
  id: string;
  /** ISO 8601 formatında zaman damgası. */
  timestamp: string;
  /** Payload'ın hangi sinyal kaynağından üretildiği. */
  source: SignalSource;
  /** Payload'ın güvenilirliğine dair 0-1 arası (veya tanımlı skala) skor. */
  confidenceScore: number;
  /** Kaynağa özgü, tipsiz ham veya yarı-yapılandırılmış veri. */
  data: Record<string, unknown>;
}

/**
 * Gözlem sürecinde tespit edilebilecek anomali türleri.
 */
export type AnomalyType =
  | 'RATE_LIMIT_EXCEEDED'
  | 'ACCESS_RESTRICTED'
  | 'SESSION_EXPIRED'
  | 'CHALLENGE_DETECTED';

/**
 * Bir anomalinin tüm bağlamsal bilgisini taşıyan payload.
 */
export interface AnomalyPayload {
  /** Anomalinin türü. */
  type: AnomalyType;
  /** ISO 8601 formatında zaman damgası. */
  timestamp: string;
  /** İlgili ise, alınan HTTP/protokol durum kodu. */
  statusCode?: number;
  /** Anomaliye dair ek, tipsiz bağlamsal veri. */
  details?: Record<string, unknown>;
}

/**
 * Bir state observer'ın yayınlayabileceği event türlerinin haritası.
 * Jenerik bir event-emitter/observer implementasyonunda
 * `on<K extends keyof StateObserverEventMap>(event: K, handler: ...)`
 * şeklinde kullanılmak üzere tasarlanmıştır.
 */
export interface StateObserverEventMap {
  state: StatePayload;
  anomaly: AnomalyPayload;
  statusChange: ObserverStatus;
}

/**
 * Jenerik bir state observer sözleşmesi (contract).
 * `TPayload`, bu observer'ın ürettiği durum verisinin şeklini
 * (StatePayload'ın `data` alanını) özelleştirmek için kullanılabilir.
 */
export interface IStateObserver<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  /** Observer'ın mevcut operasyonel durumu. */
  readonly status: ObserverStatus;

  /** Gözlemi başlatır. */
  start(): void;

  /** Gözlemi durdurur. */
  stop(): void;

  /**
   * Belirtilen event türü için bir dinleyici (listener) kaydeder.
   */
  on<K extends keyof StateObserverEventMap>(
    event: K,
    handler: (payload: K extends 'state' ? StatePayload & { data: TPayload } : StateObserverEventMap[K]) => void
  ): void;

  /**
   * Belirtilen event türü için önceden kaydedilmiş bir dinleyiciyi kaldırır.
   */
  off<K extends keyof StateObserverEventMap>(
    event: K,
    handler: (payload: K extends 'state' ? StatePayload & { data: TPayload } : StateObserverEventMap[K]) => void
  ): void;
}
