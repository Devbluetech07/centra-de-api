package capturas

import "context"

// Servico concentra regras do domínio de capturas.
type Servico struct {
	repo Repositorio
}

// NovoServico cria serviço de capturas.
func NovoServico(repo Repositorio) *Servico {
	return &Servico{repo: repo}
}

// Criar valida e persiste captura.
func (s *Servico) Criar(ctx context.Context, captura *Captura) error {
	if err := captura.Validar(); err != nil {
		return err
	}
	return s.repo.Criar(ctx, captura)
}
