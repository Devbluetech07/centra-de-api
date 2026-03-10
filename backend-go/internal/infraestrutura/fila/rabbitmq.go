package fila

import "context"

// RabbitMQ é placeholder de integração.
type RabbitMQ struct{}

func (r *RabbitMQ) Publicar(ctx context.Context, topico string, payload []byte) error {
	_ = ctx
	_ = topico
	_ = payload
	return nil
}
