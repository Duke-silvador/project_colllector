//go:build cgo

package main

/*
#include <stdint.h>
#include <stdlib.h>

typedef struct {
	void* ptr;
	size_t len;
} cliproxy_buffer;

typedef int (*cliproxy_host_call_fn)(void*, const char*, const uint8_t*, size_t, cliproxy_buffer*);
typedef void (*cliproxy_host_free_fn)(void*, size_t);

typedef struct {
	uint32_t abi_version;
	void* host_ctx;
	cliproxy_host_call_fn call;
	cliproxy_host_free_fn free_buffer;
} cliproxy_host_api;

typedef int (*cliproxy_plugin_call_fn)(const char*, const uint8_t*, size_t, cliproxy_buffer*);
typedef void (*cliproxy_plugin_free_fn)(void*, size_t);
typedef void (*cliproxy_plugin_shutdown_fn)(void);

typedef struct {
	uint32_t abi_version;
	cliproxy_plugin_call_fn call;
	cliproxy_plugin_free_fn free_buffer;
	cliproxy_plugin_shutdown_fn shutdown;
} cliproxy_plugin_api;

extern int cliproxyPluginCall(char*, uint8_t*, size_t, cliproxy_buffer*);
extern void cliproxyPluginFree(void*, size_t);
extern void cliproxyPluginShutdown(void);

extern int cliproxy_plugin_call_bridge(const char*, const uint8_t*, size_t, cliproxy_buffer*);
extern int cliproxy_host_call_bridge(cliproxy_host_api*, const char*, const uint8_t*, size_t, cliproxy_buffer*);
extern void cliproxy_host_free_bridge(cliproxy_host_api*, void*, size_t);
*/
import "C"

import (
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"unsafe"
)

const abiVersion uint32 = 1

// 宿主 API 指针：插件通过它回调宿主（host.auth.list 等）。
// 宿主的回调上下文在 management.handle / quota.fetch 这类调用期间是打开的。
var hostAPI struct {
	sync.Mutex
	host     *C.cliproxy_host_api
	inFlight int
}

//export cliproxy_plugin_init
func cliproxy_plugin_init(host *C.cliproxy_host_api, plugin *C.cliproxy_plugin_api) (result C.int) {
	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintln(os.Stderr, "stepfun-credit-tracker: init panic:", r)
			result = 3
		}
	}()
	if plugin == nil {
		return 1
	}
	if host != nil && uint32(host.abi_version) != abiVersion {
		return 2
	}
	hostAPI.Lock()
	hostAPI.host = host
	hostAPI.Unlock()

	plugin.abi_version = C.uint32_t(abiVersion)
	plugin.call = C.cliproxy_plugin_call_fn(C.cliproxy_plugin_call_bridge)
	plugin.free_buffer = C.cliproxy_plugin_free_fn(C.cliproxyPluginFree)
	plugin.shutdown = C.cliproxy_plugin_shutdown_fn(C.cliproxyPluginShutdown)
	return 0
}

//export cliproxyPluginCall
func cliproxyPluginCall(method *C.char, request *C.uint8_t, requestLen C.size_t, response *C.cliproxy_buffer) (result C.int) {
	if response == nil {
		return 1
	}
	response.ptr = nil
	response.len = 0

	defer func() {
		if r := recover(); r != nil {
			fmt.Fprintln(os.Stderr, "stepfun-credit-tracker: call panic:", r)
			if writeCResponse(response, errorResult("plugin_panic", "plugin call failed", 500)) {
				result = 0
			} else {
				result = 2
			}
		}
	}()

	if method == nil {
		if writeCResponse(response, errorResult("invalid_method", "method is required", 400)) {
			return 0
		}
		return 2
	}

	var requestBytes []byte
	if request != nil && requestLen > 0 {
		if uint64(requestLen) > uint64(1<<31-1) {
			writeCResponse(response, errorResult("request_too_large", "request is too large", 413))
			return 0
		}
		requestBytes = C.GoBytes(unsafe.Pointer(request), C.int(requestLen))
	}

	if writeCResponse(response, dispatchRPC(C.GoString(method), requestBytes)) {
		return 0
	}
	return 2
}

//export cliproxyPluginFree
func cliproxyPluginFree(ptr unsafe.Pointer, _ C.size_t) {
	defer func() { _ = recover() }()
	if ptr != nil {
		C.free(ptr)
	}
}

//export cliproxyPluginShutdown
func cliproxyPluginShutdown() {
	defer func() { _ = recover() }()
	shutdownState()
}

// callHost 调用宿主 API。返回结果里的 result 字段（已剥掉 envelope）。
func callHost(method string, payload []byte) (json.RawMessage, error) {
	hostAPI.Lock()
	host := hostAPI.host
	if host == nil {
		hostAPI.Unlock()
		return nil, fmt.Errorf("host API unavailable")
	}
	hostAPI.inFlight++
	hostAPI.Unlock()
	defer func() {
		hostAPI.Lock()
		hostAPI.inFlight--
		hostAPI.Unlock()
	}()

	cMethod := C.CString(method)
	defer C.free(unsafe.Pointer(cMethod))

	var reqPtr *C.uint8_t
	if len(payload) > 0 {
		reqPtr = (*C.uint8_t)(C.CBytes(payload))
		defer C.free(unsafe.Pointer(reqPtr))
	}

	var resp C.cliproxy_buffer
	if rc := C.cliproxy_host_call_bridge(host, cMethod, reqPtr, C.size_t(len(payload)), &resp); rc != 0 {
		return nil, fmt.Errorf("host call %s failed: rc=%d", method, int(rc))
	}
	if resp.ptr == nil || resp.len == 0 {
		return nil, fmt.Errorf("host call %s returned empty response", method)
	}
	defer C.cliproxy_host_free_bridge(host, resp.ptr, resp.len)

	raw := C.GoBytes(unsafe.Pointer(resp.ptr), C.int(resp.len))
	var env struct {
		OK     bool            `json:"ok"`
		Result json.RawMessage `json:"result"`
		Error  *struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.Unmarshal(raw, &env); err != nil {
		return nil, fmt.Errorf("decode host response: %w", err)
	}
	if !env.OK {
		msg := "host call failed"
		if env.Error != nil && env.Error.Message != "" {
			msg = env.Error.Message
		}
		return nil, fmt.Errorf("%s", msg)
	}
	return env.Result, nil
}

func writeCResponse(response *C.cliproxy_buffer, raw []byte) bool {
	if response == nil || len(raw) == 0 {
		return false
	}
	ptr := C.CBytes(raw)
	if ptr == nil {
		return false
	}
	response.ptr = ptr
	response.len = C.size_t(len(raw))
	return true
}
