package usuarios

import (
	"time"

	"github.com/google/uuid"
)

// Usuario representa um usuário do sistema.
type Usuario struct {
	ID             uuid.UUID
	Email          string
	NomeCompleto   string
	HashSenha      string
	Ativo          bool
	DataCriacao    time.Time
	DataAtualizacao time.Time
}

// NovoUsuario cria uma nova instância de Usuario.
func NovoUsuario(email, nomeCompleto, hashSenha string) *Usuario {
	return &Usuario{
		ID:              uuid.New(),
		Email:           email,
		NomeCompleto:    nomeCompleto,
		HashSenha:       hashSenha,
		Ativo:           true,
		DataCriacao:     time.Now(),
		DataAtualizacao: time.Now(),
	}
}

// Validar valida regras de negócio do usuário.
func (u *Usuario) Validar() error {
	if u.Email == "" {
		return ErrEmailObrigatorio
	}
	if len(u.NomeCompleto) < TamanhoMinimoNome {
		return ErrNomeCompletoMuitoCurto
	}
	return nil
}
