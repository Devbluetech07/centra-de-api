package chaves_api

import (
	"context"

	"github.com/google/uuid"
)

// Repositorio define persistência de chaves de API.
type Repositorio interface {
	Criar(ctx context.Context, chave *ChaveAPI) error
	ListarPorTokenHash(ctx context.Context, tokenHash string) ([]*ChaveAPI, error)
	ObterPorID(ctx context.Context, id uuid.UUID, tokenHash string) (*ChaveAPI, error)
	Atualizar(ctx context.Context, chave *ChaveAPI) error
	Deletar(ctx context.Context, id uuid.UUID, tokenHash string) error
}
