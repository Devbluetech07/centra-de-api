package capturas

import "errors"

var (
	ErrTipoServicoInvalido = errors.New("tipo de serviço inválido")
	ErrImagemObrigatoria   = errors.New("imagem é obrigatória")
	ErrCapturaNaoEncontrada = errors.New("captura não encontrada")
)
