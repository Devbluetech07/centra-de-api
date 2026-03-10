package usuarios

import (
	"context"

	dominio "backend-go/internal/dominio/usuarios"
	"github.com/google/uuid"
)

type DeletarUsuarioCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoDeletarUsuarioCasoDeUso(repo dominio.Repositorio) *DeletarUsuarioCasoDeUso {
	return &DeletarUsuarioCasoDeUso{repo: repo}
}

func (c *DeletarUsuarioCasoDeUso) Executar(ctx context.Context, id uuid.UUID) error {
	return c.repo.Deletar(ctx, id)
}
