package postgres

import (
	"os"
	"path/filepath"
	"strings"
)

// CarregadorConsultas lê consultas SQL externas por domínio.
type CarregadorConsultas struct {
	basePath string
}

func NovoCarregadorConsultas(basePath string) *CarregadorConsultas {
	return &CarregadorConsultas{basePath: basePath}
}

// ObterArquivo retorna conteúdo SQL de um arquivo.
func (c *CarregadorConsultas) ObterArquivo(dominio, arquivo string) string {
	caminho := filepath.Join(c.basePath, dominio, arquivo)
	bytesSQL, err := os.ReadFile(caminho)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(bytesSQL))
}
