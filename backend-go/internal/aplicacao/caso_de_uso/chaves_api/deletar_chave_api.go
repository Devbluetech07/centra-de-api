package chaves_api

import (
	"context"

	dominio "backend-go/internal/dominio/chaves_api"
	"github.com/google/uuid"
)

type DeletarChaveAPICasoDeUso struct {
	repo dominio.Repositorio
}

func NovoDeletarChaveAPICasoDeUso(repo dominio.Repositorio) *DeletarChaveAPICasoDeUso {
	return &DeletarChaveAPICasoDeUso{repo: repo}
}

func (c *DeletarChaveAPICasoDeUso) Executar(ctx context.Context, id uuid.UUID, tokenHash string) error {
	return c.repo.Deletar(ctx, id, tokenHash)
}
