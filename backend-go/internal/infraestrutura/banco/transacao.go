package banco

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// ExecutarEmTransacao executa função dentro de transação.
func ExecutarEmTransacao(ctx context.Context, fn func(tx pgx.Tx) error) error {
	pool := ObterPool()
	tx, err := pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := fn(tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
