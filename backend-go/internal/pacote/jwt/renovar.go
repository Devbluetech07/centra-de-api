package jwt

import "time"

// Renovar gera novo token reaproveitando assunto.
func Renovar(segredo, assunto string) (string, error) {
	return Gerar(segredo, assunto, 24*time.Hour)
}
