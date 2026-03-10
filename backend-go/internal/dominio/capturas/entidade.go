package capturas

import (
	"time"

	"github.com/google/uuid"
)

// Captura representa a captura de uma evidência de KYC.
type Captura struct {
	ID            uuid.UUID
	TipoServico   string
	Status        string
	CaminhoImagem string
	MetadadosJSON string
	TokenHashDono string
	DataCriacao   time.Time
}

// NovaCaptura cria uma nova captura com status inicial.
func NovaCaptura(tipoServico, caminhoImagem, metadadosJSON, tokenHashDono string) *Captura {
	return &Captura{
		ID:            uuid.New(),
		TipoServico:   tipoServico,
		Status:        "valid",
		CaminhoImagem: caminhoImagem,
		MetadadosJSON: metadadosJSON,
		TokenHashDono: tokenHashDono,
		DataCriacao:   time.Now(),
	}
}

// Validar aplica regras da entidade captura.
func (c *Captura) Validar() error {
	switch c.TipoServico {
	case TipoAssinatura, TipoDocumento, TipoSelfie, TipoSelfieDocumento:
	default:
		return ErrTipoServicoInvalido
	}
	if c.CaminhoImagem == "" {
		return ErrImagemObrigatoria
	}
	return nil
}
