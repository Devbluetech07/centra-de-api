package postgres

import (
	"context"

	"backend-go/internal/dominio/chaves_api"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type ChavesAPIRepositorio struct {
	db        *pgxpool.Pool
	consultas *CarregadorConsultas
}

func NovoChavesAPIRepositorio(db *pgxpool.Pool, consultas *CarregadorConsultas) *ChavesAPIRepositorio {
	return &ChavesAPIRepositorio{db: db, consultas: consultas}
}

func (r *ChavesAPIRepositorio) Criar(ctx context.Context, chave *chaves_api.ChaveAPI) error {
	consulta := r.consultas.ObterArquivo("chaves_api", "inserir.sql")
	_, err := r.db.Exec(ctx, consulta, chave.ID, chave.Nome, chave.Prefixo, chave.ChaveHash, chave.TokenHashDono)
	return err
}

func (r *ChavesAPIRepositorio) ListarPorTokenHash(ctx context.Context, tokenHash string) ([]*chaves_api.ChaveAPI, error) {
	consulta := r.consultas.ObterArquivo("chaves_api", "especiais.sql")
	rows, err := r.db.Query(ctx, consulta, tokenHash)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var itens []*chaves_api.ChaveAPI
	for rows.Next() {
		var c chaves_api.ChaveAPI
		if err := rows.Scan(&c.ID, &c.Nome, &c.Prefixo, &c.ChaveHash, &c.TokenHashDono, &c.Ativo, &c.DataCriacao); err == nil {
			itens = append(itens, &c)
		}
	}
	return itens, nil
}

func (r *ChavesAPIRepositorio) ObterPorID(ctx context.Context, id uuid.UUID, tokenHash string) (*chaves_api.ChaveAPI, error) {
	consulta := r.consultas.ObterArquivo("chaves_api", "selecionar.sql")
	var c chaves_api.ChaveAPI
	err := r.db.QueryRow(ctx, consulta, id, tokenHash).Scan(&c.ID, &c.Nome, &c.Prefixo, &c.ChaveHash, &c.TokenHashDono, &c.Ativo, &c.DataCriacao)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (r *ChavesAPIRepositorio) Atualizar(ctx context.Context, chave *chaves_api.ChaveAPI) error {
	consulta := r.consultas.ObterArquivo("chaves_api", "atualizar.sql")
	_, err := r.db.Exec(ctx, consulta, chave.Nome, chave.Ativo, chave.ID, chave.TokenHashDono)
	return err
}

func (r *ChavesAPIRepositorio) Deletar(ctx context.Context, id uuid.UUID, tokenHash string) error {
	consulta := r.consultas.ObterArquivo("chaves_api", "deletar.sql")
	_, err := r.db.Exec(ctx, consulta, id, tokenHash)
	return err
}
