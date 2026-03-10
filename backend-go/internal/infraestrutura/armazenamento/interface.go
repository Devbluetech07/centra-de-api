package armazenamento

import "context"

// Interface define operações de upload em storage.
type Interface interface {
	Enviar(ctx context.Context, bucket, caminho string, conteudo []byte, contentType string, metadados map[string]string) error
}
