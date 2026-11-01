// lucky-forge-lite — 
// 处理日常小任务的工具
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strings"
)

func collect(r *bufio.Reader) []string {
	var lines []string
	for {
		line, err := r.ReadString('\n')
		if t := strings.TrimSpace(line); t != "" {
			lines = append(lines, t)
		}
		if err != nil {
			break
		}
	}
	return lines
}

func report(lines []string) {
	counts := map[string]int{}
	for _, l := range lines {
		counts[l]++
	}
	type kv struct { k string; v int }
	var pairs []kv
	for k, v := range counts {
		pairs = append(pairs, kv{k, v})
	}
	sort.Slice(pairs, func(i, j int) bool { return pairs[i].v > pairs[j].v })
	for _, p := range pairs {
		fmt.Printf("%4d  %s\n", p.v, p.k)
	}
	fmt.Printf("---\n%d unique / %d lines\n", len(counts), len(lines))
}

func main() {
	lines := collect(bufio.NewReader(os.Stdin))
	if len(lines) == 0 {
		fmt.Fprintln(os.Stderr, "no input")
		os.Exit(1)
	}
	report(lines)
}
