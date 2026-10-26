// flat-bridge-hub — Building internal tooling for fun.
// 拿来练手的小仓库
package main

import (
	"bufio"
	"fmt"
	"os"
	"sort"
	"strings"
)

func main() {
	counts := map[string]int{}
	total := 0
	sc := bufio.NewScanner(os.Stdin)
	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" {
			continue
		}
		counts[line]++
		total++
	}
	type kv struct {
		k string
		v int
	}
	var items []kv
	for k, v := range counts {
		items = append(items, kv{k, v})
	}
	sort.Slice(items, func(i, j int) bool { return items[i].v > items[j].v })
	for _, it := range items {
		fmt.Printf("%4d  %s\n", it.v, it.k)
	}
	fmt.Printf("---\n%d unique / %d lines\n", len(items), total)
}
