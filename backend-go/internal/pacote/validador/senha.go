package validador

func SenhaValida(senha string) bool {
	return len(senha) >= 8
}
