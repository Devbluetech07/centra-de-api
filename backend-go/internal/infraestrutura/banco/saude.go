package banco

import "context"

// EstaSaudavel valida comunicação com banco.
func EstaSaudavel(ctx context.Context) bool {
	pool := ObterPool()
	if pool == nil {
		return false
	}
	return pool.Ping(ctx) == nil
}
