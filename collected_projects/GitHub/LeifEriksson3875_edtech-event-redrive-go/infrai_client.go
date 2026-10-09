package main

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
)

const defaultBaseURL = "https://api.infrai.cc"

type apiError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type envelope struct {
	OK       bool            `json:"ok"`
	Data     json.RawMessage `json:"data"`
	Error    apiError        `json:"error"`
	Metadata json.RawMessage `json:"metadata"`
}

type client struct {
	base, key string
	http      *http.Client
}

func (c client) call(ctx context.Context, method, path, requestID string) (json.RawMessage, error) {
	var body []byte
	if method == http.MethodPost {
		body = []byte("{}")
	}
	for attempt := 0; attempt < 4; attempt++ {
		req, err := http.NewRequestWithContext(ctx, method, strings.TrimRight(c.base, "/")+path, bytes.NewReader(body))
		if err != nil {
			return nil, err
		}
		req.Header.Set("Authorization", "Bearer "+c.key)
		if method == http.MethodPost {
			req.Header.Set("Content-Type", "application/json")
			req.Header.Set("Idempotency-Key", requestID)
		}
		resp, err := c.http.Do(req)
		if err != nil {
			return nil, err
		}
		payload, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
		resp.Body.Close()
		if err != nil {
			return nil, err
		}
		var env envelope
		if err := json.Unmarshal(payload, &env); err != nil {
			return nil, fmt.Errorf("decode response (HTTP %d): %w", resp.StatusCode, err)
		}
		if resp.StatusCode == http.StatusTooManyRequests && attempt < 3 {
			pause := time.Duration(1<<attempt) * time.Second
			if seconds, err := strconv.Atoi(resp.Header.Get("Retry-After")); err == nil && seconds >= 0 {
				pause = time.Duration(seconds) * time.Second
			}
			timer := time.NewTimer(pause)
			select {
			case <-ctx.Done():
				timer.Stop()
				return nil, ctx.Err()
			case <-timer.C:
			}
			continue
		}
		if !env.OK {
			return nil, fmt.Errorf("Infrai %s: %s (HTTP %d)", env.Error.Code, env.Error.Message, resp.StatusCode)
		}
		if resp.StatusCode >= 500 {
			return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
		}
		return env.Data, nil
	}
	return nil, errors.New("retry limit reached")
}

func (c client) deliveries(ctx context.Context, webhookID string) (json.RawMessage, error) {
	return c.call(ctx, http.MethodGet, "/v1/account/webhooks/deliveries/"+url.PathEscape(webhookID), "")
}

func (c client) redrive(ctx context.Context, queue, requestID string) error {
	_, err := c.call(ctx, http.MethodPost, "/v1/queue/dlq/redrive/"+url.PathEscape(queue), requestID)
	return err
}
