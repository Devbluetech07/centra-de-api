package chaves_api

import (
	"context"

	dominio "backend-go/internal/dominio/chaves_api"
)

type CriarChaveAPICasoDeUso struct {
	servico *dominio.Servico
}

func NovoCriarChaveAPICasoDeUso(servico *dominio.Servico) *CriarChaveAPICasoDeUso {
	return &CriarChaveAPICasoDeUso{servico: servico}
}

func (c *CriarChaveAPICasoDeUso) Executar(ctx context.Context, chave *dominio.ChaveAPI) error {
	return c.servico.Criar(ctx, chave)
}
