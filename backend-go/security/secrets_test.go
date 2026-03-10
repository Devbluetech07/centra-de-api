package security

import "testing"

func TestValidateSecrets_RejectsShortJWT(t *testing.T) {
	t.Setenv("JWT_SECRET", "short-secret")
	if err := ValidateSecrets(); err == nil {
		t.Fatal("expected error for short JWT_SECRET")
	}
}

func TestValidateSecrets_AcceptsStrongJWT(t *testing.T) {
	t.Setenv("JWT_SECRET", "this-is-a-very-strong-jwt-secret-with-40-chars")
	if err := ValidateSecrets(); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}
