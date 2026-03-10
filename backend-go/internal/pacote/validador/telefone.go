package validador

func TelefoneValido(telefone string) bool {
	return len(telefone) >= 10
}
