package fila

import "context"

// Interface define publicação de eventos assíncronos.
type Interface interface {
	Publicar(ctx context.Context, topico string, payload []byte) error
}
