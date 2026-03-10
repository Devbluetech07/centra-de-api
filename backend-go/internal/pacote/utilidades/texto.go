package utilidades

import "strings"

func TextoVazio(valor string) bool {
	return strings.TrimSpace(valor) == ""
}
