package capturas

import (
	"context"

	dominio "backend-go/internal/dominio/capturas"
)

type ListarCapturasCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoListarCapturasCasoDeUso(repo dominio.Repositorio) *ListarCapturasCasoDeUso {
	return &ListarCapturasCasoDeUso{repo: repo}
}

func (c *ListarCapturasCasoDeUso) Executar(ctx context.Context, tokenHash, tipoServico string, limite, deslocamento int) ([]*dominio.Captura, error) {
	return c.repo.Listar(ctx, tokenHash, tipoServico, limite, deslocamento)
}
