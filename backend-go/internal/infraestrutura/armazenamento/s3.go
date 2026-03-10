package armazenamento

import (
	"bytes"
	"context"

	"github.com/minio/minio-go/v7"
)

// S3 encapsula cliente compatível com S3/MinIO.
type S3 struct {
	cliente *minio.Client
}

func NovoS3(cliente *minio.Client) *S3 {
	return &S3{cliente: cliente}
}

func (s *S3) Enviar(ctx context.Context, bucket, caminho string, conteudo []byte, contentType string, metadados map[string]string) error {
	_, err := s.cliente.PutObject(ctx, bucket, caminho, bytes.NewReader(conteudo), int64(len(conteudo)), minio.PutObjectOptions{
		ContentType:  contentType,
		UserMetadata: metadados,
	})
	return err
}
