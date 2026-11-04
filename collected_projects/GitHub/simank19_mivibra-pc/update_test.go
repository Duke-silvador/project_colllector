package main

import "testing"

func TestNewer(t *testing.T) {
	cases := []struct {
		a, b string
		want bool
	}{{"2.2.0", "2.1.1", true}, {"v2.10.0", "2.9.9", true}, {"2.1.1", "2.1.1", false}, {"2.1.0", "2.1.1", false}, {"v3.0.0-beta", "2.9.0", true}}
	for _, c := range cases {
		if newer(c.a, c.b) != c.want {
			t.Errorf("newer(%s,%s) != %v", c.a, c.b, c.want)
		}
	}
}
