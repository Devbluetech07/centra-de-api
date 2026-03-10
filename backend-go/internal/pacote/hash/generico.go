package hash

// Hasher define operações de hash para senha.
type Hasher interface {
	Hash(texto string) (string, error)
	Comparar(hashGerado, texto string) bool
}
