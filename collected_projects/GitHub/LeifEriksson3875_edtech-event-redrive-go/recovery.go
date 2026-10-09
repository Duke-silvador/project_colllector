package main

import (
	"time"
)

type Event struct {
	ID       string    `json:"id"`
	Course   string    `json:"course"`
	Kind     string    `json:"kind"`
	Deadline time.Time `json:"deadline"`
	Seen     bool      `json:"seen"`
}

type Decision struct {
	CourseDelivery  []string `json:"course_delivery"`
	LearnerDeadline []string `json:"learner_deadline"`
	EducatorReport  []string `json:"educator_report"`
}

func classify(events []Event, now time.Time) Decision {
	d := Decision{[]string{}, []string{}, []string{}}
	for _, e := range events {
		if e.Seen || e.ID == "" || e.Course == "" || e.Deadline.After(now) {
			continue
		}
		switch e.Kind {
		case "course_delivery":
			d.CourseDelivery = append(d.CourseDelivery, e.ID)
		case "learner_deadline":
			d.LearnerDeadline = append(d.LearnerDeadline, e.ID)
		case "educator_report":
			d.EducatorReport = append(d.EducatorReport, e.ID)
		}
	}
	return d
}

func (d Decision) count() int {
	return len(d.CourseDelivery) + len(d.LearnerDeadline) + len(d.EducatorReport)
}
