package usuarios

import (
	"context"

	dominio "backend-go/internal/dominio/usuarios"
)

type CriarUsuarioCasoDeUso struct {
	servico *dominio.Servico
}

func NovoCriarUsuarioCasoDeUso(servico *dominio.Servico) *CriarUsuarioCasoDeUso {
	return &CriarUsuarioCasoDeUso{servico: servico}
}

func (c *CriarUsuarioCasoDeUso) Executar(ctx context.Context, email, senha, nomeCompleto string) (*dominio.Usuario, error) {
	return c.servico.Registrar(ctx, email, senha, nomeCompleto)
}
