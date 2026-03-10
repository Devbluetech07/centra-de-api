package configuracao

// Configuracao representa as configurações necessárias da aplicação.
type Configuracao struct {
	Ambiente          string
	Porta             string
	HostBanco         string
	PortaBanco        string
	NomeBanco         string
	UsuarioBanco      string
	SenhaBanco        string
	SegredoJWT        string
	FrontendsPermit   string
	EndpointMinio     string
	UsuarioMinio      string
	SenhaMinio        string
	UsarSSLMinio      bool
	TokensIntegracao  string
	PermitirTokenDemo bool
	TokenDemo         string
}
