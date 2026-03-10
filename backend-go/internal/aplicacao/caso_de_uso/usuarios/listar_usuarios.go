package usuarios

import (
	"context"

	dominio "backend-go/internal/dominio/usuarios"
)

type ListarUsuariosCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoListarUsuariosCasoDeUso(repo dominio.Repositorio) *ListarUsuariosCasoDeUso {
	return &ListarUsuariosCasoDeUso{repo: repo}
}

func (c *ListarUsuariosCasoDeUso) Executar(ctx context.Context, limite, deslocamento int) ([]*dominio.Usuario, error) {
	return c.repo.Listar(ctx, limite, deslocamento)
}
