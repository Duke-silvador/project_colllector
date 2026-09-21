package main

import (
	"encoding/json"
	"strings"
	"time"
)

// usageRecord 对应 CPA pluginapi.UsageRecord 的 JSON 形态
type usageRecord struct {
	Provider     string `json:"Provider"`
	BaseURL      string `json:"BaseURL"`
	ExecutorType string `json:"ExecutorType"`
	Model        string `json:"Model"`
	Alias        string `json:"Alias"`
	Source       string `json:"Source"`
	RequestedAt  string `json:"RequestedAt"`
	Latency      int64  `json:"Latency"`
	Failed       bool   `json:"Failed"`
	Detail       struct {
		InputTokens         int64 `json:"InputTokens"`
		OutputTokens        int64 `json:"OutputTokens"`
		ReasoningTokens     int64 `json:"ReasoningTokens"`
		CachedTokens        int64 `json:"CachedTokens"`
		CacheReadTokens     int64 `json:"CacheReadTokens"`
		CacheCreationTokens int64 `json:"CacheCreationTokens"`
		TotalTokens         int64 `json:"TotalTokens"`
	} `json:"Detail"`
}

// sanitizeSource 避免把疑似密钥的来源原样落盘
func sanitizeSource(src string) string {
	src = strings.TrimSpace(src)
	if src == "" {
		return ""
	}
	if len(src) >= 32 {
		looksKey := true
		for _, r := range src {
			ok := (r >= '0' && r <= '9') || (r >= 'a' && r <= 'z') || (r >= 'A' && r <= 'Z') || r == '-' || r == '_'
			if !ok {
				looksKey = false
				break
			}
		}
		if looksKey {
			return src[:6] + "..."
		}
	}
	return src
}

func handleUsage(raw []byte) map[string]any {
	var rec usageRecord
	if len(raw) == 0 {
		return map[string]any{}
	}
	if err := json.Unmarshal(raw, &rec); err != nil {
		return map[string]any{}
	}

	model := strings.TrimSpace(rec.Model)
	baseURL := strings.TrimSpace(rec.BaseURL)
	provider := strings.TrimSpace(rec.Provider)

	if !isTrackedRequest(model, baseURL, provider) {
		return map[string]any{}
	}
	// 每次真实流量都刷新一次接入识别
	learnFromTraffic(model, baseURL, provider)

	at := time.Now().UTC()
	if rec.RequestedAt != "" {
		if parsed, err := time.Parse(time.RFC3339Nano, rec.RequestedAt); err == nil {
			at = parsed.UTC()
		}
	}

	input := rec.Detail.InputTokens
	cacheRead := rec.Detail.CacheReadTokens
	if cacheRead == 0 {
		cacheRead = rec.Detail.CachedTokens
	}
	output := rec.Detail.OutputTokens
	total := rec.Detail.TotalTokens
	if total == 0 {
		total = input + output
	}

	credit, priced := creditFor(model, input, cacheRead, output)
	if rec.Failed {
		credit, priced = 0, false
	}

	store.add(Metric{
		At:            at,
		Model:         model,
		Alias:         rec.Alias,
		Source:        sanitizeSource(rec.Source),
		InputTokens:   input,
		CacheRead:     cacheRead,
		CacheCreation: rec.Detail.CacheCreationTokens,
		OutputTokens:  output,
		Reasoning:     rec.Detail.ReasoningTokens,
		TotalTokens:   total,
		Failed:        rec.Failed,
		LatencyMs:     rec.Latency / int64(time.Millisecond),
		Credit:        credit,
		Priced:        priced,
	})
	return map[string]any{}
}
