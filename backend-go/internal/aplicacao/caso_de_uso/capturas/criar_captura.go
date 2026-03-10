package capturas

import (
	"context"

	dominio "backend-go/internal/dominio/capturas"
)

type CriarCapturaCasoDeUso struct {
	servico *dominio.Servico
}

func NovoCriarCapturaCasoDeUso(servico *dominio.Servico) *CriarCapturaCasoDeUso {
	return &CriarCapturaCasoDeUso{servico: servico}
}

func (c *CriarCapturaCasoDeUso) Executar(ctx context.Context, captura *dominio.Captura) error {
	return c.servico.Criar(ctx, captura)
}
