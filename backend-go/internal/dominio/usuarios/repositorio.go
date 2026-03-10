package usuarios

import (
	"context"

	"github.com/google/uuid"
)

// Repositorio define operações de persistência para Usuario.
type Repositorio interface {
	Criar(ctx context.Context, usuario *Usuario) error
	ObterPorID(ctx context.Context, id uuid.UUID) (*Usuario, error)
	ObterPorEmail(ctx context.Context, email string) (*Usuario, error)
	ExisteEmail(ctx context.Context, email string) (bool, error)
	Atualizar(ctx context.Context, usuario *Usuario) error
	Deletar(ctx context.Context, id uuid.UUID) error
	Listar(ctx context.Context, limite, deslocamento int) ([]*Usuario, error)
}
