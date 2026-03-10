package chaves_api

import (
	"context"

	dominio "backend-go/internal/dominio/chaves_api"
)

type ListarChavesAPICasoDeUso struct {
	repo dominio.Repositorio
}

func NovoListarChavesAPICasoDeUso(repo dominio.Repositorio) *ListarChavesAPICasoDeUso {
	return &ListarChavesAPICasoDeUso{repo: repo}
}

func (c *ListarChavesAPICasoDeUso) Executar(ctx context.Context, tokenHash string) ([]*dominio.ChaveAPI, error) {
	return c.repo.ListarPorTokenHash(ctx, tokenHash)
}
