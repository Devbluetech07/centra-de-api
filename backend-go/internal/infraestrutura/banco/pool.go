package banco

import "github.com/jackc/pgx/v5/pgxpool"

var poolGlobal *pgxpool.Pool

// DefinirPool armazena pool compartilhado.
func DefinirPool(pool *pgxpool.Pool) {
	poolGlobal = pool
}

// ObterPool retorna pool compartilhado.
func ObterPool() *pgxpool.Pool {
	return poolGlobal
}
