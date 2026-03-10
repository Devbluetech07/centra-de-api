package capturas

import (
	"context"

	"github.com/google/uuid"
)

// Repositorio define persistência para capturas.
type Repositorio interface {
	Criar(ctx context.Context, captura *Captura) error
	ObterPorID(ctx context.Context, id uuid.UUID, tokenHash string) (*Captura, error)
	Listar(ctx context.Context, tokenHash, tipoServico string, limite, deslocamento int) ([]*Captura, error)
}
