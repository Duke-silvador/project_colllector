package main

import (
	"encoding/json"
	"os"
	"path/filepath"
	"sync"
)

// QuotaSettings 月池总额度。StepFun 官方未开放月池查询接口，
// 因此总额度由用户按自己的订阅档位填写，插件据此算剩余与占比。
type QuotaSettings struct {
	TotalCredit float64 `json:"total_credit"`
	PlanName    string  `json:"plan_name,omitempty"`
}

type planPreset struct {
	Name   string  `json:"name"`
	Credit float64 `json:"credit"`
}

// 官方档位（Step Plan 概述）
var planPresets = []planPreset{
	{Name: "Flash Mini", Credit: 400e6},
	{Name: "Flash Plus", Credit: 1600e6},
	{Name: "Flash Pro", Credit: 8000e6},
	{Name: "Flash Max", Credit: 40000e6},
}

var (
	quotaMu  sync.RWMutex
	quotaCfg = QuotaSettings{}
)

func quotaSettingsPath() string {
	return filepath.Join(storeDir(), "stepfun-credit-settings.json")
}

func loadQuotaSettings() {
	raw, err := os.ReadFile(quotaSettingsPath())
	if err != nil {
		return
	}
	var s QuotaSettings
	if json.Unmarshal(raw, &s) != nil {
		return
	}
	quotaMu.Lock()
	quotaCfg = s
	quotaMu.Unlock()
}

func saveQuotaSettings(s QuotaSettings) {
	quotaMu.Lock()
	quotaCfg = s
	quotaMu.Unlock()

	if err := os.MkdirAll(storeDir(), 0o700); err != nil {
		return
	}
	raw, err := json.Marshal(s)
	if err != nil {
		return
	}
	tmp := quotaSettingsPath() + ".tmp"
	if err := os.WriteFile(tmp, raw, 0o600); err != nil {
		return
	}
	_ = os.Rename(tmp, quotaSettingsPath())
}

func currentQuota() QuotaSettings {
	quotaMu.RLock()
	defer quotaMu.RUnlock()
	return quotaCfg
}
