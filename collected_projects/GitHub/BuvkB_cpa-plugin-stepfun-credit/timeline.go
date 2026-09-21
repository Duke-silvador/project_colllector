package main

import (
	"fmt"
	"time"
)

// 时间粒度：分钟 / 小时 / 日 / 周 / 月
type Granularity struct {
	Key     string `json:"key"`
	Label   string `json:"label"`
	Seconds int    `json:"seconds"`
}

var granularities = []Granularity{
	{Key: "minute", Label: "分钟", Seconds: 60},
	{Key: "hour", Label: "小时", Seconds: 3600},
	{Key: "day", Label: "日", Seconds: 86400},
	{Key: "week", Label: "周", Seconds: 604800},
	{Key: "month", Label: "月", Seconds: 0}, // 自然月，非固定秒数
}

func (g Granularity) seconds() int {
	if g.Key == "month" {
		return 0
	}
	return g.Seconds
}

// truncate 把时间点对齐到该粒度的起点（周以周一为起点，月以自然月为起点）
func (g Granularity) truncate(t time.Time) time.Time {
	t = t.UTC()
	switch g.Key {
	case "minute":
		return t.Truncate(time.Minute)
	case "hour":
		return t.Truncate(time.Hour)
	case "day":
		return time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
	case "week":
		// Go 里 Weekday 以 Sunday=0 开始，转换成「周一为起点」
		offset := (int(t.Weekday()) + 6) % 7
		day := time.Date(t.Year(), t.Month(), t.Day(), 0, 0, 0, 0, time.UTC)
		return day.AddDate(0, 0, -offset)
	case "month":
		return time.Date(t.Year(), t.Month(), 1, 0, 0, 0, 0, time.UTC)
	}
	return t.Truncate(time.Minute)
}

// next 返回该粒度下的下一个时间点
func (g Granularity) next(t time.Time) time.Time {
	switch g.Key {
	case "minute":
		return t.Add(time.Minute)
	case "hour":
		return t.Add(time.Hour)
	case "day":
		return t.AddDate(0, 0, 1)
	case "week":
		return t.AddDate(0, 0, 7)
	case "month":
		return t.AddDate(0, 1, 0)
	}
	return t.Add(time.Minute)
}

// label 生成人类可读的刻度标签
func (g Granularity) label(t time.Time) string {
	t = t.UTC()
	switch g.Key {
	case "minute":
		return t.Format("15:04")
	case "hour":
		return t.Format("15:04")
	case "day":
		return t.Format("01-02")
	case "week":
		return t.Format("01-02")
	case "month":
		return t.Format("2006-01")
	}
	return t.Format("01-02 15:04")
}

// axis 生成 from..to 之间的稠密时间轴（含补零用的空刻度）
func (g Granularity) axis(from, to time.Time) []time.Time {
	start := g.truncate(from)
	end := g.truncate(to)
	out := make([]time.Time, 0, 64)
	for cur := start; !cur.After(end); cur = g.next(cur) {
		out = append(out, cur)
		if len(out) > 2000 {
			break
		}
	}
	if len(out) == 0 {
		out = append(out, end)
	}
	return out
}

func granularityFromSeconds(secs int) Granularity {
	// 自然值直接命中
	for _, g := range granularities {
		if g.Key != "month" && g.Seconds == secs {
			return g
		}
	}
	switch {
	case secs <= 60:
		return granularities[0]
	case secs <= 3600:
		return granularities[1]
	case secs <= 86400:
		return granularities[2]
	case secs <= 604800:
		return granularities[3]
	default:
		return granularities[4]
	}
}

func granularityByKey(key string) (Granularity, bool) {
	for _, g := range granularities {
		if g.Key == key {
			return g, true
		}
	}
	return Granularity{}, false
}

// TimeRange 是一个可选的预设时间范围
type TimeRange struct {
	Key   string `json:"key"`
	Label string `json:"label"`
}

var timeRanges = []TimeRange{
	{Key: "1h", Label: "最近 1 小时"},
	{Key: "24h", Label: "最近 24 小时"},
	{Key: "7d", Label: "最近 7 天"},
	{Key: "30d", Label: "最近 30 天"},
	{Key: "month", Label: "本月"},
	{Key: "lastmonth", Label: "上月"},
	{Key: "all", Label: "全部"},
}

// resolveRange 把预设 key 解析成时间区间
func resolveRange(key string, earliest time.Time) (time.Time, time.Time, bool) {
	now := time.Now().UTC()
	switch key {
	case "1h":
		return now.Add(-time.Hour), now, true
	case "24h":
		return now.Add(-24 * time.Hour), now, true
	case "7d":
		return now.AddDate(0, 0, -7), now, true
	case "30d":
		return now.AddDate(0, 0, -30), now, true
	case "month":
		return monthStartUTC(), now, true
	case "lastmonth":
		start := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, -1, 0)
		return start, start.AddDate(0, 1, 0), true
	case "all":
		if earliest.IsZero() {
			return now.Add(-24 * time.Hour), now, true
		}
		return earliest, now, true
	}
	return time.Time{}, time.Time{}, false
}

// defaultGranularity 按区间跨度给一个合理的默认粒度
func defaultGranularity(from, to time.Time) Granularity {
	span := to.Sub(from)
	switch {
	case span <= 2*time.Hour:
		return granularities[0] // minute
	case span <= 3*24*time.Hour:
		return granularities[1] // hour
	case span <= 90*24*time.Hour:
		return granularities[2] // day
	case span <= 400*24*time.Hour:
		return granularities[3] // week
	default:
		return granularities[4] // month
	}
}

func describeTimeline() map[string]any {
	return map[string]any{
		"granularities":  granularities,
		"ranges":         timeRanges,
		"range_default":  "24h",
		"gran_defaults":  "按区间跨度自动选择",
		"display_format": fmt.Sprintf("小时/分钟用 HH:MM，日用 MM-DD，月用 YYYY-MM"),
	}
}
