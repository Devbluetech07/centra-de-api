package jwt

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// Gerar cria token JWT para um assunto.
func Gerar(segredo, assunto string, duracao time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"sub": assunto,
		"exp": time.Now().Add(duracao).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(segredo))
}
