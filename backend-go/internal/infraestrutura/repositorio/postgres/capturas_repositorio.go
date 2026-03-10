package postgres

import (
	"context"
	"encoding/json"

	"backend-go/internal/dominio/capturas"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type CapturasRepositorio struct {
	db        *pgxpool.Pool
	consultas *CarregadorConsultas
}

func NovoCapturasRepositorio(db *pgxpool.Pool, consultas *CarregadorConsultas) *CapturasRepositorio {
	return &CapturasRepositorio{db: db, consultas: consultas}
}

func (r *CapturasRepositorio) Criar(ctx context.Context, captura *capturas.Captura) error {
	consulta := r.consultas.ObterArquivo("capturas", "inserir.sql")
	_, err := r.db.Exec(ctx, consulta, captura.ID, captura.TokenHashDono, captura.TipoServico, captura.Status, captura.CaminhoImagem, captura.MetadadosJSON)
	return err
}

func (r *CapturasRepositorio) ObterPorID(ctx context.Context, id uuid.UUID, tokenHash string) (*capturas.Captura, error) {
	consulta := r.consultas.ObterArquivo("capturas", "selecionar.sql")
	var cap capturas.Captura
	var metadados map[string]any
	err := r.db.QueryRow(ctx, consulta, id, tokenHash).Scan(&cap.ID, &cap.TipoServico, &cap.Status, &cap.CaminhoImagem, &metadados, &cap.DataCriacao)
	if err != nil {
		return nil, err
	}
	b, _ := json.Marshal(metadados)
	cap.MetadadosJSON = string(b)
	cap.TokenHashDono = tokenHash
	return &cap, nil
}

func (r *CapturasRepositorio) Listar(ctx context.Context, tokenHash, tipoServico string, limite, deslocamento int) ([]*capturas.Captura, error) {
	consulta := r.consultas.ObterArquivo("capturas", "especiais.sql")
	rows, err := r.db.Query(ctx, consulta, tokenHash, tipoServico, limite, deslocamento)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var itens []*capturas.Captura
	for rows.Next() {
		var cap capturas.Captura
		var metadados map[string]any
		if err := rows.Scan(&cap.ID, &cap.TipoServico, &cap.Status, &cap.CaminhoImagem, &metadados, &cap.DataCriacao); err == nil {
			b, _ := json.Marshal(metadados)
			cap.MetadadosJSON = string(b)
			cap.TokenHashDono = tokenHash
			itens = append(itens, &cap)
		}
	}
	return itens, nil
}
