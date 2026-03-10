package usuarios

import "errors"

var (
	ErrEmailObrigatorio       = errors.New("email é obrigatório")
	ErrEmailJaCadastrado      = errors.New("email já cadastrado")
	ErrCredenciaisInvalidas   = errors.New("credenciais inválidas")
	ErrUsuarioNaoEncontrado   = errors.New("usuário não encontrado")
	ErrSenhaMuitoCurta        = errors.New("senha deve ter no mínimo 8 caracteres")
	ErrNomeCompletoMuitoCurto = errors.New("nome completo deve ter no mínimo 3 caracteres")
	ErrUsuarioInativo         = errors.New("usuário inativo")
)
