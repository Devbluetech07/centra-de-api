package utilidades

import (
	"crypto/rand"
	"encoding/hex"
)

func AleatorioHex(tamanho int) string {
	bytes := make([]byte, tamanho)
	_, _ = rand.Read(bytes)
	return hex.EncodeToString(bytes)
}
