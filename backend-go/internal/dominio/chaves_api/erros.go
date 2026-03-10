package chaves_api

import "errors"

var (
	ErrNomeObrigatorio       = errors.New("nome da chave é obrigatório")
	ErrChaveNaoEncontrada    = errors.New("chave de api não encontrada")
	ErrFormatoChaveInvalido  = errors.New("formato da chave de api inválido")
	ErrTokenHashObrigatorio  = errors.New("token hash é obrigatório")
)
