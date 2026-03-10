package handlers

import "testing"

func TestBuildGetCapturesQuery_NoFilter(t *testing.T) {
	query, args, err := buildGetCapturesQuery("user-1", nil, "", 20, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if query == "" {
		t.Fatal("query should not be empty")
	}
	if len(args) != 3 {
		t.Fatalf("expected 3 args, got %d", len(args))
	}
}

func TestBuildGetCapturesQuery_WithValidFilter(t *testing.T) {
	query, args, err := buildGetCapturesQuery("user-1", nil, "documento", 10, 5)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if query == "" {
		t.Fatal("query should not be empty")
	}
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d", len(args))
	}
}

func TestBuildGetCapturesQuery_RejectsInjection(t *testing.T) {
	_, _, err := buildGetCapturesQuery("user-1", nil, "documento' OR 1=1 --", 10, 0)
	if err == nil {
		t.Fatal("expected validation error for invalid service_type")
	}
}

func TestBuildGetCapturesQuery_UsesTokenHashWhenPresent(t *testing.T) {
	query, args, err := buildGetCapturesQuery("user-1", "abc123hash", "documento", 10, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if query == "" {
		t.Fatal("query should not be empty")
	}
	if len(args) != 4 {
		t.Fatalf("expected 4 args, got %d", len(args))
	}
}

func TestBuildSafeObjectMetadata_OnlyWhitelistedAndTrimmed(t *testing.T) {
	meta := map[string]any{
		"latitude":   -23.5505,
		"longitude":  -46.6333,
		"endereco":   "Sao Paulo - SP",
		"user_agent": "this should be ignored to avoid oversized headers",
	}

	got := buildSafeObjectMetadata(meta)

	if len(got) != 3 {
		t.Fatalf("expected 3 metadata entries, got %d", len(got))
	}
	if got["latitude"] == "" || got["longitude"] == "" || got["endereco"] == "" {
		t.Fatal("expected latitude, longitude and endereco to be preserved")
	}
	if _, exists := got["user_agent"]; exists {
		t.Fatal("user_agent should not be forwarded to MinIO object metadata")
	}
}

func TestBuildSafeObjectMetadata_TruncatesLongValues(t *testing.T) {
	longAddress := "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	meta := map[string]any{
		"endereco": longAddress,
	}

	got := buildSafeObjectMetadata(meta)
	if len(got["endereco"]) != maxObjectMetaValueLen {
		t.Fatalf("expected endereco length to be %d, got %d", maxObjectMetaValueLen, len(got["endereco"]))
	}
}
