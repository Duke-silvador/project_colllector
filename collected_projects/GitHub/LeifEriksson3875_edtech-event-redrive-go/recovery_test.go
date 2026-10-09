package main

import (
	"reflect"
	"testing"
	"time"
)

func TestClassify(t *testing.T) {
	now := time.Date(2026, 9, 20, 12, 0, 0, 0, time.UTC)
	for _, tc := range []struct {
		name   string
		events []Event
		want   Decision
	}{
		{"overdue work", []Event{{"lesson-1", "algebra", "course_delivery", now, false}, {"due-2", "algebra", "learner_deadline", now, false}, {"report-3", "algebra", "educator_report", now, false}}, Decision{[]string{"lesson-1"}, []string{"due-2"}, []string{"report-3"}}},
		{"already seen or future", []Event{{"lesson-1", "algebra", "course_delivery", now, true}, {"due-2", "algebra", "learner_deadline", now.Add(time.Hour), false}}, Decision{[]string{}, []string{}, []string{}}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := classify(tc.events, now); !reflect.DeepEqual(got, tc.want) {
				t.Fatalf("got %+v, want %+v", got, tc.want)
			}
		})
	}
}
