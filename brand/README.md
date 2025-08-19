<p><strong>English</strong> · <a href="README.es.md">Español</a></p>

# Trueke · brand

**Style**: clean with character and bright color, cheerful and young. A white background, the product in the spotlight and three saturated colors. The special detail is the **ticket**: the offer looks like a ticket with a perforated stub and a barcode, and the ticket is also the logo symbol.

## Logo (`logo/`)
| File | Use |
|---|---|
| `trueke-logo.svg` | Main logo, on light backgrounds |
| `trueke-logo-inverso.svg` | On ink `#14141A` |
| `trueke-logo-mono.svg` | One color (`currentColor`) |
| `trueke-simbolo.svg` / `-mono.svg` | Only the ticket (avatar, app icon) |
| `trueke-wordmark.svg` | Only the word |
| `favicon.svg` | Favicon |

An exchange ticket (two arrows = trade) with a lime stub. The word is Gabarito ExtraBold turned into outlines, so it doesn't depend on the font. Minimum free space around the logo: half the height of the ticket.

## Color
| Token | Hex | Use |
|---|---|---|
| `ink` | `#14141A` | Text, dark backgrounds |
| `paper` | `#F6F6F3` | Section backgrounds |
| `blue` | `#2B4BFF` | Primary: buttons, links, ticket |
| `lime` | `#C6F432` | Accent on ink or blue; never lime text on white (use `lime-dark`) |
| `pink` | `#FF7AC6` | Cheerful accent, tags |
| `tomato` | `#FF5A36` | Errors, cancelled |

## Fonts
- **Gabarito** 700–800: headings and big numbers.
- **Instrument Sans** 400–600: interface and text.
- **Geist Mono**: ticket numbers, codes, dates.

The app serves all three with Fontsource (`@fontsource-variable/*`), not from Google Fonts.

## Images
Photos of real objects, studio style, on flat backgrounds in brand colors, with soft light and a short shadow. Final files are in `images/`.

Tailwind tokens: `tokens.css`.
