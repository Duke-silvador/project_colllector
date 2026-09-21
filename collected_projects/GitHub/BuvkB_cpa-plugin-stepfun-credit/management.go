package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultPluginID = "stepfun-credit-tracker"

type registeredRoutes struct {
	pluginID       string
	resourceBase   string
	managementBase string
}

type managementRequest struct {
	Method  string      `json:"Method"`
	Path    string      `json:"Path"`
	Headers http.Header `json:"Headers"`
	Query   url.Values  `json:"Query"`
	Body    []byte      `json:"Body"`
}

type managementResponse struct {
	StatusCode int         `json:"StatusCode"`
	Headers    http.Header `json:"Headers"`
	Body       []byte      `json:"Body"`
}

type managementRegistrationRequest struct {
	Plugin           metadata `json:"Plugin"`
	BasePath         string   `json:"BasePath"`
	ResourceBasePath string   `json:"ResourceBasePath"`
}

type managementRoute struct {
	Method      string `json:"Method"`
	Path        string `json:"Path"`
	Menu        string `json:"Menu,omitempty"`
	Description string `json:"Description,omitempty"`
}

type resourceRoute struct {
	Path        string `json:"Path"`
	Menu        string `json:"Menu,omitempty"`
	Description string `json:"Description,omitempty"`
}

type managementRegistrationResponse struct {
	Routes    []managementRoute `json:"Routes,omitempty"`
	Resources []resourceRoute   `json:"Resources,omitempty"`
}

func pluginIDFromResourceBase(base string) string {
	base = strings.TrimRight(strings.TrimSpace(base), "/")
	const prefix = "/v0/resource/plugins/"
	if strings.HasPrefix(base, prefix) {
		id := strings.TrimPrefix(base, prefix)
		if id != "" && !strings.Contains(id, "/") {
			return id
		}
	}
	return defaultPluginID
}

func registerManagement(raw []byte) managementRegistrationResponse {
	loadQuotaSettings()

	var req managementRegistrationRequest
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &req)
	}
	pluginID := pluginIDFromResourceBase(req.ResourceBasePath)
	routes := registeredRoutes{
		pluginID:       pluginID,
		resourceBase:   "/v0/resource/plugins/" + pluginID,
		managementBase: "/v0/management/plugins/" + pluginID,
	}

	state.mu.Lock()
	state.pluginID = pluginID
	state.routes = routes
	state.mu.Unlock()

	return managementRegistrationResponse{
		Routes: []managementRoute{
			{Method: http.MethodGet, Path: "/plugins/" + pluginID + "/summary", Description: "StepFun Credit 用量汇总。"},
			{Method: http.MethodPost, Path: "/plugins/" + pluginID + "/reset", Description: "清空本插件的用量记录。"},
			{Method: http.MethodPut, Path: "/plugins/" + pluginID + "/prices", Description: "保存模型单价。"},
			{Method: http.MethodPut, Path: "/plugins/" + pluginID + "/quota", Description: "保存月池总额度设置。"},
		},
		Resources: []resourceRoute{
			{
				Path:        "/dashboard",
				Menu:        "StepFun Credit",
				Description: "实时查看 StepFun 订阅 Credit 的消耗情况。",
			},
			{Path: "/summary", Description: "StepFun Credit 用量汇总 JSON。"},
			{Path: "/requests", Description: "最近的 StepFun 请求明细 JSON。"},
			{Path: "/prices", Description: "当前生效的模型单价 JSON。"},
			{Path: "/quota", Description: "月池总额度设置 JSON。"},
			{Path: "/discovery", Description: "自动发现的 StepFun 接入与识别依据 JSON。"},
		},
	}
}

func jsonResponse(status int, value any) managementResponse {
	body, err := json.Marshal(value)
	if err != nil {
		status = http.StatusInternalServerError
		body = []byte(fmt.Sprintf("{\"error\":%q}", err.Error()))
	}
	h := http.Header{}
	h.Set("Content-Type", "application/json; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	return managementResponse{StatusCode: status, Headers: h, Body: body}
}

func htmlResponse(status int, body string) managementResponse {
	h := http.Header{}
	h.Set("Content-Type", "text/html; charset=utf-8")
	h.Set("Cache-Control", "no-store")
	return managementResponse{StatusCode: status, Headers: h, Body: []byte(body)}
}

func handleManagement(raw []byte) managementResponse {
	var req managementRequest
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &req); err != nil {
			return jsonResponse(http.StatusBadRequest, map[string]any{"error": "decode management request: " + err.Error()})
		}
	}
	path := req.Path
	// 归一化：剥掉可能的 /v0/management 前缀，只保留插件内相对路径
	if idx := strings.Index(path, "/plugins/"); idx >= 0 {
		rest := path[idx+len("/plugins/"):]
		if slash := strings.Index(rest, "/"); slash >= 0 {
			path = rest[slash:]
		}
	}
	if idx := strings.Index(path, "/v0/resource/plugins/"); idx >= 0 {
		rest := path[idx+len("/v0/resource/plugins/"):]
		if slash := strings.Index(rest, "/"); slash >= 0 {
			path = rest[slash:]
		}
	}

	switch {
	case path == "/dashboard" || path == "/dashboard/":
		return htmlResponse(http.StatusOK, dashboardHTML)
	case path == "/summary":
		return jsonResponse(http.StatusOK, buildSummaryPayload(req.Query))
	case path == "/requests":
		return jsonResponse(http.StatusOK, buildRequestsPayload(req.Query))
	case path == "/prices":
		return jsonResponse(http.StatusOK, map[string]any{"prices": priceSnapshot(), "official": officialPrices})
	case path == "/quota" && req.Method == http.MethodPut:
		var body QuotaSettings
		if err := json.Unmarshal(req.Body, &body); err != nil {
			return jsonResponse(http.StatusBadRequest, map[string]any{"error": "invalid body"})
		}
		if body.TotalCredit < 0 {
			body.TotalCredit = 0
		}
		saveQuotaSettings(body)
		return jsonResponse(http.StatusOK, map[string]any{"status": "ok", "quota": currentQuota()})
	case path == "/discovery":
		probeAuthList()
		return jsonResponse(http.StatusOK, discoveryPayload())
	case path == "/quota":
		return jsonResponse(http.StatusOK, map[string]any{"quota": currentQuota(), "plan_presets": planPresets})
	case path == "/reset" && req.Method == http.MethodPost:
		store.clear()
		return jsonResponse(http.StatusOK, map[string]any{"status": "ok"})
	case path == "/prices" && req.Method == http.MethodPut:
		var body struct {
			Prices map[string]Price `json:"prices"`
		}
		if err := json.Unmarshal(req.Body, &body); err != nil {
			return jsonResponse(http.StatusBadRequest, map[string]any{"error": "invalid body"})
		}
		if len(body.Prices) == 0 {
			resetPrices()
		} else {
			setPrices(body.Prices)
		}
		store.save()
		return jsonResponse(http.StatusOK, map[string]any{"status": "ok", "prices": priceSnapshot()})
	default:
		return jsonResponse(http.StatusNotFound, map[string]any{"error": "unknown route: " + path})
	}
}

func parseRange(q url.Values) (time.Time, time.Time) {
	now := time.Now().UTC()
	from := now.Add(-24 * time.Hour)
	to := now
	if s := strings.TrimSpace(q.Get("start")); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			from = t.UTC()
		}
	}
	if s := strings.TrimSpace(q.Get("end")); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			to = t.UTC()
		}
	}
	if r := strings.TrimSpace(q.Get("range")); r != "" && q.Get("start") == "" {
		if rf, rt, ok := resolveRange(r, earliestEventTime()); ok {
			from, to = rf, rt
		}
	}
	return from, to
}

// earliestEventTime 返回已记录的最早时间，供 range=all 使用
func earliestEventTime() time.Time {
	events := store.all()
	var earliest time.Time
	for _, e := range events {
		if earliest.IsZero() || e.At.Before(earliest) {
			earliest = e.At
		}
	}
	return earliest
}

// rangeLabel 返回预设范围的显示名
func rangeLabel(key string) string {
	for _, r := range timeRanges {
		if r.Key == key {
			return r.Label
		}
	}
	return "所选范围"
}

func buildSummaryPayload(q url.Values) map[string]any {
	from, to := parseRange(q)

	// 粒度：显式指定优先，否则按跨度自动选择
	gran := defaultGranularity(from, to)
	if key := strings.TrimSpace(q.Get("granularity")); key != "" {
		if g, ok := granularityByKey(key); ok {
			gran = g
		}
	}
	bucketSecs := gran.seconds()
	if bucketSecs == 0 {
		bucketSecs = 86400 // 月粒度按日聚合，再由 axis 归并到月刻度
	}

	month := summarize(monthStartUTC(), time.Now().UTC(), 86400)
	hour := summarize(time.Now().UTC().Add(-time.Hour), time.Now().UTC(), 300)
	window := summarizeGranular(from, to, gran)

	rangeKey := strings.TrimSpace(q.Get("range"))
	if rangeKey == "" {
		rangeKey = "custom"
	}
	return map[string]any{
		"plugin":         pluginName,
		"version":        pluginVersion,
		"now":            time.Now().UTC().Format(time.RFC3339),
		"range":          map[string]any{"start": from.Format(time.RFC3339), "end": to.Format(time.RFC3339), "key": rangeKey},
		"range_label":    rangeLabel(rangeKey),
		"granularity":    gran,
		"timeline":       describeTimeline(),
		"month":          month,
		"hour":           hour,
		"window":         window,
		"days_left":      daysLeftInMonth(),
		"quota":          currentQuota(),
		"plan_presets":   planPresets,
		"discovery":      discoveryPayload(),
		"prices":         priceSnapshot(),
		"official":       officialPrices,
		"credit_per_cny": 1e6,
	}
}

func buildRequestsPayload(q url.Values) map[string]any {
	limit := 60
	if v := strings.TrimSpace(q.Get("limit")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 500 {
			limit = n
		}
	}
	events := store.all()
	out := make([]Metric, 0, limit)
	for i := len(events) - 1; i >= 0 && len(out) < limit; i-- {
		out = append(out, events[i])
	}
	return map[string]any{"total": len(events), "items": out}
}
