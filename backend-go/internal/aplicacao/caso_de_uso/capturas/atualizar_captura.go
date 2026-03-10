package capturas

import "errors"

// AtualizarCapturaCasoDeUso é reservado para evolução futura.
type AtualizarCapturaCasoDeUso struct{}

func NovoAtualizarCapturaCasoDeUso() *AtualizarCapturaCasoDeUso {
	return &AtualizarCapturaCasoDeUso{}
}

func (c *AtualizarCapturaCasoDeUso) Executar() error {
	return errors.New("atualização de captura não suportada")
}
