package hash

import "golang.org/x/crypto/bcrypt"

type BcryptHasher struct{}

// NovoBcryptHasher cria um hasher baseado em bcrypt.
func NovoBcryptHasher() BcryptHasher {
	return BcryptHasher{}
}

// Hash gera hash da senha.
func (BcryptHasher) Hash(texto string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(texto), bcrypt.DefaultCost)
	return string(b), err
}

// Comparar valida senha em texto com hash salvo.
func (BcryptHasher) Comparar(hashGerado, texto string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hashGerado), []byte(texto)) == nil
}
