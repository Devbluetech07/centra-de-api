package chaves_api

import (
	"context"

	dominio "backend-go/internal/dominio/chaves_api"
)

type AtualizarChaveAPICasoDeUso struct {
	repo dominio.Repositorio
}

func NovoAtualizarChaveAPICasoDeUso(repo dominio.Repositorio) *AtualizarChaveAPICasoDeUso {
	return &AtualizarChaveAPICasoDeUso{repo: repo}
}

func (c *AtualizarChaveAPICasoDeUso) Executar(ctx context.Context, chave *dominio.ChaveAPI) error {
	return c.repo.Atualizar(ctx, chave)
}
