package middleware

import (
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/gin-gonic/gin"
)

func newTestContext(origin string, host string, ip string) *gin.Context {
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	req := httptest.NewRequest(http.MethodGet, "/api/captures/", nil)
	req.Host = host
	req.RemoteAddr = ip + ":12345"
	if origin != "" {
		req.Header.Set("Origin", origin)
	}
	c.Request = req
	return c
}

func TestAuthenticateToken_DemoBlockedInProduction(t *testing.T) {
	t.Setenv("NODE_ENV", "production")
	t.Setenv("ALLOW_PORTAL_DEMO_TOKEN", "true")
	t.Setenv("PORTAL_DEMO_TOKEN", "portal-demo")

	c := newTestContext("http://localhost:3000", "localhost:3000", "127.0.0.1")
	ok := authenticateToken("portal-demo", c)
	if ok {
		t.Fatal("demo token must be blocked in production")
	}
}

func TestAuthenticateToken_DemoAllowedInDevLocalhost(t *testing.T) {
	t.Setenv("NODE_ENV", "development")
	t.Setenv("ALLOW_PORTAL_DEMO_TOKEN", "true")
	t.Setenv("PORTAL_DEMO_TOKEN", "portal-demo")

	c := newTestContext("http://localhost:3000", "localhost:3000", "127.0.0.1")
	ok := authenticateToken("portal-demo", c)
	if !ok {
		t.Fatal("demo token should be allowed in development localhost")
	}
}

func TestAuthenticateToken_DemoBlockedFromPublicOrigin(t *testing.T) {
	t.Setenv("NODE_ENV", "development")
	t.Setenv("ALLOW_PORTAL_DEMO_TOKEN", "true")
	t.Setenv("PORTAL_DEMO_TOKEN", "portal-demo")

	c := newTestContext("https://evil.example", "api.example.com", "198.51.100.10")
	ok := authenticateToken("portal-demo", c)
	if ok {
		t.Fatal("demo token must be blocked from non-local origin")
	}
}

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}
