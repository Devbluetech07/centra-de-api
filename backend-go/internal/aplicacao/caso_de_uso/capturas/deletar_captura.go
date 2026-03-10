package capturas

import "errors"

// DeletarCapturaCasoDeUso é reservado para evolução futura.
type DeletarCapturaCasoDeUso struct{}

func NovoDeletarCapturaCasoDeUso() *DeletarCapturaCasoDeUso {
	return &DeletarCapturaCasoDeUso{}
}

func (c *DeletarCapturaCasoDeUso) Executar() error {
	return errors.New("deleção de captura não suportada")
}
