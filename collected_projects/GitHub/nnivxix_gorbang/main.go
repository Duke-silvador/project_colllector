package main

import (
	"charm.land/bubbletea/v2"
)

func main() {
	p := tea.NewProgram(initModel())
	if _, err := p.Run(); err != nil {
		panic(err)
	}
}
