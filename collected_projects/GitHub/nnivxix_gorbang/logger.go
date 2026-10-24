package main

import (
	"context"
	"log/slog"
	"os"
)

type fileHandler struct {
	path string
	opts *slog.HandlerOptions
}

func (h fileHandler) Enabled(context.Context, slog.Level) bool { return true }

func (h fileHandler) Handle(_ context.Context, r slog.Record) error {
	f, err := os.OpenFile(h.path, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()

	return slog.NewTextHandler(f, h.opts).Handle(context.Background(), r)
}

func (h fileHandler) WithAttrs([]slog.Attr) slog.Handler { return h }

func (h fileHandler) WithGroup(string) slog.Handler { return h }

func newLogger() *slog.Logger {
	return slog.New(fileHandler{path: "logger.log"})
}
