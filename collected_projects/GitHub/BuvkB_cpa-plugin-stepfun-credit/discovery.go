package main

import (
	"encoding/json"
	"sort"
	"strings"
	"sync"
	"time"
)

// 接入识别
//
// 背景：StepFun 通常是通过 CPA 的 openai-compatibility 接入的，这条通道
// 在 CPA 里会被「合成」成运行时凭据（provider key = openai-compatible-<name>），
// 但宿主 API host.auth.list 不会把它暴露出来（只有带文件的凭据才会出现在那里）。
// 而且不同的人给这条通道起的名字不一样（stepfun / stepfun-api / 别的）。
//
// 所以本插件不硬编码任何 provider 名，而是从**真实流量**里学习：
// 每次 usage.handle 都会带上 Provider 与 BaseURL，插件据此确认
// 「这台 CPA 上确实接了 StepFun，它的 provider key 是 X、base_url 是 Y」。
// 这样换一台 CPA、换一个通道名，只要跑过一次请求就能自动认出来。

type observedProvider struct {
	Key      string `json:"key"`            // usage 记录里的 Provider
	BaseURL  string `json:"base_url"`       // usage 记录里的 BaseURL
	Seen     int64  `json:"seen"`           // 命中次数
	Matched  string `json:"matched"`        // 判定依据
	FirstAt  string `json:"first_seen"`
	LastAt   string `json:"last_seen"`
}

type discoveryState struct {
	sync.RWMutex
	observed   map[string]*observedProvider // key = provider|base_url
	authProbe  []string                     // host.auth.list 探测到的原始条目（诊断用）
	authErr    string
	checkedAt  time.Time
}

var disc = &discoveryState{observed: map[string]*observedProvider{}}

// 判定依据：返回 matched 说明，空串表示不是 StepFun
func classifyTraffic(model, baseURL, provider string) string {
	m := strings.ToLower(strings.TrimSpace(model))
	b := strings.ToLower(strings.TrimSpace(baseURL))
	p := strings.ToLower(strings.TrimSpace(provider))

	if !strings.HasPrefix(m, "step") {
		return ""
	}
	if strings.Contains(b, "stepfun.com") || strings.Contains(b, "stepfun.ai") {
		return "base_url"
	}
	if strings.Contains(p, "stepfun") {
		return "provider"
	}
	// 兜底：openai 兼容通道 + step 前缀模型
	if strings.HasPrefix(p, "openai-compatible") {
		return "provider_prefix"
	}
	return ""
}

// learnFromTraffic 从一条真实用量记录中学习接入信息
func learnFromTraffic(model, baseURL, provider string) {
	matched := classifyTraffic(model, baseURL, provider)
	if matched == "" {
		return
	}
	now := time.Now().UTC().Format(time.RFC3339)
	key := strings.ToLower(strings.TrimSpace(provider)) + "|" + strings.TrimSpace(baseURL)

	learnedNew := false
	disc.Lock()
	item := disc.observed[key]
	if item == nil {
		item = &observedProvider{
			Key:     strings.TrimSpace(provider),
			BaseURL: strings.TrimSpace(baseURL),
			Matched: matched,
			FirstAt: now,
		}
		disc.observed[key] = item
	}
	item.Seen++
	item.LastAt = now
	learnedNew = true
	if item.Matched == "provider_prefix" && matched == "base_url" {
		item.Matched = matched
	}
	disc.Unlock()
	if learnedNew {
		go store.save()
	}
}

// probeAuthList 尝试通过宿主 API 读凭据列表（部分部署下能看到，作为补充线索）
func probeAuthList() {
	raw, err := callHost("host.auth.list", []byte("{}"))
	if err != nil {
		disc.Lock()
		disc.authErr = err.Error()
		disc.Lock()
		disc.checkedAt = time.Now().UTC()
		return
	}
	var res struct {
		Files []struct {
			Name     string `json:"name"`
			Type     string `json:"type"`
			Provider string `json:"provider"`
			Label    string `json:"label"`
			BaseURL  string `json:"base_url"`
		} `json:"files"`
	}
	if err := json.Unmarshal(raw, &res); err != nil {
		disc.Lock()
		disc.authErr = "decode: " + err.Error()
		disc.checkedAt = time.Now().UTC()
		disc.Unlock()
		return
	}
	names := make([]string, 0, len(res.Files))
	for _, f := range res.Files {
		prov := f.Provider
		if prov == "" {
			prov = f.Type
		}
		names = append(names, f.Name+" | "+prov+" | "+f.BaseURL)
	}
	disc.Lock()
	disc.authProbe = names
	disc.authErr = ""
	disc.checkedAt = time.Now().UTC()
	disc.Unlock()
}

// observedProviders 返回按命中次数排序的接入列表
func observedProviders() []observedProvider {
	disc.RLock()
	defer disc.RUnlock()
	out := make([]observedProvider, 0, len(disc.observed))
	for _, v := range disc.observed {
		out = append(out, *v)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Seen != out[j].Seen {
			return out[i].Seen > out[j].Seen
		}
		return out[i].Key < out[j].Key
	})
	return out
}

// currentProviderKey 供 quota provider 的 Identifier 使用
func currentProviderKey() string {
	for _, p := range observedProviders() {
		if p.Key != "" {
			return p.Key
		}
	}
	return defaultProviderKey
}

// providerKeySet 返回所有应被认作「本插件管辖」的 provider key
func providerKeySet() []string {
	keys := []string{}
	for _, p := range observedProviders() {
		if p.Key != "" && !containsString(keys, p.Key) {
			keys = append(keys, p.Key)
		}
	}
	for _, fb := range fallbackProviderKeys {
		if !containsString(keys, fb) {
			keys = append(keys, fb)
		}
	}
	return keys
}

// isTrackedRequest 判断一条用量记录是否属于 StepFun
func isTrackedRequest(model, baseURL, provider string) bool {
	return classifyTraffic(model, baseURL, provider) != ""
}

func containsString(list []string, v string) bool {
	for _, x := range list {
		if x == v {
			return true
		}
	}
	return false
}

// discoveryPayload 输出识别结果，供仪表与诊断使用
func discoveryPayload() map[string]any {
	providers := observedProviders()
	disc.RLock()
	authProbe := append([]string(nil), disc.authProbe...)
	authErr := disc.authErr
	checkedAt := disc.checkedAt
	disc.RUnlock()

	payload := map[string]any{
		"providers":      providers,
		"detected_keys":  providerKeySet(),
		"identifier_key": currentProviderKey(),
		"learning":       "从真实请求的 Provider/BaseURL 学习；每有一次 StepFun 请求就会刷新",
		"raw_entries":    authProbe,
	}
	if len(providers) > 0 {
		payload["status"] = "detected"
	} else {
		payload["status"] = "waiting_traffic"
		payload["hint"] = "尚未观测到 StepFun 请求。发一次 step 系列模型的调用即可自动识别。"
	}
	if !checkedAt.IsZero() {
		payload["checked_at"] = checkedAt.Format(time.RFC3339)
	}
	if authErr != "" {
		payload["auth_list_note"] = authErr
	}
	return payload
}
