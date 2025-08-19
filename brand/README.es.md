<p><a href="README.md">English</a> · <strong>Español</strong></p>

# Trueke · marca

**Estilo**: limpio con carácter + color vivo, alegre y joven. Fondo blanco, el producto como protagonista y tres colores saturados. El detalle propio es el **ticket**: la oferta se muestra como un ticket con talón troquelado y código de barras, y es también el símbolo del logo.

## Logo (`logo/`)
| Archivo | Uso |
|---|---|
| `trueke-logo.svg` | Principal, sobre fondos claros |
| `trueke-logo-inverso.svg` | Sobre tinta `#14141A` |
| `trueke-logo-mono.svg` | Una tinta (`currentColor`) |
| `trueke-simbolo.svg` / `-mono.svg` | Solo el ticket (avatar, app icon) |
| `trueke-wordmark.svg` | Solo la palabra |
| `favicon.svg` | Favicon |

Ticket de intercambio (dos flechas = trueque) con el talón en lima. La palabra es Gabarito ExtraBold convertida a trazos, así que no depende de la fuente. Espacio libre mínimo alrededor del logo: la mitad del alto del ticket.

## Color
| Token | Hex | Uso |
|---|---|---|
| `ink` | `#14141A` | Texto, fondos oscuros |
| `paper` | `#F6F6F3` | Fondo de secciones |
| `blue` | `#2B4BFF` | Primario: botones, enlaces, ticket |
| `lime` | `#C6F432` | Acento sobre tinta o azul; nunca texto lima sobre blanco (usar `lime-dark`) |
| `pink` | `#FF7AC6` | Acento alegre, etiquetas |
| `tomato` | `#FF5A36` | Errores, cancelado |

## Tipografía
- **Gabarito** 700–800: títulos y cifras grandes.
- **Instrument Sans** 400–600: interfaz y texto.
- **Geist Mono**: números de ticket, códigos, fechas.

Las tres se sirven desde la app con Fontsource (`@fontsource-variable/*`), no desde Google Fonts.

## Imágenes
Fotos de objetos reales, de estudio, sobre fondos planos de color de la marca, con luz suave y sombra corta. Archivos finales en `images/`.

Tokens de Tailwind: `tokens.css`.
