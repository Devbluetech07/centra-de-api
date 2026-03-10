package cache

import (
	"strings"
	"sync"
	"time"
)

// Memoria implementa cache em memória local.
type Memoria struct {
	mu   sync.RWMutex
	data map[string]any
}

func NovaMemoria() *Memoria {
	return &Memoria{data: map[string]any{}}
}

func (m *Memoria) Definir(chave string, valor any, duracao time.Duration) {
	m.mu.Lock()
	m.data[chave] = valor
	m.mu.Unlock()
	if duracao > 0 {
		go func() {
			time.Sleep(duracao)
			m.mu.Lock()
			delete(m.data, chave)
			m.mu.Unlock()
		}()
	}
}

func (m *Memoria) Obter(chave string) (any, bool) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	valor, ok := m.data[chave]
	return valor, ok
}

func (m *Memoria) RemoverPorPrefixo(prefixo string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for k := range m.data {
		if strings.HasPrefix(k, prefixo) {
			delete(m.data, k)
		}
	}
}
