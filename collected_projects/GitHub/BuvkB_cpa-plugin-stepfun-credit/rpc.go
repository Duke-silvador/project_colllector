package main

import "encoding/json"

type rpcEnvelope struct {
	OK     bool            `json:"ok"`
	Result json.RawMessage `json:"result,omitempty"`
	Error  *rpcError       `json:"error,omitempty"`
}

type rpcError struct {
	Code       string `json:"code"`
	Message    string `json:"message"`
	Retryable  bool   `json:"retryable,omitempty"`
	HTTPStatus int    `json:"http_status,omitempty"`
}

const (
	mPluginRegister     = "plugin.register"
	mPluginReconfigure  = "plugin.reconfigure"
	mPluginShutdown     = "plugin.shutdown"
	mUsageHandle        = "usage.handle"
	mManagementRegister = "management.register"
	mManagementHandle   = "management.handle"
	mQuotaIdentifier    = "quota.identifier"
	mQuotaDescribe      = "quota.describe"
	mQuotaFetch         = "quota.fetch"
	mQuotaReset         = "quota.reset"
)

const rpcSchemaVersion uint32 = 6

func marshalOK(value any) []byte {
	result, err := json.Marshal(value)
	if err != nil {
		return marshalErr("marshal_error", err.Error(), 500)
	}
	raw, err := json.Marshal(rpcEnvelope{OK: true, Result: result})
	if err != nil {
		return []byte("{\"ok\":false,\"error\":{\"code\":\"marshal_error\",\"message\":\"failed to encode response\"}}")
	}
	return raw
}

func marshalErr(code, message string, status int) []byte {
	raw, _ := json.Marshal(rpcEnvelope{OK: false, Error: &rpcError{Code: code, Message: message, HTTPStatus: status}})
	return raw
}

func errorResult(code, message string, status int) []byte {
	return marshalErr(code, message, status)
}

func dispatchRPC(method string, request []byte) []byte {
	switch method {
	case mPluginRegister, mPluginReconfigure:
		return marshalOK(registerPlugin(request))
	case mPluginShutdown:
		shutdownState()
		return marshalOK(map[string]any{})
	case mUsageHandle:
		return marshalOK(handleUsage(request))
	case mManagementRegister:
		return marshalOK(registerManagement(request))
	case mManagementHandle:
		return marshalOK(handleManagement(request))
	case mQuotaIdentifier:
		return marshalOK(map[string]any{"identifier": quotaIdentifier()})
	case mQuotaDescribe:
		return marshalOK(describeQuota())
	case mQuotaFetch:
		return marshalOK(fetchQuota(request))
	case mQuotaReset:
		return marshalOK(map[string]any{"success": false, "message": "订阅额度不支持重置"})
	default:
		return marshalErr("unknown_method", "unknown method: "+method, 404)
	}
}
