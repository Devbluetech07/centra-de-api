package validador

func CNPJValido(cnpj string) bool {
	return len(cnpj) == 14
}
