package main

import (
	"fmt"
	"os/exec"
	"strconv"
	"strings"

	"charm.land/bubbles/v2/table"
	tea "charm.land/bubbletea/v2"
)

type Proc struct {
	PID  int
	Name string
	Addr string
}

func listProcs() []Proc {
	output, _ := loadProcs()
	result := string(output)
	lines := strings.Split(result, "\n")

	var procs []Proc

	for _, line := range lines {
		fields := strings.Fields(line)

		if len(fields) == 0 {
			continue
		}

		pid, err := strconv.Atoi(fields[1])
		if err != nil {
			continue
		}

		proc := Proc{
			PID:  pid,
			Name: string(fields[0]),
			Addr: fields[8],
		}
		procs = append(procs, proc)
	}

	return procs
}

func loadProcs() ([]byte, error) {
	commandLsf := `lsof -nP -iTCP -sTCP:LISTEN | grep -E '127\.0\.0\.1|\[::1\]|\*:'`

	cmd := exec.Command("bash", "-c", commandLsf)

	output, err := cmd.Output()

	if err != nil {
		fmt.Println("Error outputing result", err)
		return nil, err
	}

	return output, nil
}

func procsToRows(procs []Proc) []table.Row {
	rows := make([]table.Row, 0, len(procs))
	for _, p := range procs {
		rows = append(rows, table.Row{
			strconv.Itoa(p.PID),
			p.Name,
			p.Addr,
		})
	}
	return rows
}

func killProc(pid int) tea.Cmd {
	return func() tea.Msg {
		_ = exec.Command("kill", strconv.Itoa(pid)).Run()
		return procsReloadedMsg{}
	}
}
