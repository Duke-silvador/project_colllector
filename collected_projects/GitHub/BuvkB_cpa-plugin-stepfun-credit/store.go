package main

import (
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Metric 一次请求的用量记账
type Metric struct {
	At            time.Time `json:"at"`
	Model         string    `json:"model"`
	Alias         string    `json:"alias,omitempty"`
	Source        string    `json:"source,omitempty"`
	InputTokens   int64     `json:"input_tokens"`
	CacheRead     int64     `json:"cache_read_tokens"`
	CacheCreation int64     `json:"cache_creation_tokens"`
	OutputTokens  int64     `json:"output_tokens"`
	Reasoning     int64     `json:"reasoning_tokens"`
	TotalTokens   int64     `json:"total_tokens"`
	Failed        bool      `json:"failed"`
	LatencyMs     int64     `json:"latency_ms"`
	Credit        float64   `json:"credit"`
	Priced        bool      `json:"priced"`
}

type Store struct {
	mu       sync.RWMutex
	dir      string
	events   []Metric
	maxEvents int
	priceRaw map[string]Price
	dirty    bool
	lastSave time.Time
}

const defaultMaxEvents = 20000

var store = &Store{maxEvents: defaultMaxEvents}

func storeDir() string {
	if dir := strings.TrimSpace(os.Getenv("STEPFUN_CREDIT_DATA_DIR")); dir != "" {
		return dir
	}
	exe, err := os.Executable()
	if err == nil && strings.TrimSpace(exe) != "" {
		return filepath.Join(filepath.Dir(exe), "data")
	}
	if home, err := os.UserHomeDir(); err == nil {
		return filepath.Join(home, ".cli-proxy-api", "data")
	}
	return "data"
}

func (s *Store) statePath() string {
	return filepath.Join(s.dir, "stepfun-credit-tracker.json")
}

type persistedState struct {
	Events    []Metric                    `json:"events"`
	Prices    map[string]Price            `json:"prices,omitempty"`
	Providers map[string]*observedProvider `json:"providers,omitempty"`
}

func (s *Store) load() {
	s.mu.Lock()
	s.dir = storeDir()
	s.mu.Unlock()
	_ = os.MkdirAll(s.dir, 0o700)

	raw, err := os.ReadFile(s.statePath())
	if err != nil {
		return
	}
	var st persistedState
	if err := jsonUnmarshal(raw, &st); err != nil {
		return
	}
	s.mu.Lock()
	s.events = st.Events
	if len(st.Prices) > 0 {
		s.priceRaw = st.Prices
	}
	s.mu.Unlock()
	if len(st.Providers) > 0 {
		disc.Lock()
		for k, v := range st.Providers {
			if v != nil {
				disc.observed[k] = v
			}
		}
		disc.Unlock()
	}
	if len(st.Prices) > 0 {
		setPrices(st.Prices)
	}
}

func (s *Store) save() {
	s.mu.RLock()
	events := make([]Metric, len(s.events))
	copy(events, s.events)
	prices := priceSnapshot()
	s.mu.RUnlock()

	disc.RLock()
	providers := make(map[string]*observedProvider, len(disc.observed))
	for k, v := range disc.observed {
		if v != nil {
			cp := *v
			providers[k] = &cp
		}
	}
	disc.RUnlock()

	st := persistedState{Events: events, Prices: prices, Providers: providers}
	raw, err := jsonMarshal(st)
	if err != nil {
		return
	}
	tmp := s.statePath() + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return
	}
	_ = os.Rename(tmp, s.statePath())
}

func (s *Store) add(m Metric) {
	s.mu.Lock()
	s.events = append(s.events, m)
	if len(s.events) > s.maxEvents {
		over := len(s.events) - s.maxEvents
		s.events = append([]Metric(nil), s.events[over:]...)
	}
	s.dirty = true
	s.mu.Unlock()

	if time.Since(s.lastSave) > 3*time.Second {
		s.lastSave = time.Now()
		go s.save()
	}
}

func (s *Store) all() []Metric {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]Metric, len(s.events))
	copy(out, s.events)
	return out
}

func (s *Store) clear() {
	s.mu.Lock()
	s.events = nil
	s.mu.Unlock()
	s.save()
}

// ---------- 聚合 ----------

type Totals struct {
	Requests     int64   `json:"requests"`
	Failed       int64   `json:"failed_requests"`
	InputTokens  int64   `json:"input_tokens"`
	CacheRead    int64   `json:"cache_read_tokens"`
	CacheWrite   int64   `json:"cache_creation_tokens"`
	OutputTokens int64   `json:"output_tokens"`
	Reasoning    int64   `json:"reasoning_tokens"`
	TotalTokens  int64   `json:"total_tokens"`
	Credit       float64 `json:"credit"`
	Unpriced     int64   `json:"unpriced_requests"`
}

func (t *Totals) add(m Metric) {
	t.Requests++
	if m.Failed {
		t.Failed++
	}
	t.InputTokens += m.InputTokens
	t.CacheRead += m.CacheRead
	t.CacheWrite += m.CacheCreation
	t.OutputTokens += m.OutputTokens
	t.Reasoning += m.Reasoning
	t.TotalTokens += m.TotalTokens
	if m.Priced {
		t.Credit += m.Credit
	} else {
		t.Unpriced++
	}
}

type ModelRow struct {
	Model        string  `json:"model"`
	Requests     int64   `json:"requests"`
	Failed       int64   `json:"failed_requests"`
	InputTokens  int64   `json:"input_tokens"`
	CacheRead    int64   `json:"cache_read_tokens"`
	OutputTokens int64   `json:"output_tokens"`
	TotalTokens  int64   `json:"total_tokens"`
	Credit       float64 `json:"credit"`
	Priced       bool    `json:"priced"`
}

type Bucket struct {
	Time    string  `json:"time"`
	Label   string  `json:"label,omitempty"`
	Credit  float64 `json:"credit"`
	Requests int64  `json:"requests"`
	Failed  int64   `json:"failed_requests"`
	Input   int64   `json:"input_tokens"`
	Output  int64   `json:"output_tokens"`
}

type Summary struct {
	Now          string     `json:"now"`
	RetainedFrom string     `json:"retained_since,omitempty"`
	LastUsed     string     `json:"last_used,omitempty"`
	Totals       Totals     `json:"totals"`
	Models       []ModelRow `json:"models"`
	Buckets      []Bucket   `json:"buckets"`
	BucketSecs   int        `json:"bucket_seconds"`
}

func summarize(from, to time.Time, bucketSecs int) Summary {
	events := store.all()
	if bucketSecs <= 0 {
		bucketSecs = 300
	}
	sum := Summary{Now: time.Now().UTC().Format(time.RFC3339), BucketSecs: bucketSecs}
	byModel := map[string]*ModelRow{}
	byBucket := map[int64]*Bucket{}
	var earliest, latest time.Time

	for _, m := range events {
		if earliest.IsZero() || m.At.Before(earliest) {
			earliest = m.At
		}
		if m.At.After(latest) {
			latest = m.At
		}
		if m.At.Before(from) || m.At.After(to) {
			continue
		}
		sum.Totals.add(m)
		row := byModel[m.Model]
		if row == nil {
			row = &ModelRow{Model: m.Model, Priced: m.Priced}
			byModel[m.Model] = row
		}
		row.Requests++
		if m.Failed {
			row.Failed++
		}
		row.InputTokens += m.InputTokens
		row.CacheRead += m.CacheRead
		row.OutputTokens += m.OutputTokens
		row.TotalTokens += m.TotalTokens
		if m.Priced {
			row.Credit += m.Credit
		}

		key := m.At.Unix() / int64(bucketSecs) * int64(bucketSecs)
		b := byBucket[key]
		if b == nil {
			b = &Bucket{Time: time.Unix(key, 0).UTC().Format(time.RFC3339)}
			byBucket[key] = b
		}
		b.Requests++
		if m.Failed {
			b.Failed++
		}
		b.Credit += m.Credit
		b.Input += m.InputTokens
		b.Output += m.OutputTokens
	}

	if !earliest.IsZero() {
		sum.RetainedFrom = earliest.UTC().Format(time.RFC3339)
	}
	if !latest.IsZero() {
		sum.LastUsed = latest.UTC().Format(time.RFC3339)
	}

	for _, row := range byModel {
		sum.Models = append(sum.Models, *row)
	}
	sort.Slice(sum.Models, func(i, j int) bool {
		if sum.Models[i].Credit != sum.Models[j].Credit {
			return sum.Models[i].Credit > sum.Models[j].Credit
		}
		return sum.Models[i].Requests > sum.Models[j].Requests
	})

	// 生成稠密时间轴：按粒度对齐并补零，保证柱子宽度均匀
	gran := granularityFromSeconds(bucketSecs)
	sum.BucketSecs = gran.seconds()
	axis := gran.axis(from, to)
	for _, ts := range axis {
		if b, ok := byBucket[ts.Unix()]; ok {
			b.Label = gran.label(ts)
			sum.Buckets = append(sum.Buckets, *b)
		} else {
			sum.Buckets = append(sum.Buckets, Bucket{Time: ts.UTC().Format(time.RFC3339), Label: gran.label(ts)})
		}
	}
	return sum
}


// summarizeGranular 按指定粒度聚合（日/周/月为自然边界，非固定秒数）
func summarizeGranular(from, to time.Time, gran Granularity) Summary {
	events := store.all()
	sum := Summary{Now: time.Now().UTC().Format(time.RFC3339), BucketSecs: gran.seconds()}
	byModel := map[string]*ModelRow{}
	byBucket := map[int64]*Bucket{}
	var earliest, latest time.Time

	for _, m := range events {
		if earliest.IsZero() || m.At.Before(earliest) {
			earliest = m.At
		}
		if m.At.After(latest) {
			latest = m.At
		}
		if m.At.Before(from) || m.At.After(to) {
			continue
		}
		sum.Totals.add(m)

		row := byModel[m.Model]
		if row == nil {
			row = &ModelRow{Model: m.Model, Priced: m.Priced}
			byModel[m.Model] = row
		}
		row.Requests++
		if m.Failed {
			row.Failed++
		}
		row.InputTokens += m.InputTokens
		row.CacheRead += m.CacheRead
		row.OutputTokens += m.OutputTokens
		row.TotalTokens += m.TotalTokens
		if m.Priced {
			row.Credit += m.Credit
		}

		slot := gran.truncate(m.At)
		b := byBucket[slot.Unix()]
		if b == nil {
			b = &Bucket{Time: slot.UTC().Format(time.RFC3339), Label: gran.label(slot)}
			byBucket[slot.Unix()] = b
		}
		b.Requests++
		if m.Failed {
			b.Failed++
		}
		b.Credit += m.Credit
		b.Input += m.InputTokens
		b.Output += m.OutputTokens
	}

	if !earliest.IsZero() {
		sum.RetainedFrom = earliest.UTC().Format(time.RFC3339)
	}
	if !latest.IsZero() {
		sum.LastUsed = latest.UTC().Format(time.RFC3339)
	}

	for _, row := range byModel {
		sum.Models = append(sum.Models, *row)
	}
	sort.Slice(sum.Models, func(i, j int) bool {
		if sum.Models[i].Credit != sum.Models[j].Credit {
			return sum.Models[i].Credit > sum.Models[j].Credit
		}
		return sum.Models[i].Requests > sum.Models[j].Requests
	})

	for _, ts := range gran.axis(from, to) {
		if b, ok := byBucket[ts.Unix()]; ok {
			b.Label = gran.label(ts)
			sum.Buckets = append(sum.Buckets, *b)
		} else {
			sum.Buckets = append(sum.Buckets, Bucket{Time: ts.UTC().Format(time.RFC3339), Label: gran.label(ts)})
		}
	}
	return sum
}

func monthStartUTC() time.Time {
	now := time.Now().UTC()
	return time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
}

func daysLeftInMonth() int {
	now := time.Now().UTC()
	last := time.Date(now.Year(), now.Month()+1, 0, 0, 0, 0, 0, time.UTC)
	return last.Day() - now.Day()
}

func formatCredit(v float64) string {
	return strconv.FormatFloat(v*1e6, 'f', 0, 64)
}
