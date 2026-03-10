package chaves_api

import "context"

// Servico concentra regras do domínio chaves_api.
type Servico struct {
	repo Repositorio
}

// NovoServico cria um novo serviço.
func NovoServico(repo Repositorio) *Servico {
	return &Servico{repo: repo}
}

// Criar valida e persiste uma nova chave.
func (s *Servico) Criar(ctx context.Context, chave *ChaveAPI) error {
	if err := chave.Validar(); err != nil {
		return err
	}
	return s.repo.Criar(ctx, chave)
}
