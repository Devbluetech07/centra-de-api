package security

import (
	"fmt"
	"os"
	"strings"
)

var blockedSecretValues = map[string]struct{}{
	"changeme-secret":               {},
	"secret":                        {},
	"jwt-secret":                    {},
	"default":                       {},
	"portal-demo":                   {},
	"ALTERAR_TOKEN_JWT_64_CHARS":    {},
	"CHANGE_ME_JWT_SECRET_32_CHARS": {},
}

func validateSecretValue(name, value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		return fmt.Errorf("%s nao definido", name)
	}
	if len(trimmed) < 32 {
		return fmt.Errorf("%s deve ter no minimo 32 caracteres", name)
	}
	if _, blocked := blockedSecretValues[trimmed]; blocked {
		return fmt.Errorf("%s usa valor padrao inseguro", name)
	}
	return nil
}

func ValidateSecrets() error {
	if err := validateSecretValue("JWT_SECRET", os.Getenv("JWT_SECRET")); err != nil {
		return err
	}
	return nil
}

func GetJWTSecret() (string, error) {
	secret := os.Getenv("JWT_SECRET")
	if err := validateSecretValue("JWT_SECRET", secret); err != nil {
		return "", err
	}
	return strings.TrimSpace(secret), nil
}
