package validador

import "errors"

// ValidarCriarUsuario valida payload de criação de usuário.
func ValidarCriarUsuario(email, nomeCompleto, senha string) error {
	if !CampoObrigatorio(email) || !CampoObrigatorio(nomeCompleto) || !CampoObrigatorio(senha) {
		return errors.New("email, nome completo e senha são obrigatórios")
	}
	if len(senha) < 8 {
		return errors.New("senha deve ter no mínimo 8 caracteres")
	}
	return nil
}
