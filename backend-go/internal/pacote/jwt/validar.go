package jwt

import (
	"github.com/golang-jwt/jwt/v5"
)

// Validar verifica assinatura e validade do token.
func Validar(segredo, token string) (*jwt.Token, error) {
	return jwt.Parse(token, func(t *jwt.Token) (any, error) {
		return []byte(segredo), nil
	})
}
