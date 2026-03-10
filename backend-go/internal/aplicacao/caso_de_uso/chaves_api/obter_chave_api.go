package chaves_api

import (
	"context"

	dominio "backend-go/internal/dominio/chaves_api"
	"github.com/google/uuid"
)

type ObterChaveAPICasoDeUso struct {
	repo dominio.Repositorio
}

func NovoObterChaveAPICasoDeUso(repo dominio.Repositorio) *ObterChaveAPICasoDeUso {
	return &ObterChaveAPICasoDeUso{repo: repo}
}

func (c *ObterChaveAPICasoDeUso) Executar(ctx context.Context, id uuid.UUID, tokenHash string) (*dominio.ChaveAPI, error) {
	return c.repo.ObterPorID(ctx, id, tokenHash)
}
