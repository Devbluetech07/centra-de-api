package validador

import "errors"

// ValidarCriarChaveAPI valida payload de criação de chave.
func ValidarCriarChaveAPI(nome string) error {
	if !CampoObrigatorio(nome) {
		return errors.New("nome da chave é obrigatório")
	}
	return nil
}
