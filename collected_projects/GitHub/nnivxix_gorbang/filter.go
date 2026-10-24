package main

import (
	"strings"

	"charm.land/bubbles/v2/table"
)

func filterRows(rows []table.Row, query string) []table.Row {
	q := strings.ToLower(strings.TrimSpace(query))

	if q == "" {
		return rows
	}

	filtered := make([]table.Row, 0, len(rows))

	for _, r := range rows {
		for _, cell := range r {
			value := strings.ToLower(cell)
			if strings.Contains(value, q) {
				filtered = append(filtered, r)
				break
			}
		}
	}

	return filtered
}
