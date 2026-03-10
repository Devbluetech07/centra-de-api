package armazenamento

import (
	"context"
	"os"
	"path/filepath"
)

// Local salva arquivos no disco local.
type Local struct {
	basePath string
}

func NovoLocal(basePath string) *Local {
	return &Local{basePath: basePath}
}

func (l *Local) Enviar(ctx context.Context, bucket, caminho string, conteudo []byte, contentType string, metadados map[string]string) error {
	_ = ctx
	destino := filepath.Join(l.basePath, bucket, caminho)
	if err := os.MkdirAll(filepath.Dir(destino), 0o755); err != nil {
		return err
	}
	return os.WriteFile(destino, conteudo, 0o644)
}
