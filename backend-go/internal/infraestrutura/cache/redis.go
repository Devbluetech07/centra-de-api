package cache

import "time"

// Redis é placeholder para implementação futura.
type Redis struct{}

func NovoRedis() *Redis {
	return &Redis{}
}

func (r *Redis) Definir(chave string, valor any, duracao time.Duration) {}
func (r *Redis) Obter(chave string) (any, bool)                          { return nil, false }
func (r *Redis) RemoverPorPrefixo(prefixo string)                        {}
