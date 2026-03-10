package banco

import (
	"context"
	"fmt"
	"time"

	"backend-go/internal/configuracao"
	"github.com/jackc/pgx/v5/pgxpool"
)

// NovaConexao cria conexão com PostgreSQL.
func NovaConexao(cfg configuracao.Configuracao) (*pgxpool.Pool, error) {
	dsn := fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=disable",
		cfg.UsuarioBanco, cfg.SenhaBanco, cfg.HostBanco, cfg.PortaBanco, cfg.NomeBanco)

	confPool, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, err
	}
	confPool.ConnConfig.ConnectTimeout = 5 * time.Second
	confPool.MaxConns = 20
	confPool.MinConns = 5

	pool, err := pgxpool.NewWithConfig(context.Background(), confPool)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(context.Background()); err != nil {
		pool.Close()
		return nil, err
	}
	return pool, nil
}
