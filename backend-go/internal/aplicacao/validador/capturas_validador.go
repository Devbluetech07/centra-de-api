package validador

import "errors"

// ValidarCriarCaptura valida payload de captura.
func ValidarCriarCaptura(tipoServico, imagemBase64 string) error {
	if !CampoObrigatorio(tipoServico) || !CampoObrigatorio(imagemBase64) {
		return errors.New("tipo de serviço e imagem são obrigatórios")
	}
	return nil
}
