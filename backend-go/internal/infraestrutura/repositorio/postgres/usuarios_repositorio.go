package postgres

import (
	"context"
	"errors"

	"backend-go/internal/dominio/usuarios"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type UsuariosRepositorio struct {
	db        *pgxpool.Pool
	consultas *CarregadorConsultas
}

func NovoUsuariosRepositorio(db *pgxpool.Pool, consultas *CarregadorConsultas) *UsuariosRepositorio {
	return &UsuariosRepositorio{db: db, consultas: consultas}
}

func (r *UsuariosRepositorio) Criar(ctx context.Context, usuario *usuarios.Usuario) error {
	consulta := r.consultas.ObterArquivo("usuarios", "inserir.sql")
	_, err := r.db.Exec(ctx, consulta, usuario.ID, usuario.Email, usuario.NomeCompleto, usuario.HashSenha)
	return err
}

func (r *UsuariosRepositorio) ObterPorID(ctx context.Context, id uuid.UUID) (*usuarios.Usuario, error) {
	consulta := r.consultas.ObterArquivo("usuarios", "selecionar.sql")
	var u usuarios.Usuario
	err := r.db.QueryRow(ctx, consulta, id).Scan(&u.ID, &u.Email, &u.NomeCompleto, &u.HashSenha, &u.Ativo, &u.DataCriacao, &u.DataAtualizacao)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, usuarios.ErrUsuarioNaoEncontrado
		}
		return nil, err
	}
	return &u, nil
}

func (r *UsuariosRepositorio) ObterPorEmail(ctx context.Context, email string) (*usuarios.Usuario, error) {
	consulta := r.consultas.ObterArquivo("usuarios", "obter_por_email.sql")
	var u usuarios.Usuario
	err := r.db.QueryRow(ctx, consulta, email).Scan(&u.ID, &u.Email, &u.NomeCompleto, &u.HashSenha, &u.Ativo, &u.DataCriacao, &u.DataAtualizacao)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func (r *UsuariosRepositorio) ExisteEmail(ctx context.Context, email string) (bool, error) {
	consulta := r.consultas.ObterArquivo("usuarios", "existe_email.sql")
	var existe bool
	err := r.db.QueryRow(ctx, consulta, email).Scan(&existe)
	return existe, err
}

func (r *UsuariosRepositorio) Atualizar(ctx context.Context, usuario *usuarios.Usuario) error {
	consulta := r.consultas.ObterArquivo("usuarios", "atualizar.sql")
	_, err := r.db.Exec(ctx, consulta, usuario.NomeCompleto, usuario.Ativo, usuario.DataAtualizacao, usuario.ID)
	return err
}

func (r *UsuariosRepositorio) Deletar(ctx context.Context, id uuid.UUID) error {
	consulta := r.consultas.ObterArquivo("usuarios", "deletar.sql")
	_, err := r.db.Exec(ctx, consulta, id)
	return err
}

func (r *UsuariosRepositorio) Listar(ctx context.Context, limite, deslocamento int) ([]*usuarios.Usuario, error) {
	consulta := r.consultas.ObterArquivo("usuarios", "listar.sql")
	rows, err := r.db.Query(ctx, consulta, limite, deslocamento)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var itens []*usuarios.Usuario
	for rows.Next() {
		var u usuarios.Usuario
		if err := rows.Scan(&u.ID, &u.Email, &u.NomeCompleto, &u.HashSenha, &u.Ativo, &u.DataCriacao, &u.DataAtualizacao); err == nil {
			itens = append(itens, &u)
		}
	}
	return itens, nil
}
