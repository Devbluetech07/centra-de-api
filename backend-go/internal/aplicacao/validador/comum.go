package validador

import "strings"

// CampoObrigatorio verifica se campo textual foi preenchido.
func CampoObrigatorio(valor string) bool {
	return strings.TrimSpace(valor) != ""
}
