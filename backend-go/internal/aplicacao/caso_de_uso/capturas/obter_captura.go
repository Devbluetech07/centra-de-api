package capturas

import (
	"context"

	dominio "backend-go/internal/dominio/capturas"
	"github.com/google/uuid"
)

type ObterCapturaCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoObterCapturaCasoDeUso(repo dominio.Repositorio) *ObterCapturaCasoDeUso {
	return &ObterCapturaCasoDeUso{repo: repo}
}

func (c *ObterCapturaCasoDeUso) Executar(ctx context.Context, id uuid.UUID, tokenHash string) (*dominio.Captura, error) {
	return c.repo.ObterPorID(ctx, id, tokenHash)
}
