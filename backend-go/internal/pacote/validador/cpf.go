package validador

func CPFValido(cpf string) bool {
	return len(cpf) == 11
}
