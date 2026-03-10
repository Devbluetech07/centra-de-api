package erros

// ErroAplicacao padroniza erro de negócio.
type ErroAplicacao struct {
	Codigo   string `json:"codigo"`
	Mensagem string `json:"mensagem"`
}

func (e ErroAplicacao) Error() string { return e.Mensagem }
