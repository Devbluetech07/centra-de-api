package main

import "testing"

func TestValidateOrigins_ProductionRejectsHTTP(t *testing.T) {
	_, err := validateOrigins("http://app.example.com", true)
	if err == nil {
		t.Fatal("expected error for non-https origin in production")
	}
}

func TestValidateOrigins_ProductionRejectsLocalhost(t *testing.T) {
	_, err := validateOrigins("https://localhost:3000", true)
	if err == nil {
		t.Fatal("expected error for localhost in production")
	}
}

func TestValidateOrigins_ProductionAcceptsHTTPS(t *testing.T) {
	origins, err := validateOrigins("https://app.example.com", true)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(origins) != 1 || origins[0] != "https://app.example.com" {
		t.Fatalf("unexpected origins: %#v", origins)
	}
}

func TestValidateOrigins_DevelopmentFallback(t *testing.T) {
	origins, err := validateOrigins("", false)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(origins) == 0 {
		t.Fatal("expected fallback origins")
	}
}
