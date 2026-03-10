package configuracao

import (
	"errors"
	"strings"
)

// Validar garante que a configuração mínima para produção esteja consistente.
func Validar(cfg Configuracao) error {
	if strings.TrimSpace(cfg.Porta) == "" {
		return errors.New("porta da aplicação é obrigatória")
	}
	if strings.EqualFold(cfg.Ambiente, "production") {
		if len(strings.TrimSpace(cfg.SegredoJWT)) < 32 {
			return errors.New("JWT_SECRET deve ter no mínimo 32 caracteres em produção")
		}
		if strings.TrimSpace(cfg.FrontendsPermit) == "" {
			return errors.New("FRONTEND_URLS deve ser configurado em produção")
		}
	}
	return nil
}
