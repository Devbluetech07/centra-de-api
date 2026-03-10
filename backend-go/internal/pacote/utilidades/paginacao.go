package utilidades

// LimiteEDeslocamento normaliza paginação.
func LimiteEDeslocamento(limite, deslocamento int) (int, int) {
	if limite <= 0 || limite > 100 {
		limite = 20
	}
	if deslocamento < 0 {
		deslocamento = 0
	}
	return limite, deslocamento
}
