package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"
)

func run() error {
	input := flag.String("input", "", "JSON event snapshot")
	webhook := flag.String("webhook", "", "webhook ID")
	queue := flag.String("queue", "", "own dead-letter queue to redrive")
	interval := flag.Duration("interval", time.Second, "minimum interval before redrive")
	base := flag.String("base-url", defaultBaseURL, "Infrai base URL")
	flag.Parse()
	key := os.Getenv("INFRAI_API_KEY")
	if key == "" || *input == "" || *webhook == "" || *queue == "" || *interval < 0 {
		return fmt.Errorf("set INFRAI_API_KEY, -input, -webhook, -queue and a nonnegative -interval")
	}
	file, err := os.ReadFile(*input)
	if err != nil {
		return err
	}
	var events []Event
	if err := json.Unmarshal(file, &events); err != nil {
		return err
	}
	d := classify(events, time.Now().UTC())
	c := client{base: *base, key: key, http: &http.Client{Timeout: 15 * time.Second}}
	ctx := context.Background()
	history, err := c.deliveries(ctx, *webhook)
	if err != nil {
		return err
	}
	if d.count() > 0 {
		timer := time.NewTimer(*interval)
		<-timer.C
		// Stable request identity keeps repeated submissions tied to this snapshot and queue.
		sum := sha256.Sum256(append(append([]byte(*queue+":"+*webhook+":"), file...), byte(0)))
		if err := c.redrive(ctx, *queue, hex.EncodeToString(sum[:])); err != nil {
			return err
		}
	}
	return json.NewEncoder(os.Stdout).Encode(struct {
		Decision   Decision        `json:"decision"`
		Deliveries json.RawMessage `json:"delivery_history"`
		Redrive    bool            `json:"redrive_requested"`
	}{d, history, d.count() > 0})
}

func main() {
	if err := run(); err != nil {
		log.Fatal(err)
	}
}
