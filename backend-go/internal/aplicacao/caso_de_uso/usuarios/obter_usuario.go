package usuarios

import (
	"context"

	dominio "backend-go/internal/dominio/usuarios"
	"github.com/google/uuid"
)

type ObterUsuarioCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoObterUsuarioCasoDeUso(repo dominio.Repositorio) *ObterUsuarioCasoDeUso {
	return &ObterUsuarioCasoDeUso{repo: repo}
}

func (c *ObterUsuarioCasoDeUso) Executar(ctx context.Context, id uuid.UUID) (*dominio.Usuario, error) {
	return c.repo.ObterPorID(ctx, id)
}
