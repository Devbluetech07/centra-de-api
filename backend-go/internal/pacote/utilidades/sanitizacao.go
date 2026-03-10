package utilidades

import "strings"

func SanitizarTexto(valor string) string {
	return strings.TrimSpace(valor)
}
