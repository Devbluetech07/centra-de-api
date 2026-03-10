package validador

func CEPValido(cep string) bool {
	return len(cep) == 8
}
