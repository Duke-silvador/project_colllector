package main

import (
	"encoding/json"
	"sync"
)

const pluginName = "StepFun Credit Tracker"
const pluginVersion = "1.1.0"
const pluginRepo = "https://github.com/curi/cpa-plugin-stepfun-credit"

// StepFun 官方图标（开放平台 title-logo）
const pluginLogo = "https://platform.stepfun.com/images/title-logo.png"

type metadata struct {
	Name             string        `json:"Name"`
	Version          string        `json:"Version"`
	Author           string        `json:"Author"`
	GitHubRepository string        `json:"GitHubRepository"`
	Logo             string        `json:"Logo,omitempty"`
	ConfigFields     []configField `json:"ConfigFields"`
}

type configField struct {
	Name        string   `json:"Name"`
	Type        string   `json:"Type"`
	EnumValues  []string `json:"EnumValues,omitempty"`
	Description string   `json:"Description"`
}

type capabilities struct {
	UsagePlugin   bool `json:"usage_plugin"`
	ManagementAPI bool `json:"management_api"`
	QuotaProvider bool `json:"quota_provider"`
}

type registration struct {
	SchemaVersion uint32       `json:"schema_version"`
	Metadata      metadata     `json:"metadata"`
	Capabilities  capabilities `json:"capabilities"`
}

type lifecycleRequest struct {
	ConfigYAML    []byte `json:"config_yaml"`
	SchemaVersion uint32 `json:"schema_version"`
}

type runtimeState struct {
	mu       sync.RWMutex
	pluginID string
	routes   registeredRoutes
	started  bool
}

var state = &runtimeState{}

func registerPlugin(raw []byte) registration {
	var req lifecycleRequest
	if len(raw) > 0 {
		_ = json.Unmarshal(raw, &req)
	}
	schema := req.SchemaVersion
	if schema == 0 || schema > rpcSchemaVersion {
		schema = rpcSchemaVersion
	}

	state.mu.Lock()
	if !state.started {
		state.started = true
		store.load()
	}
	state.mu.Unlock()

	return registration{
		SchemaVersion: schema,
		Metadata: metadata{
			Name:             pluginName,
			Version:          pluginVersion,
			Author:           "curi",
			GitHubRepository: pluginRepo,
			Logo:             pluginLogo,
			ConfigFields: []configField{
				{
					Name:        "data_path",
					Type:        "string",
					Description: "用量数据存放目录，默认与 CPA 可执行文件同级的 data/。",
				},
				{
					Name:        "retention_days",
					Type:        "integer",
					Description: "用量明细保留天数，默认 180。",
				},
			},
		},
		Capabilities: capabilities{
			UsagePlugin:   true,
			ManagementAPI: true,
			QuotaProvider: true,
		},
	}
}

func shutdownState() {
	state.mu.Lock()
	started := state.started
	state.started = false
	state.mu.Unlock()
	if started {
		store.save()
	}
}
