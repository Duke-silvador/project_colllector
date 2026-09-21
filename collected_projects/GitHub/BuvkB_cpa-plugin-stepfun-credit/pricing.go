package main

import (
	"strings"
	"sync"
)

// Price 单位：元 / 1M tokens
type Price struct {
	Input     float64 `json:"input"`
	CacheRead float64 `json:"cache_read"`
	Output    float64 `json:"output"`
}

// 官方定价（元 / 1M tokens）
// 来源：https://platform.stepfun.com/docs/zh/guides/pricing/details
var officialPrices = map[string]Price{
	"step-5-preview":         {Input: 7.00, CacheRead: 0.35, Output: 20.00},
	"step-3.7-flash":         {Input: 1.35, CacheRead: 0.27, Output: 8.10},
	"step-3.5-flash":         {Input: 0.70, CacheRead: 0.14, Output: 2.10},
	"step-3.5-flash-2603":    {Input: 0.70, CacheRead: 0.14, Output: 2.10},
	"stepaudio-2.5-chat":     {Input: 10.0, CacheRead: 2.00, Output: 25.00},
	"stepaudio-2.5-realtime": {Input: 10.0, CacheRead: 2.00, Output: 70.00},
}

var (
	priceMu    sync.RWMutex
	priceBook  = map[string]Price{}
	priceIsSet = map[string]bool{}
)

func init() {
	resetPrices()
}

func resetPrices() {
	priceMu.Lock()
	defer priceMu.Unlock()
	priceBook = map[string]Price{}
	priceIsSet = map[string]bool{}
	for name, p := range officialPrices {
		priceBook[name] = p
		priceIsSet[name] = true
	}
}

func setPrices(in map[string]Price) {
	priceMu.Lock()
	defer priceMu.Unlock()
	priceBook = map[string]Price{}
	priceIsSet = map[string]bool{}
	for name, p := range in {
		priceBook[name] = p
		priceIsSet[name] = true
	}
}

func priceSnapshot() map[string]Price {
	priceMu.RLock()
	defer priceMu.RUnlock()
	out := make(map[string]Price, len(priceBook))
	for k, v := range priceBook {
		out[k] = v
	}
	return out
}

func lookupPrice(model string) (Price, bool) {
	priceMu.RLock()
	defer priceMu.RUnlock()
	if p, ok := priceBook[model]; ok {
		return p, true
	}
	base := model
	for {
		idx := strings.LastIndex(base, "-")
		if idx <= 0 {
			break
		}
		base = base[:idx]
		if p, ok := priceBook[base]; ok {
			return p, true
		}
	}
	return Price{}, false
}

// creditFor 返回该次调用的消耗（单位：元；Step Plan 口径 1 元 = 1,000,000 Credit）
func creditFor(model string, inputTokens, cacheReadTokens, outputTokens int64) (float64, bool) {
	p, ok := lookupPrice(model)
	if !ok {
		return 0, false
	}
	hit := cacheReadTokens
	if hit < 0 {
		hit = 0
	}
	if hit > inputTokens {
		hit = inputTokens
	}
	miss := inputTokens - hit
	if miss < 0 {
		miss = 0
	}
	out := outputTokens
	if out < 0 {
		out = 0
	}
	return float64(miss)*p.Input/1e6 + float64(hit)*p.CacheRead/1e6 + float64(out)*p.Output/1e6, true
}

func isStepModel(model string) bool {
	return strings.HasPrefix(strings.ToLower(strings.TrimSpace(model)), "step")
}

func isStepfunBaseURL(baseURL string) bool {
	b := strings.ToLower(strings.TrimSpace(baseURL))
	return strings.Contains(b, "stepfun.com") || strings.Contains(b, "stepfun.ai")
}
