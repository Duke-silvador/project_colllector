package main

import (
	"encoding/json"
	"fmt"
	"time"
)

const defaultProviderKey = "openai-compatible-stepfun"

// 即使自动发现失败也认这些 key，保证本机开箱可用
var fallbackProviderKeys = []string{"stepfun", "openai-compatible-stepfun", "openai-compatibility"}

func quotaIdentifier() string {
	return currentProviderKey()
}

type quotaDescribeResponse struct {
	SupportedProviders []string `json:"supported_providers,omitempty"`
	DisplayName        string   `json:"display_name,omitempty"`
	SupportsReset      bool     `json:"supports_reset,omitempty"`
}

func describeQuota() quotaDescribeResponse {
	return quotaDescribeResponse{
		SupportedProviders: providerKeySet(),
		DisplayName:        "StepFun Credit（月池）",
		SupportsReset:      false,
	}
}

type quotaFetchRequest struct {
	AuthIndex  string            `json:"auth_index"`
	AuthID     string            `json:"auth_id"`
	Provider   string            `json:"provider"`
	Metadata   map[string]any    `json:"metadata,omitempty"`
	Attributes map[string]string `json:"attributes,omitempty"`
}

type quotaMetric struct {
	Key      string  `json:"key"`
	Label    string  `json:"label"`
	Value    float64 `json:"value"`
	Unit     string  `json:"unit,omitempty"`
	Format   string  `json:"format,omitempty"`
	Currency string  `json:"currency,omitempty"`
}

type quotaBucket struct {
	Window            string  `json:"window,omitempty"`
	RemainingFraction float64 `json:"remainingFraction"`
	ResetTime         string  `json:"resetTime,omitempty"`
	Description       string  `json:"description,omitempty"`
}

type quotaGroup struct {
	DisplayName string        `json:"displayName,omitempty"`
	Buckets     []quotaBucket `json:"buckets,omitempty"`
}

type quotaSubscription struct {
	Plan     string `json:"plan,omitempty"`
	TierName string `json:"tierName,omitempty"`
	TierID   string `json:"tierId,omitempty"`
}

type quotaFetchResponse struct {
	Subscription *quotaSubscription `json:"subscription,omitempty"`
	Summary      []quotaMetric      `json:"summary,omitempty"`
	Groups       []quotaGroup       `json:"groups,omitempty"`
}

// fetchQuota 为 StepFun 凭据返回「本月消耗」概览。
// StepFun 官方未开放订阅月池的查询接口，因此这里是 CPA 侧按请求 token 精确记账的结果。
func fetchQuota(raw []byte) quotaFetchResponse {
	var req quotaFetchRequest
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &req)
	}
	// quota.fetch 期间宿主回调上下文是打开的，趁机刷新一次自动发现
	probeAuthList()

	now := time.Now().UTC()
	month := summarize(monthStartUTC(), now, 86400)
	hour := summarize(now.Add(-time.Hour), now, 300)

	resetTime := time.Date(now.Year(), now.Month()+1, 1, 0, 0, 0, 0, time.UTC).Format(time.RFC3339)
	planName := "Step Plan · Credit 月池"
	if providers := observedProviders(); len(providers) > 0 && providers[0].BaseURL != "" {
		planName = providers[0].BaseURL
	}

	return quotaFetchResponse{
		Subscription: &quotaSubscription{
			Plan:     planName,
			TierName: "1 元 = 1,000,000 Credit",
		},
		Summary: []quotaMetric{
			{Key: "credit_month", Label: "本月消耗 (Credit)", Value: month.Totals.Credit * 1e6, Format: "number"},
			{Key: "cny_month", Label: "本月消耗 (元)", Value: month.Totals.Credit, Format: "currency", Currency: "CNY"},
			{Key: "credit_hour", Label: "最近 1 小时 (Credit)", Value: hour.Totals.Credit * 1e6, Format: "number"},
			{Key: "requests_month", Label: "本月请求数", Value: float64(month.Totals.Requests), Format: "number"},
		},
		Groups: []quotaGroup{{
			DisplayName: "StepFun 订阅消耗（CPA 侧实时记账）",
			Buckets: []quotaBucket{{
				Window:    "month",
				ResetTime: resetTime,
				Description: fmt.Sprintf("本月已消耗 %.0f Credit（≈¥%.2f）· %d 次请求 · 距月末重置 %d 天",
					month.Totals.Credit*1e6, month.Totals.Credit, month.Totals.Requests, daysLeftInMonth()),
			}},
		}},
	}
}
