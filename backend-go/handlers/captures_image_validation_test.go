package handlers

import (
	"bytes"
	"encoding/base64"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"testing"
)

func makePNGBase64(w, h int) string {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 120, G: 10, B: 220, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = png.Encode(&buf, img)
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func makeJPEGBase64(w, h int) string {
	img := image.NewRGBA(image.Rect(0, 0, w, h))
	for y := 0; y < h; y++ {
		for x := 0; x < w; x++ {
			img.Set(x, y, color.RGBA{R: 20, G: 180, B: 90, A: 255})
		}
	}
	var buf bytes.Buffer
	_ = jpeg.Encode(&buf, img, &jpeg.Options{Quality: 80})
	return base64.StdEncoding.EncodeToString(buf.Bytes())
}

func TestValidateImage_RejectsSmallImage(t *testing.T) {
	b64 := makePNGBase64(100, 100)
	_, _, _, err := validateImage(b64)
	if err == nil {
		t.Fatal("expected validation error for small image")
	}
}

func TestValidateImage_AcceptsValidPNG(t *testing.T) {
	b64 := makePNGBase64(800, 600)
	_, ext, contentType, err := validateImage(b64)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "png" || contentType != "image/png" {
		t.Fatalf("unexpected type: ext=%s contentType=%s", ext, contentType)
	}
}

func TestValidateImage_AcceptsValidJPEG(t *testing.T) {
	b64 := makeJPEGBase64(1024, 768)
	_, ext, contentType, err := validateImage(b64)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if ext != "jpg" || contentType != "image/jpeg" {
		t.Fatalf("unexpected type: ext=%s contentType=%s", ext, contentType)
	}
}

func TestIsValidImageType_RejectsGIFHeader(t *testing.T) {
	gifHeader := []byte("GIF89a")
	_, _, ok := isValidImageType(gifHeader)
	if ok {
		t.Fatal("gif must be rejected")
	}
}
