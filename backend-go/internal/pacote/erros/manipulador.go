package erros

import "errors"

// Normalizar converte erro genérico para erro de aplicação.
func Normalizar(err error) ErroAplicacao {
	if err == nil {
		return ErroAplicacao{}
	}
	var appErr ErroAplicacao
	if errors.As(err, &appErr) {
		return appErr
	}
	return ErroAplicacao{Codigo: CodigoInterno, Mensagem: err.Error()}
}
