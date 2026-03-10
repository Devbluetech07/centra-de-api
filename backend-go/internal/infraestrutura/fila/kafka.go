package fila

import "context"

// Kafka é placeholder de integração.
type Kafka struct{}

func (k *Kafka) Publicar(ctx context.Context, topico string, payload []byte) error {
	_ = ctx
	_ = topico
	_ = payload
	return nil
}
