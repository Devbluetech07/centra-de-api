package chaves_api

import (
	"time"

	"github.com/google/uuid"
)

// ChaveAPI representa uma credencial de integração.
type ChaveAPI struct {
	ID            uuid.UUID
	Nome          string
	Prefixo       string
	ChaveHash     string
	TokenHashDono string
	Ativo         bool
	DataCriacao   time.Time
}

// NovaChaveAPI cria uma nova chave de API.
func NovaChaveAPI(nome, chaveHash, tokenHashDono string) *ChaveAPI {
	return &ChaveAPI{
		ID:            uuid.New(),
		Nome:          nome,
		Prefixo:       PrefixoChave,
		ChaveHash:     chaveHash,
		TokenHashDono: tokenHashDono,
		Ativo:         true,
		DataCriacao:   time.Now(),
	}
}

// Validar valida regras da entidade.
func (c *ChaveAPI) Validar() error {
	if c.Nome == "" {
		return ErrNomeObrigatorio
	}
	if c.TokenHashDono == "" {
		return ErrTokenHashObrigatorio
	}
	return nil
}
