package usuarios

import (
	"context"

	"backend-go/internal/pacote/hash"
)

// Servico concentra regras de negócio do domínio de usuários.
type Servico struct {
	repo   Repositorio
	hasher hash.Hasher
}

// NovoServico cria serviço de usuários.
func NovoServico(repo Repositorio, hasher hash.Hasher) *Servico {
	return &Servico{repo: repo, hasher: hasher}
}

// Registrar cria um novo usuário.
func (s *Servico) Registrar(ctx context.Context, email, senha, nomeCompleto string) (*Usuario, error) {
	if len(senha) < TamanhoMinimoSenha {
		return nil, ErrSenhaMuitoCurta
	}
	existe, err := s.repo.ExisteEmail(ctx, email)
	if err != nil {
		return nil, err
	}
	if existe {
		return nil, ErrEmailJaCadastrado
	}
	hashSenha, err := s.hasher.Hash(senha)
	if err != nil {
		return nil, err
	}
	usuario := NovoUsuario(email, nomeCompleto, hashSenha)
	if err := usuario.Validar(); err != nil {
		return nil, err
	}
	if err := s.repo.Criar(ctx, usuario); err != nil {
		return nil, err
	}
	return usuario, nil
}

// Autenticar valida credenciais.
func (s *Servico) Autenticar(ctx context.Context, email, senha string) (*Usuario, error) {
	usuario, err := s.repo.ObterPorEmail(ctx, email)
	if err != nil {
		return nil, ErrCredenciaisInvalidas
	}
	if !s.hasher.Comparar(usuario.HashSenha, senha) {
		return nil, ErrCredenciaisInvalidas
	}
	if !usuario.Ativo {
		return nil, ErrUsuarioInativo
	}
	return usuario, nil
}
