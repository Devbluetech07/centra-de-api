package cache

import "time"

// Interface define contrato de cache genérico.
type Interface interface {
	Definir(chave string, valor any, duracao time.Duration)
	Obter(chave string) (any, bool)
	RemoverPorPrefixo(prefixo string)
}
