package usuarios

import (
	"context"
	"time"

	dominio "backend-go/internal/dominio/usuarios"
)

type AtualizarUsuarioCasoDeUso struct {
	repo dominio.Repositorio
}

func NovoAtualizarUsuarioCasoDeUso(repo dominio.Repositorio) *AtualizarUsuarioCasoDeUso {
	return &AtualizarUsuarioCasoDeUso{repo: repo}
}

func (c *AtualizarUsuarioCasoDeUso) Executar(ctx context.Context, usuario *dominio.Usuario) error {
	usuario.DataAtualizacao = time.Now()
	return c.repo.Atualizar(ctx, usuario)
}
